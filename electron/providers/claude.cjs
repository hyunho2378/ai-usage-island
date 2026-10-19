// Claude: claude.ai 설정의 사용량 화면이 쓰는 주소에서 5시간, 주간 사용률을 읽는다.
const { HttpError, fetchText, parseJson, clampPct } = require('./common.cjs');

const BASE = 'https://claude.ai';

function planOf(org) {
  if (!org) return '';
  const caps = org.capabilities || [];
  const m = (org.rate_limit_tier || '').match(/max_(\d+)x/);
  if (caps.includes('claude_max')) return m ? `Max ${m[1]}x` : 'Max';
  if (caps.includes('raven')) return 'Team';
  if (caps.includes('claude_pro')) return 'Pro';
  if (caps.includes('enterprise')) return 'Enterprise';
  return '';
}

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

function errorKind(body) {
  const err = (body && body.error) || {};
  const text = `${err.type || ''} ${err.message || ''} ${(err.details && err.details.error_code) || ''}`.toLowerCase();
  return /session|authoriz|authenticat|login|unauthor/.test(text) ? 'auth' : 'forbidden';
}

async function getJson(ctx, path) {
  const r = await fetchText(ctx, BASE + path, { headers: { accept: 'application/json' }, origin: `${BASE}/` });
  if (!/json/.test(r.type) && !/^\s*[[{]/.test(r.text)) {
    if (r.status === 401) throw new HttpError(401, 'auth');
    throw new HttpError(r.status, r.status >= 500 ? 'server' : 'auth');
  }
  const body = parseJson(r.text);
  if (r.status === 401) throw new HttpError(401, 'auth');
  if (r.status === 403 || (body && body.type === 'error')) throw new HttpError(r.status, errorKind(body));
  if (r.status >= 400) throw new HttpError(r.status, 'server');
  return body;
}

async function identify(ctx) {
  const acc = await getJson(ctx, '/api/account');
  if (!acc || !acc.email_address) throw new HttpError(0, 'auth');
  return { email: acc.email_address };
}

function bucket(b, label, kind) {
  if (!b || typeof b.utilization !== 'number') return null;
  return { label, kind, pct: clampPct(b.utilization), resetsAt: b.resets_at || null };
}

async function fetchUsage(ctx, account) {
  let orgs;
  if (account.orgId) orgs = [{ uuid: account.orgId, _known: true }];
  else {
    const acc = await getJson(ctx, '/api/account');
    orgs = rankOrgs((acc.memberships || []).map((m) => m.organization).filter(Boolean));
  }
  let lastErr = null;
  for (const org of orgs) {
    try {
      const raw = await getJson(ctx, `/api/organizations/${org.uuid}/usage`);
      const usage = {
        primary: bucket(raw.five_hour, '5시간', 'session'),
        secondary: bucket(raw.seven_day, '주간', 'week'),
      };
      if (!usage.primary && !usage.secondary) {
        lastErr = new HttpError(200, 'empty');
        continue;
      }
      return { orgId: org.uuid, plan: org._known ? account.plan : planOf(org), usage };
    } catch (e) {
      lastErr = e;
      if (e.kind === 'auth') throw e;
    }
  }
  if (lastErr && lastErr.kind === 'forbidden') {
    try {
      await identify(ctx);
    } catch (e) {
      if (e.kind === 'auth' || e.kind === 'forbidden') throw new HttpError(e.status, 'auth');
    }
  }
  throw lastErr || new HttpError(0, 'empty');
}

module.exports = {
  id: 'claude',
  name: 'Claude',
  loginUrl: `${BASE}/login`,
  isSignedIn: async (ctx) => (await ctx.ses.cookies.get({ name: 'sessionKey' })).length > 0,
  identify,
  fetchUsage,
  noAccessHint: '팀 관리자가 사용량 보기를 꺼 두었을 수 있어요.',
};
