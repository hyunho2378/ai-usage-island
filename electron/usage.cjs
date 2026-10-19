// claude.ai 사용량 조회.
// 계정마다 따로 칸막이된 저장공간(partition)을 쓰고, 그 안의 로그인 쿠키로 조회한다.
// 로그인 정보는 이 앱이 따로 저장하지 않는다. Chromium 쿠키 저장소(맥 키체인으로 암호화)에만 있다.
//
// 주의: claude.ai/api/... 는 공개 문서가 없는 내부 주소다. Anthropic 이 바꾸면 깨질 수 있다.

const BASE = 'https://claude.ai';

// 사람이 보는 요금제 이름
function planOf(org) {
  if (!org) return '';
  const caps = org.capabilities || [];
  const tier = org.rate_limit_tier || '';
  const m = tier.match(/max_(\d+)x/);
  if (caps.includes('claude_max')) return m ? `Max ${m[1]}x` : 'Max';
  if (caps.includes('raven')) return 'Team';
  if (caps.includes('claude_pro')) return 'Pro';
  if (caps.includes('enterprise')) return 'Enterprise';
  return '';
}

// 사용량을 볼 수 있을 가능성이 높은 조직부터
function rankOrgs(orgs) {
  const score = (o) => {
    const caps = o.capabilities || [];
    if (caps.includes('claude_max')) return 0;
    if (caps.includes('raven')) return 1;
    if (caps.includes('claude_pro')) return 2;
    return 9;
  };
  return [...orgs].sort((a, b) => score(a) - score(b));
}

function bucket(b) {
  if (!b || typeof b.utilization !== 'number') return null;
  return { pct: Math.max(0, Math.min(100, Math.round(b.utilization))), resetsAt: b.resets_at || null };
}

// 응답 원본에서 화면에 필요한 값만 꺼낸다.
function normalizeUsage(raw) {
  return {
    fiveHour: bucket(raw && raw.five_hour),
    weekly: bucket(raw && raw.seven_day),
  };
}

class HttpError extends Error {
  constructor(status, kind) {
    super(`HTTP ${status}`);
    this.status = status;
    this.kind = kind; // 'auth' | 'forbidden' | 'challenge' | 'server'
  }
}

// 오류 본문이 로그인 문제인지 권한 문제인지 가른다.
function kindOfErrorBody(body) {
  const err = (body && body.error) || {};
  const text = `${err.type || ''} ${err.message || ''} ${(err.details && err.details.error_code) || ''}`.toLowerCase();
  if (/session|authoriz|authenticat|login|unauthor/.test(text)) return 'auth';
  return 'forbidden';
}

function checkBody(status, body) {
  if (body && body.type === 'error') throw new HttpError(status || 403, kindOfErrorBody(body));
  return body;
}

// ses.fetch 로 JSON 을 받는다. HTML 이 오면 Cloudflare 확인 화면으로 본다.
async function getJson(ses, path) {
  const res = await ses.fetch(BASE + path, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) {
    if (res.status === 401) throw new HttpError(401, 'auth');
    if (res.status === 403 || res.status === 503 || res.ok) throw new HttpError(res.status, 'challenge');
    throw new HttpError(res.status, 'server');
  }
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new HttpError(401, 'auth');
  if (res.status === 403) throw new HttpError(403, kindOfErrorBody(body));
  if (!res.ok) throw new HttpError(res.status, 'server');
  return checkBody(res.status, body);
}

// Cloudflare 확인 화면이 뜨면 숨긴 창으로 같은 주소를 열어 통과시킨 뒤 본문을 읽는다.
async function getJsonViaWindow(BrowserWindow, partition, path, timeoutMs = 20000) {
  const win = new BrowserWindow({ show: false, webPreferences: { partition, sandbox: true } });
  try {
    const started = Date.now();
    await win.loadURL(BASE + path);
    while (Date.now() - started < timeoutMs) {
      const text = await win.webContents.executeJavaScript('document.body ? document.body.innerText : ""');
      const trimmed = (text || '').trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return checkBody(0, JSON.parse(trimmed));
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new HttpError(0, 'challenge');
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

async function getJsonSmart(ctx, path) {
  try {
    return await getJson(ctx.ses, path);
  } catch (e) {
    if (e.kind === 'challenge') return getJsonViaWindow(ctx.BrowserWindow, ctx.partition, path);
    throw e;
  }
}

// 계정 정보: 이메일, 이름, 조직 목록
async function fetchAccount(ctx) {
  const acc = await getJsonSmart(ctx, '/api/account');
  const orgs = (acc.memberships || []).map((m) => m.organization).filter(Boolean);
  return { email: acc.email_address || '', name: acc.display_name || acc.full_name || '', orgs };
}

// 한 계정의 사용량. 조직이 정해져 있지 않으면 사용량이 나오는 조직을 찾는다.
async function fetchUsage(ctx, account) {
  let orgId = account.orgId;
  let plan = account.plan;
  let orgs = null;
  if (!orgId) {
    const info = await fetchAccount(ctx);
    orgs = rankOrgs(info.orgs);
  } else {
    orgs = [{ uuid: orgId, _known: true }];
  }
  let lastErr = null;
  for (const org of orgs) {
    try {
      const raw = await getJsonSmart(ctx, `/api/organizations/${org.uuid}/usage`);
      const usage = normalizeUsage(raw);
      if (!usage.fiveHour && !usage.weekly) {
        lastErr = new HttpError(200, 'empty');
        continue;
      }
      return { orgId: org.uuid, plan: org._known ? plan : planOf(org), usage };
    } catch (e) {
      lastErr = e;
      if (e.kind === 'auth') throw e;
    }
  }
  // 사용량이 막혔을 때 계정 정보까지 막히면 로그인이 풀린 것으로 본다.
  if (lastErr && lastErr.kind === 'forbidden') {
    try {
      await fetchAccount(ctx);
    } catch (e) {
      if (e.kind === 'auth' || e.kind === 'forbidden') throw new HttpError(e.status, 'auth');
    }
  }
  throw lastErr || new HttpError(0, 'empty');
}

// 오류를 화면 상태로 바꾼다.
function statusOf(err) {
  if (!err) return 'ok';
  if (err.kind === 'auth') return 'needLogin';
  if (err.kind === 'forbidden' || err.kind === 'empty') return 'noAccess';
  return 'offline';
}

module.exports = { fetchAccount, fetchUsage, normalizeUsage, planOf, rankOrgs, statusOf, HttpError };
