// Gemini: gemini.google.com/usage 화면이 쓰는 요청으로 5시간, 주간 한도를 읽는다.
// 요청 형식은 오픈소스 CodexBar 의 gemini-web 플러그인(MIT)을 참고했다.
const { HttpError, fetchText, parseJson, clampPct } = require('./common.cjs');

const BASE = 'https://gemini.google.com';
const SIGNATURE = '2/dWbCvkVB0X16r9NPnxifeOAAqdCqMf0xeWvau9yPy7g=';
const VARIABLES = JSON.stringify({
  g1Request: { entrypoints: ['GEMINI_USAGE_SETTINGS_UPGRADE_BANNER'] },
  workspaceRequest: { recommendationsForSurfaceRequests: [] },
});
const URL_USAGE =
  `${BASE}/_/BardChatUi/graphql/schemas/GEMINI_WEB_GRAPHQL/executeQuery` +
  `?query_signature=${encodeURIComponent(SIGNATURE)}&variables=${encodeURIComponent(VARIABLES)}`;
const TIER = { TIER1: 'Pro', TIER2: 'Ultra' };

async function usageInfo(ctx) {
  const r = await fetchText(ctx, URL_USAGE, { headers: { accept: 'application/json', referer: `${BASE}/usage` } });
  if (r.status === 401 || r.status === 403 || /^\s*</.test(r.text)) throw new HttpError(r.status || 401, 'auth');
  if (r.status >= 400) throw new HttpError(r.status, 'server');
  const results = parseJson(r.text);
  const list = Array.isArray(results) ? results : [results];
  const data = list.map((x) => x && x.data).find((d) => d && Object.prototype.hasOwnProperty.call(d, 'viewer'));
  if (!data) throw new HttpError(200, 'parse');
  if (!data.viewer) throw new HttpError(200, 'auth');
  const info = data.viewer.rpcs && data.viewer.rpcs.getUsageInfo;
  if (!info || !Array.isArray(info.pools)) throw new HttpError(200, 'empty');
  return info;
}

function pool(info, type, label, kind) {
  const p = info.pools.find((x) => x && x.poolType === type);
  if (!p || typeof p.percentageUsed !== 'number') return null;
  return { label, kind, pct: clampPct(p.percentageUsed * 100), resetsAt: (p.gxu && p.gxu.windowRefreshesAt) || null };
}

// 로그인 창(gemini.google.com)에서 계정 이메일을 읽는다.
async function identify(ctx) {
  await usageInfo(ctx);
  let email = '';
  if (ctx.loginWindow && !ctx.loginWindow.isDestroyed()) {
    try {
      const html = await ctx.loginWindow.webContents.executeJavaScript('document.body ? document.body.innerHTML : ""');
      const m = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (m) email = m[0];
    } catch {
      // 이메일을 못 읽어도 계정은 추가한다
    }
  }
  return { email };
}

async function fetchUsage(ctx) {
  const info = await usageInfo(ctx);
  const usage = {
    primary: pool(info, 'GXU_FIVE_HOURLY', '5시간', 'session'),
    secondary: pool(info, 'GXU_WEEKLY', '주간', 'week'),
  };
  if (!usage.primary && !usage.secondary) throw new HttpError(200, 'empty');
  return { plan: TIER[info.subscriptionTier] || '', usage };
}

module.exports = {
  id: 'gemini',
  name: 'Gemini',
  loginUrl: `https://accounts.google.com/ServiceLogin?continue=${encodeURIComponent(`${BASE}/usage`)}`,
  isSignedIn: async (ctx) => {
    const cookies = await ctx.ses.cookies.get({ domain: 'google.com' });
    return cookies.some((c) => c.name === 'SID' || c.name === '__Secure-1PSID');
  },
  identify,
  fetchUsage,
  noAccessHint: '이 Google 계정에는 Gemini 사용 한도 정보가 없어요.',
};
