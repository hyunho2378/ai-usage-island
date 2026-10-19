// Claude Island
// 노치 자리에 붙는 검정 아일랜드(접힌 상태)와, 누르면 아래로 열리는 검정 패널(계정별 상세)로 이루어진다.
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
const usage = require('./usage.cjs');

const DEV_URL = process.env.ISLAND_DEV_URL || ''; // 개발 중에는 vite 주소
const REFRESH_MS = 3 * 60 * 1000;
const MIN_MANUAL_GAP_MS = 30 * 1000;
const NOTCH_WIDTH = Number(process.env.ISLAND_NOTCH_WIDTH) || 200; // 맥북 노치 폭 추정값
const WING = 108; // tokens.js size.wing 과 같은 값
const PILL_W = 204;
const PILL_H = 34;
const PANEL_W = 440; // tokens.js size.panelWidth
const GAP = 8;
const TOGGLE_SHORTCUT = 'Control+Option+C';

let islandWin = null;
let panelWin = null;
let panelHeight = 360;
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
    .replace(/\s?claude-island\/\S+/i, '')
    .replace(/\s?Claude Island\/\S+/i, '');
}

function sessionFor(partition) {
  const ses = session.fromPartition(partition);
  ses.setUserAgent(chromeUA());
  return ses;
}

function ctxFor(acct) {
  return { ses: sessionFor(acct.partition), partition: acct.partition, BrowserWindow };
}

function labelFrom(email) {
  const local = (email || '').split('@')[0] || '계정';
  const same = accounts.filter((a) => (a.email || '').split('@')[0] === local);
  return same.length > 1 ? email : local;
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
    accounts: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      email: a.email,
      plan: a.plan || '',
      ...(live[a.id] || { status: 'loading', usage: null, updatedAt: null }),
    })),
    geometry,
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
}

function loadPage(win, page) {
  if (DEV_URL) win.loadURL(`${DEV_URL}/${page}.html`);
  else win.loadFile(path.join(__dirname, '..', 'dist', `${page}.html`));
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
    const w = NOTCH_WIDTH + WING * 2;
    const x = Math.round(d.bounds.x + (d.bounds.width - w) / 2);
    islandWin.setBounds({ x, y: d.bounds.y, width: w, height: menuBar });
    attached = islandWin.getBounds().y <= d.bounds.y + 1;
    if (attached) geometry = { mode: 'notch', notchWidth: NOTCH_WIDTH, height: menuBar, wing: WING };
  }
  if (!attached) {
    // 노치가 없거나, 맥이 창을 메뉴 막대 위로 못 올리게 하면 메뉴 막대 바로 아래 알약으로 띄운다.
    const x = Math.round(d.bounds.x + (d.bounds.width - PILL_W) / 2);
    islandWin.setBounds({ x, y: d.workArea.y + GAP, width: PILL_W, height: PILL_H });
    geometry = { mode: 'pill', notchWidth: 0, height: PILL_H, wing: WING };
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
    title: 'Claude Island',
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
  const x = Math.round(ib.x + ib.width / 2 - PANEL_W / 2);
  const maxH = d.workArea.y + d.workArea.height - top - GAP;
  panelWin.setBounds({ x, y: top, width: PANEL_W, height: Math.min(panelHeight, maxH) });
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
    title: 'Claude Island',
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

function showPanel() {
  if (!panelWin || panelWin.isDestroyed()) return;
  placePanel();
  panelShownAt = Date.now();
  panelWin.setOpacity(0);
  panelWin.show();
  panelWin.focus();
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

// ----- 로그인 -----

function setDockVisible(visible) {
  if (process.platform !== 'darwin' || !app.dock) return;
  if (visible) app.dock.show();
  else app.dock.hide();
}

// 계정 전용 저장공간으로 claude.ai 로그인 창을 연다. 로그인되면 계정 정보를 돌려준다.
function openLogin(partition) {
  return new Promise((resolve) => {
    const ses = sessionFor(partition);
    loginOpen += 1;
    setDockVisible(true);
    hidePanel();
    const win = new BrowserWindow({
      width: 480,
      height: 720,
      title: 'Claude 로그인',
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
    win.loadURL('https://claude.ai/login');
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
        const cookies = await ses.cookies.get({ name: 'sessionKey' });
        if (!cookies.length) return;
        const info = await usage.fetchAccount({ ses, partition, BrowserWindow });
        if (info && info.email) finish(info);
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

async function addAccount() {
  const id = crypto.randomUUID();
  const partition = `persist:acct-${id}`;
  const info = await openLogin(partition);
  if (!info) {
    await clearPartition(partition);
    return { ok: false };
  }
  let acct = accounts.find((a) => a.email && a.email === info.email);
  if (acct) {
    const old = acct.partition;
    acct.partition = partition;
    acct.orgId = null;
    await clearPartition(old);
  } else {
    acct = { id, partition, email: info.email, label: '', plan: '', orgId: null, addedAt: Date.now() };
    accounts.push(acct);
    acct.label = labelFrom(info.email);
  }
  store.write(accounts);
  live[acct.id] = { status: 'loading', usage: null, updatedAt: null };
  broadcast();
  await refreshOne(acct);
  showPanel();
  return { ok: true };
}

async function reloginAccount(id) {
  const acct = accounts.find((a) => a.id === id);
  if (!acct) return { ok: false };
  const info = await openLogin(acct.partition);
  if (!info) return { ok: false };
  if (info.email && info.email !== acct.email) {
    acct.email = info.email;
    acct.label = labelFrom(info.email);
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
  broadcast();
  return { ok: true };
}

// ----- 조회 -----

async function refreshOne(acct) {
  const prev = live[acct.id] || {};
  if (!prev.usage) live[acct.id] = { ...prev, status: 'loading' };
  try {
    const r = await usage.fetchUsage(ctxFor(acct), acct);
    if (acct.orgId !== r.orgId || (r.plan && acct.plan !== r.plan)) {
      acct.orgId = r.orgId;
      if (r.plan) acct.plan = r.plan;
      store.write(accounts);
    }
    live[acct.id] = { status: 'ok', usage: r.usage, updatedAt: Date.now() };
  } catch (e) {
    const status = usage.statusOf(e);
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
ipcMain.on('panel:height', (_e, h) => {
  const next = Math.max(120, Math.min(900, Math.round(Number(h) || 0)));
  if (next === panelHeight) return;
  panelHeight = next;
  placePanel();
});
ipcMain.handle('account:add', () => addAccount());
ipcMain.handle('account:remove', (_e, id) => removeAccount(id));
ipcMain.handle('account:relogin', (_e, id) => reloginAccount(id));
ipcMain.handle('usage:refresh', () => {
  if (Date.now() - lastRefresh > MIN_MANUAL_GAP_MS) refreshAll();
  return true;
});
ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(() => {
  setDockVisible(false);
  store = createStore(app.getPath('userData'));
  accounts = store.read();
  accounts.forEach((a) => {
    live[a.id] = { status: 'loading', usage: null, updatedAt: null };
  });

  createIsland();
  createPanel();
  ['display-added', 'display-removed', 'display-metrics-changed'].forEach((ev) =>
    screen.on(ev, () => setTimeout(placeIsland, 300)),
  );
  globalShortcut.register(TOGGLE_SHORTCUT, togglePanel);

  refreshAll();
  setInterval(refreshAll, REFRESH_MS);
  powerMonitor.on('resume', () => setTimeout(refreshAll, 5000));

  // 처음 켰는데 계정이 없으면 패널을 열어 계정 추가를 안내한다.
  if (!accounts.length) setTimeout(showPanel, 1200);
});

app.on('second-instance', () => showPanel());
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', (e) => e.preventDefault());
