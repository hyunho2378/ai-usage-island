// 서비스 공통: 계정 전용 저장공간으로 요청을 보내고, 확인 화면(Cloudflare 등)이 뜨면 숨긴 창에서 다시 시도한다.
// 주의: 여기서 읽는 주소들은 각 서비스가 공개 문서로 약속한 것이 아니다. 바뀌면 동작이 멈출 수 있다.

class HttpError extends Error {
  constructor(status, kind) {
    super(`HTTP ${status} ${kind}`);
    this.status = status;
    this.kind = kind; // 'auth' | 'forbidden' | 'challenge' | 'server' | 'empty' | 'parse'
  }
}

function looksLikeChallenge(res, text) {
  const server = (res.headers.get && res.headers.get('server')) || '';
  return /just a moment|cf-chl|challenge-platform/i.test(text) || (/cloudflare/i.test(server) && /<html/i.test(text));
}

// 숨긴 창에서 origin 을 연 뒤 그 페이지 안에서 fetch 한다. 같은 브라우저 지문이라 확인 화면을 통과한다.
async function fetchInPage(ctx, origin, url, headers = {}, timeoutMs = 25000) {
  const win = new ctx.BrowserWindow({ show: false, webPreferences: { partition: ctx.partition, sandbox: true } });
  try {
    await win.loadURL(origin);
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const result = await win.webContents.executeJavaScript(
        `fetch(${JSON.stringify(url)}, { credentials: 'include', headers: ${JSON.stringify(headers)} })
           .then(async (r) => ({ status: r.status, type: r.headers.get('content-type') || '', text: await r.text() }))
           .catch((e) => ({ status: 0, type: '', text: String(e) }))`,
      );
      if (result.status && !/just a moment|cf-chl/i.test(result.text)) return result;
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new HttpError(0, 'challenge');
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

// 글자로 응답을 받는다. { status, type, text }
async function fetchText(ctx, url, { headers = {}, origin } = {}) {
  let res;
  try {
    res = await ctx.ses.fetch(url, { credentials: 'include', headers });
  } catch {
    throw new HttpError(0, 'offline');
  }
  const type = res.headers.get('content-type') || '';
  const text = await res.text();
  if (looksLikeChallenge(res, text)) {
    if (!origin) throw new HttpError(res.status, 'challenge');
    return fetchInPage(ctx, origin, url, headers);
  }
  return { status: res.status, type, text };
}

function parseJson(text) {
  try {
    return JSON.parse(text.trim().replace(/^\)\]\}'\s*/, ''));
  } catch {
    throw new HttpError(200, 'parse');
  }
}

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// 기간 길이(초)를 사람이 읽는 이름으로
function windowLabel(seconds) {
  if (!seconds) return '';
  const h = seconds / 3600;
  if (Math.abs(h - 5) < 0.1) return '5시간';
  if (Math.abs(h - 168) < 1) return '주간';
  if (Math.abs(h - 720) < 2) return '30일';
  if (h < 48) return `${Math.round(h)}시간`;
  return `${Math.round(h / 24)}일`;
}

function statusOf(err) {
  if (!err) return 'ok';
  if (err.kind === 'auth') return 'needLogin';
  if (err.kind === 'forbidden' || err.kind === 'empty') return 'noAccess';
  return 'offline';
}

module.exports = { HttpError, fetchText, fetchInPage, parseJson, clampPct, windowLabel, statusOf };
