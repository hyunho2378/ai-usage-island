// ChatGPT: chatgpt.com 로그인으로 받은 토큰으로 Codex 사용 한도(5시간, 주간)를 읽는다.
// 무료 계정은 30일 한도 하나만 나온다.
const { HttpError, fetchText, parseJson, clampPct, windowLabel } = require('./common.cjs');

const BASE = 'https://chatgpt.com';
const PLAN = { free: 'Free', plus: 'Plus', pro: 'Pro', team: 'Team', business: 'Business', enterprise: 'Enterprise', edu: 'Edu', go: 'Go' };

async function session(ctx) {
  const r = await fetchText(ctx, `${BASE}/api/auth/session`, { headers: { accept: 'application/json' }, origin: `${BASE}/` });
  const body = /^\s*\{/.test(r.text) ? parseJson(r.text) : null;
  if (!body || !body.accessToken) throw new HttpError(r.status || 401, 'auth');
  return body;
}

async function identify(ctx) {
  const s = await session(ctx);
  return { email: (s.user && s.user.email) || '' };
}

function win(w) {
  if (!w || typeof w.used_percent !== 'number') return null;
  const seconds = w.limit_window_seconds;
  const kind = Math.abs(seconds - 18000) < 60 ? 'session' : 'long';
  const resetsAt = w.reset_at ? new Date(w.reset_at * 1000).toISOString() : null;
  return { label: windowLabel(seconds), kind, pct: clampPct(w.used_percent), resetsAt };
}

async function fetchUsage(ctx) {
  const s = await session(ctx);
  const r = await fetchText(ctx, `${BASE}/backend-api/wham/usage`, {
    headers: { accept: 'application/json', authorization: `Bearer ${s.accessToken}` },
    origin: `${BASE}/`,
  });
  if (r.status === 401) throw new HttpError(401, 'auth');
  if (r.status === 403) throw new HttpError(403, 'forbidden');
  if (r.status >= 400) throw new HttpError(r.status, 'server');
  const body = parseJson(r.text);
  const rl = body.rate_limit || {};
  const usage = { primary: win(rl.primary_window), secondary: win(rl.secondary_window) };
  if (!usage.primary && !usage.secondary) throw new HttpError(200, 'empty');
  return { plan: PLAN[body.plan_type] || body.plan_type || '', usage };
}

module.exports = {
  id: 'chatgpt',
  name: 'ChatGPT',
  loginUrl: `${BASE}/auth/login`,
  isSignedIn: async (ctx) => {
    const cookies = await ctx.ses.cookies.get({ domain: 'chatgpt.com' });
    return cookies.some((c) => /session-token/.test(c.name));
  },
  identify,
  fetchUsage,
  noAccessHint: '',
};
