// AI Usage Island
// 노치 자리에 붙는 검정 아일랜드(접힌 상태), 누르면 아래로 열리는 검정 패널(계정별 상세),
// 바탕화면에 위젯처럼 깔리는 검정 카드(보기 전용) 세 창으로 이루어진다.
const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  session,
  globalShortcut,
  powerMonitor,
  systemPreferences,
} = require('electron');
const path = require('path');
const crypto = require('crypto');
const { createStore } = require('./store.cjs');
const fs = require('fs');
const { providers, ORDER, statusOf } = require('./providers/index.cjs');
const browserImport = require('./browserImport.cjs');

const DEV_URL = process.env.ISLAND_DEV_URL || ''; // 개발 중에는 vite 주소
const REFRESH_MS = 3 * 60 * 1000;
const MIN_MANUAL_GAP_MS = 30 * 1000;
const NOTCH_WIDTH = Number(process.env.ISLAND_NOTCH_WIDTH) || 200; // 맥북 노치 폭 추정값
const WING = 52; // tokens.js size.wing: 노치 양옆으로 조금만 (로고 하나, 퍼센트 하나)
const PILL_W = 112; // 노치 없는 화면: 로고 + 퍼센트만 담는 짧은 폭
const HOVER_OPEN_MS = 120; // 올리고 이만큼 머물면 연다
const HOVER_CLOSE_MS = 350; // 벗어나고 이만큼 지나면 닫는다
const QUIT_SHORTCUT = 'Control+Option+Q';
const PILL_H = 34;
const TOP_H = 32; // 노치 없는 화면에서 위에 붙는 아일랜드 높이 (메뉴 막대보다 낮으면 이 값)
const PANEL_W = 440; // tokens.js size.panelWidth (한 줄일 때)
const GAP = 8;
const TOGGLE_SHORTCUT = 'Control+Option+C';

let islandWin = null;
let panelWin = null;
let widgetWin = null;
let widgetHeight = 360;
let widgetWidth = PANEL_W;
let widgetMoving = false;
let settings = {};
let panelHeight = 360;
let panelWidth = PANEL_W;
let panelShownAt = 0;
let store = null;
let accounts = [];
const live = {};
let geometry = { mode: 'pill', notchWidth: 0, height: PILL_H, wing: WING };
let refreshing = false;
let lastRefresh = 0;
let loginOpen = 0;

if (!app.requestSingleInstanceLock()) app.quit();

// ----- 공통 -----

function chromeUA() {
  return app.userAgentFallback
    .replace(/\s?Electron\/\S+/, '')
    .replace(/\s?ai-usage-island\/\S+/i, '')
    .replace(/\s?AI Usage Island\/\S+/i, '');
}

function sessionFor(partition) {
  const ses = session.fromPartition(partition);
  ses.setUserAgent(chromeUA());
  return ses;
}

function ctxFor(acct) {
  return { ses: sessionFor(acct.partition), partition: acct.partition, BrowserWindow };
}

function providerOf(acct) {
  return providers[acct.provider] || providers.claude;
}

function labelFrom(email, providerId) {
  const local = (email || '').split('@')[0];
  if (!local) return `${providers[providerId].name} 계정`;
  const same = accounts.filter((a) => a.provider === providerId && (a.email || '').split('@')[0] === local);
  return same.length > 1 ? email : local;
}

function sortedAccounts() {
  return [...accounts].sort((a, b) => ORDER.indexOf(a.provider) - ORDER.indexOf(b.provider));
}

function wingWidth() {
  return WING;
}

function pillWidth() {
  return PILL_W;
}

function reducedMotion() {
  try {
    return systemPreferences.getAnimationSettings().prefersReducedMotion;
  } catch {
    return false;
  }
}

function publicState() {
  return {
    accounts: sortedAccounts().map((a) => ({
      id: a.id,
      provider: providerOf(a).id,
      providerName: providerOf(a).name,
      noAccessHint: providerOf(a).noAccessHint,
      label: a.label,
      email: a.email,
      plan: a.plan || '',
      ...(live[a.id] || { status: 'loading', usage: null, updatedAt: null }),
    })),
    geometry,
    widget: { enabled: settings.widgetEnabled !== false, moving: widgetMoving },
    refreshing,
    lastRefresh: lastRefresh || null,
    shortcut: TOGGLE_SHORTCUT,
  };
}

function send(win, channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function broadcast() {
  const s = publicState();
  send(islandWin, 'state', s);
  send(panelWin, 'state', s);
  send(widgetWin, 'state', s);
}

function loadPage(win, page, query = {}) {
  const qs = new URLSearchParams(query).toString();
  if (DEV_URL) win.loadURL(`${DEV_URL}/${page}.html${qs ? `?${qs}` : ''}`);
  else win.loadFile(path.join(__dirname, '..', 'dist', `${page}.html`), { query });
}

const commonWeb = {
  preload: path.join(__dirname, 'preload.cjs'),
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
};

function lockDown(win) {
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ----- 아일랜드 (접힌 상태) -----

function placeIsland() {
  if (!islandWin || islandWin.isDestroyed()) return;
  const d = screen.getPrimaryDisplay();
  const menuBar = d.workArea.y - d.bounds.y;
  const hasNotch = Boolean(d.internal) && menuBar >= 30;
  let attached = false;

  if (hasNotch) {
    const wing = wingWidth();
    const w = NOTCH_WIDTH + wing * 2;
    const x = Math.round(d.bounds.x + (d.bounds.width - w) / 2);
    islandWin.setBounds({ x, y: d.bounds.y, width: w, height: menuBar });
    attached = islandWin.getBounds().y <= d.bounds.y + 1;
    if (attached) geometry = { mode: 'notch', notchWidth: NOTCH_WIDTH, height: menuBar, wing };
  }
  if (!hasNotch) {
    // 노치가 없는 화면(외부 모니터 등): 노치 맥북처럼 화면 위 가운데에 붙인다.
    const h = Math.max(menuBar, TOP_H);
    const pw = pillWidth();
    const x = Math.round(d.bounds.x + (d.bounds.width - pw) / 2);
    islandWin.setBounds({ x, y: d.bounds.y, width: pw, height: h });
    attached = islandWin.getBounds().y <= d.bounds.y + 1;
    if (attached) geometry = { mode: 'top', notchWidth: 0, height: h, wing: wingWidth() };
  }
  if (!attached) {
    // 맥이 창을 메뉴 막대 위로 못 올리게 하면 메뉴 막대 바로 아래 알약으로 띄운다.
    const pw = pillWidth();
    const x = Math.round(d.bounds.x + (d.bounds.width - pw) / 2);
    islandWin.setBounds({ x, y: d.workArea.y + GAP, width: pw, height: PILL_H });
    geometry = { mode: 'pill', notchWidth: 0, height: PILL_H, wing: wingWidth() };
  }
  placePanel();
  broadcast();
}

function createIsland() {
  islandWin = new BrowserWindow({
    width: PILL_W,
    height: PILL_H,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    enableLargerThanScreen: true,
    type: 'panel',
    alwaysOnTop: true,
    focusable: false,
    acceptFirstMouse: true,
    title: 'AI Usage Island',
    webPreferences: commonWeb,
  });
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  islandWin.setAlwaysOnTop(true, 'screen-saver', 1);
  lockDown(islandWin);
  loadPage(islandWin, 'island');
  islandWin.once('ready-to-show', () => {
    placeIsland();
    islandWin.showInactive();
  });
}

// ----- 패널 -----

function placePanel() {
  if (!panelWin || panelWin.isDestroyed() || !islandWin) return;
  const ib = islandWin.getBounds();
  const d = screen.getDisplayMatching(ib);
  const top = Math.max(ib.y + ib.height, d.workArea.y) + GAP;
  const x = Math.round(ib.x + ib.width / 2 - panelWidth / 2);
  const maxH = d.workArea.y + d.workArea.height - top - GAP;
  panelWin.setBounds({ x, y: top, width: panelWidth, height: Math.min(panelHeight, maxH) });
}

function createPanel() {
  panelWin = new BrowserWindow({
    width: PANEL_W,
    height: panelHeight,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    type: 'panel',
    alwaysOnTop: true,
    acceptFirstMouse: true,
    title: 'AI Usage Island',
    webPreferences: commonWeb,
  });
  panelWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  panelWin.setAlwaysOnTop(true, 'pop-up-menu');
  lockDown(panelWin);
  loadPage(panelWin, 'panel');

  // 다른 곳을 누르면 닫힌다 (메뉴 막대 메뉴와 같은 동작)
  panelWin.on('blur', () => {
    if (Date.now() - panelShownAt < 250) return;
    hidePanel();
  });
}

function fadeWindow(win, from, to, ms, done) {
  if (reducedMotion() || ms <= 0) {
    win.setOpacity(to);
    if (done) done();
    return;
  }
  const steps = 8;
  let i = 0;
  win.setOpacity(from);
  const t = setInterval(() => {
    i += 1;
    if (win.isDestroyed()) return clearInterval(t);
    win.setOpacity(from + ((to - from) * i) / steps);
    if (i >= steps) {
      clearInterval(t);
      if (done) done();
    }
  }, Math.round(ms / steps));
}

function showPanel(focus = true) {
  if (!panelWin || panelWin.isDestroyed()) return;
  if (panelWin.isVisible()) {
    if (focus) panelWin.focus();
    return;
  }
  placePanel();
  panelShownAt = Date.now();
  panelWin.setOpacity(0);
  if (focus) {
    panelWin.show();
    panelWin.focus();
  } else {
    panelWin.showInactive();
  }
  send(panelWin, 'panel:shown');
  send(islandWin, 'panel:open', true);
  fadeWindow(panelWin, 0, 1, 160);
  if (Date.now() - lastRefresh > MIN_MANUAL_GAP_MS) refreshAll();
}

function hidePanel() {
  if (!panelWin || panelWin.isDestroyed() || !panelWin.isVisible()) return;
  send(islandWin, 'panel:open', false);
  fadeWindow(panelWin, 1, 0, 120, () => {
    if (!panelWin.isDestroyed()) panelWin.hide();
  });
}

function togglePanel() {
  if (panelWin && panelWin.isVisible()) hidePanel();
  else showPanel();
}


// ----- 바탕화면 카드 (위젯처럼) -----
// 평소에는 바탕화면 높이(type: desktop)에 깐다. 다른 창 뒤, 배경 위에 놓이고 클릭은 받지 않는다.
// 옮길 때만 잠깐 보통 창으로 바꿔서 끌어 옮기게 한다.

function defaultWidgetPos() {
  const d = screen.getPrimaryDisplay();
  return { x: d.workArea.x + d.workArea.width - widgetWidth - 24, y: d.workArea.y + 24 };
}

function widgetPos() {
  const pos = settings.widgetPos;
  if (!pos) return defaultWidgetPos();
  const onScreen = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return pos.x >= a.x - PANEL_W / 2 && pos.x <= a.x + a.width - PANEL_W / 2 && pos.y >= a.y && pos.y <= a.y + a.height - 80;
  });
  return onScreen ? pos : defaultWidgetPos();
}

function saveSettings() {
  store.writeSettings(settings);
}

function destroyWidget() {
  if (widgetWin && !widgetWin.isDestroyed()) widgetWin.destroy();
  widgetWin = null;
}

function createWidget(moving = false) {
  destroyWidget();
  widgetMoving = moving;
  const pos = widgetPos();
  const opts = {
    x: pos.x,
    y: pos.y,
    width: widgetWidth,
    height: widgetHeight,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    title: 'AI 사용량 카드',
    webPreferences: commonWeb,
  };
  if (moving) {
    opts.movable = true;
    opts.alwaysOnTop = true;
  } else {
    opts.type = 'desktop';
    opts.movable = false;
    opts.focusable = false;
  }
  widgetWin = new BrowserWindow(opts);
  widgetWin.setVisibleOnAllWorkspaces(true);
  lockDown(widgetWin);
  loadPage(widgetWin, 'widget', moving ? { move: '1' } : {});
  widgetWin.once('ready-to-show', () => {
    if (!widgetWin || widgetWin.isDestroyed()) return;
    if (moving) {
      widgetWin.show();
      widgetWin.focus();
    } else {
      widgetWin.showInactive();
    }
  });
  broadcast();
}

function applyWidget() {
  if (settings.widgetEnabled === false) {
    destroyWidget();
    widgetMoving = false;
    broadcast();
  } else {
    createWidget(false);
  }
}

function startMoveWidget() {
  settings.widgetEnabled = true;
  saveSettings();
  hidePanel();
  createWidget(true);
}

function finishMoveWidget() {
  if (widgetWin && !widgetWin.isDestroyed()) {
    const b = widgetWin.getBounds();
    settings.widgetPos = { x: b.x, y: b.y };
    saveSettings();
  }
  createWidget(false);
}

function setWidgetEnabled(on) {
  settings.widgetEnabled = Boolean(on);
  saveSettings();
  applyWidget();
}

// ----- 포인터를 올리면 열기 -----
// 창 안 이벤트 대신 포인터 위치를 직접 본다. 빠르게 움직여도 놓치지 않는다.

function inside(p, r, pad = 0) {
  return p.x >= r.x - pad && p.x <= r.x + r.width + pad && p.y >= r.y - pad && p.y <= r.y + r.height + pad;
}

let hoverSince = 0;
let leaveSince = 0;

function hoverTick() {
  if (!islandWin || islandWin.isDestroyed() || !panelWin || panelWin.isDestroyed()) return;
  if (loginOpen > 0 || widgetMoving) return;
  const p = screen.getCursorScreenPoint();
  const ib = islandWin.getBounds();
  const overIsland = inside(p, ib, 2);
  const open = panelWin.isVisible();
  const now = Date.now();

  if (!open) {
    if (overIsland) {
      if (!hoverSince) hoverSince = now;
      if (now - hoverSince >= HOVER_OPEN_MS) {
        hoverSince = 0;
        leaveSince = 0;
        showPanel(false);
      }
    } else {
      hoverSince = 0;
    }
    return;
  }

  const pb = panelWin.getBounds();
  // 아일랜드와 패널 사이 틈도 패널 쪽으로 친다
  const bridgeRect = { x: pb.x, y: ib.y, width: pb.width, height: pb.y - ib.y };
  const overPanel = inside(p, pb, 4) || inside(p, bridgeRect);
  if (overIsland || overPanel || panelWin.isFocused()) {
    leaveSince = 0;
    return;
  }
  if (!leaveSince) leaveSince = now;
  if (now - leaveSince >= HOVER_CLOSE_MS) {
    leaveSince = 0;
    hidePanel();
  }
}

// ----- 로그인 -----

function setDockVisible(visible) {
  if (process.platform !== 'darwin' || !app.dock) return;
  if (visible) app.dock.show();
  else app.dock.hide();
}

// 계정 전용 저장공간으로 서비스 로그인 창을 연다. 로그인되면 계정 정보를 돌려준다.
function openLogin(partition, providerId) {
  const provider = providers[providerId] || providers.claude;
  return new Promise((resolve) => {
    const ses = sessionFor(partition);
    loginOpen += 1;
    setDockVisible(true);
    hidePanel();
    const win = new BrowserWindow({
      width: 480,
      height: 720,
      title: `${provider.name} 로그인`,
      autoHideMenuBar: true,
      webPreferences: { partition, sandbox: true, contextIsolation: true },
    });
    win.webContents.setWindowOpenHandler(() => ({
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 480,
        height: 640,
        webPreferences: { partition, sandbox: true, contextIsolation: true },
      },
    }));
    win.loadURL(provider.loginUrl);
    win.focus();

    let finished = false;
    let timer = null;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      loginOpen -= 1;
      if (loginOpen <= 0) setDockVisible(false);
      if (!win.isDestroyed()) win.destroy();
      resolve(value);
    };
    timer = setInterval(async () => {
      try {
        const ctx = { ses, partition, BrowserWindow, loginWindow: win };
        if (!(await provider.isSignedIn(ctx))) return;
        const info = await provider.identify(ctx);
        if (info) finish(info);
      } catch {
        // 아직 로그인 중
      }
    }, 1500);
    win.on('closed', () => finish(null));
  });
}

async function clearPartition(partition) {
  try {
    const ses = session.fromPartition(partition);
    await ses.clearStorageData();
    await ses.clearCache();
  } catch {
    // 지울 것이 없으면 넘어간다
  }
}

async function addAccount(providerId) {
  if (!providers[providerId]) return { ok: false };
  const id = crypto.randomUUID();
  const partition = `persist:acct-${id}`;
  const info = await openLogin(partition, providerId);
  if (!info) {
    await clearPartition(partition);
    return { ok: false };
  }
  let acct = accounts.find((a) => a.provider === providerId && a.email && a.email === info.email);
  if (acct) {
    const old = acct.partition;
    acct.partition = partition;
    acct.orgId = null;
    await clearPartition(old);
  } else {
    acct = { id, provider: providerId, partition, email: info.email, label: '', plan: '', orgId: null, addedAt: Date.now() };
    accounts.push(acct);
    acct.label = labelFrom(info.email, providerId);
  }
  store.write(accounts);
  live[acct.id] = { status: 'loading', usage: null, updatedAt: null };
  placeIsland();
  broadcast();
  await refreshOne(acct);
  showPanel();
  return { ok: true };
}

// 이미 쓰는 브라우저 프로필에서 로그인을 가져와 계정을 추가한다.
async function importAccount(providerId, browserId, profileDir) {
  const provider = providers[providerId];
  if (!provider) return { ok: false, reason: 'unknown' };
  const id = crypto.randomUUID();
  const partition = `persist:acct-${id}`;
  const ses = sessionFor(partition);
  let info = null;
  try {
    await browserImport.importInto(ses, providerId, browserId, profileDir);
    info = await provider.identify({ ses, partition, BrowserWindow });
  } catch (e) {
    await clearPartition(partition);
    return { ok: false, reason: /find-generic-password|User canceled|SecKeychain/i.test(String(e && e.message)) ? 'keychain' : 'failed' };
  }
  if (!info) {
    await clearPartition(partition);
    return { ok: false, reason: 'failed' };
  }
  let acct = accounts.find((a) => a.provider === providerId && a.email && a.email === info.email);
  if (acct) {
    const old = acct.partition;
    acct.partition = partition;
    acct.orgId = null;
    await clearPartition(old);
  } else {
    acct = { id, provider: providerId, partition, email: info.email, label: '', plan: '', orgId: null, addedAt: Date.now() };
    accounts.push(acct);
    acct.label = labelFrom(info.email, providerId);
  }
  store.write(accounts);
  live[acct.id] = { status: 'loading', usage: null, updatedAt: null };
  placeIsland();
  broadcast();
  await refreshOne(acct);
  return { ok: true, existed: Boolean(acct && acct.id !== id) };
}

async function reloginAccount(id) {
  const acct = accounts.find((a) => a.id === id);
  if (!acct) return { ok: false };
  const info = await openLogin(acct.partition, acct.provider);
  if (!info) return { ok: false };
  if (info.email && info.email !== acct.email) {
    acct.email = info.email;
    acct.label = labelFrom(info.email, acct.provider);
  }
  acct.orgId = null;
  store.write(accounts);
  await refreshOne(acct);
  showPanel();
  return { ok: true };
}

async function removeAccount(id) {
  const acct = accounts.find((a) => a.id === id);
  if (!acct) return { ok: false };
  accounts = accounts.filter((a) => a.id !== id);
  delete live[id];
  store.write(accounts);
  await clearPartition(acct.partition);
  placeIsland();
  broadcast();
  return { ok: true };
}

// ----- 조회 -----

async function refreshOne(acct) {
  const prev = live[acct.id] || {};
  if (!prev.usage) live[acct.id] = { ...prev, status: 'loading' };
  try {
    const r = await providerOf(acct).fetchUsage(ctxFor(acct), acct);
    if ((r.orgId && acct.orgId !== r.orgId) || (r.plan && acct.plan !== r.plan)) {
      if (r.orgId) acct.orgId = r.orgId;
      if (r.plan) acct.plan = r.plan;
      store.write(accounts);
    }
    live[acct.id] = { status: 'ok', usage: r.usage, updatedAt: Date.now() };
  } catch (e) {
    const status = statusOf(e);
    if (status === 'noAccess' && acct.orgId) {
      acct.orgId = null;
      store.write(accounts);
    }
    live[acct.id] = { status, usage: prev.usage || null, updatedAt: prev.updatedAt || null };
  }
  broadcast();
}

async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  broadcast();
  for (const acct of [...accounts]) {
    await refreshOne(acct);
  }
  refreshing = false;
  lastRefresh = Date.now();
  broadcast();
}

// ----- 화면과 주고받기 -----

ipcMain.handle('state:get', () => publicState());
ipcMain.on('panel:toggle', () => togglePanel());
ipcMain.on('panel:hide', () => hidePanel());
function clampSize(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(v) || 0)));
}

ipcMain.on('panel:size', (_e, size) => {
  const w = clampSize(size && size.w, PANEL_W, 960);
  const h = clampSize(size && size.h, 120, 1200);
  if (w === panelWidth && h === panelHeight) return;
  panelWidth = w;
  panelHeight = h;
  placePanel();
});
ipcMain.on('widget:size', (_e, size) => {
  const w = clampSize(size && size.w, PANEL_W, 960);
  const h = clampSize(size && size.h, 120, 1200);
  if (w === widgetWidth && h === widgetHeight) return;
  widgetWidth = w;
  widgetHeight = h;
  if (widgetWin && !widgetWin.isDestroyed()) {
    const b = widgetWin.getBounds();
    widgetWin.setBounds({ x: b.x, y: b.y, width: w, height: h });
  }
});
ipcMain.on('widget:enabled', (_e, on) => setWidgetEnabled(on));
ipcMain.on('widget:move', () => startMoveWidget());
ipcMain.on('widget:place', () => finishMoveWidget());
ipcMain.handle('account:add', (_e, providerId) => addAccount(providerId));
ipcMain.handle('import:candidates', (_e, providerId) => browserImport.candidates(providerId));
ipcMain.handle('import:account', (_e, providerId, browserId, profileDir) => importAccount(providerId, browserId, profileDir));
ipcMain.handle('account:remove', (_e, id) => removeAccount(id));
ipcMain.handle('account:relogin', (_e, id) => reloginAccount(id));
ipcMain.handle('usage:refresh', () => {
  if (Date.now() - lastRefresh > MIN_MANUAL_GAP_MS) refreshAll();
  return true;
});
ipcMain.on('app:quit', () => app.quit());

// 예전 이름(Claude Island)으로 쓰던 계정과 로그인 저장공간을 새 이름 폴더로 옮긴다.
function migrateFromOldName() {
  try {
    const now = app.getPath('userData');
    const old = path.join(app.getPath('appData'), 'Claude Island');
    if (fs.existsSync(path.join(now, 'accounts.json')) || !fs.existsSync(path.join(old, 'accounts.json'))) return;
    fs.mkdirSync(now, { recursive: true });
    for (const name of ['accounts.json', 'settings.json', 'Partitions']) {
      const from = path.join(old, name);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(now, name), { recursive: true });
    }
  } catch {
    // 옮기지 못하면 계정을 다시 추가하면 된다
  }
}

app.whenReady().then(() => {
  setDockVisible(false);
  migrateFromOldName();
  store = createStore(app.getPath('userData'));
  accounts = store.read().map((a) => ({ ...a, provider: a.provider || 'claude' }));
  settings = store.readSettings();
  accounts.forEach((a) => {
    live[a.id] = { status: 'loading', usage: null, updatedAt: null };
  });

  createIsland();
  createPanel();
  applyWidget();
  ['display-added', 'display-removed', 'display-metrics-changed'].forEach((ev) =>
    screen.on(ev, () => setTimeout(placeIsland, 300)),
  );
  globalShortcut.register(TOGGLE_SHORTCUT, togglePanel);
  globalShortcut.register(QUIT_SHORTCUT, () => app.quit());
  setInterval(hoverTick, 60);

  refreshAll();
  setInterval(refreshAll, REFRESH_MS);
  powerMonitor.on('resume', () => setTimeout(refreshAll, 5000));

  // 처음 켰는데 계정이 없으면 패널을 열어 계정 추가를 안내한다.
  if (!accounts.length) setTimeout(showPanel, 1200);
});

app.on('second-instance', () => showPanel());
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', (e) => e.preventDefault());
