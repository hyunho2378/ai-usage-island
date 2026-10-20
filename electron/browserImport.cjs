// 이미 쓰는 브라우저(Aside, 웨일, 크롬)에 로그인된 계정을 그대로 가져온다.
// 브라우저 쿠키 파일을 복사해서 읽고, 맥 키체인의 "브라우저 Safe Storage" 키로 풀어서 계정 전용 저장공간에 넣는다.
// 키체인을 처음 읽을 때 맥이 허용할지 묻는다. 비밀번호나 쿠키 값은 파일로 따로 남기지 않는다.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const SUPPORT = path.join(os.homedir(), 'Library', 'Application Support');

const BROWSERS = [
  { id: 'aside', name: 'Aside', dir: 'Aside', service: 'Aside Safe Storage', account: 'Aside' },
  { id: 'whale', name: '웨일', dir: path.join('Naver', 'Whale'), service: 'Whale Safe Storage', account: 'Whale' },
  { id: 'chrome', name: 'Chrome', dir: path.join('Google', 'Chrome'), service: 'Chrome Safe Storage', account: 'Chrome' },
];

// 서비스별로 가져올 쿠키 범위와, 로그인되어 있는지 알아보는 쿠키 이름
const SCOPES = {
  claude: { hosts: ['claude.ai'], signedIn: (n, h) => n === 'sessionKey' && h.endsWith('claude.ai') },
  chatgpt: {
    hosts: ['chatgpt.com', 'openai.com'],
    signedIn: (n, h) => /session-token/.test(n) && h.endsWith('chatgpt.com'),
  },
  gemini: {
    hosts: ['google.com'],
    signedIn: (n, h) => (n === 'SID' || n === '__Secure-1PSID') && h === '.google.com',
  },
};

const keyCache = new Map();

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

function profilesOf(browser) {
  const root = path.join(SUPPORT, browser.dir);
  let names = {};
  try {
    const state = JSON.parse(fs.readFileSync(path.join(root, 'Local State'), 'utf8'));
    const cache = (state.profile && state.profile.info_cache) || {};
    names = Object.fromEntries(Object.entries(cache).map(([dir, info]) => [dir, info.name || dir]));
  } catch {
    // Local State 가 없으면 폴더 이름만 쓴다
  }
  let dirs = [];
  try {
    dirs = fs.readdirSync(root).filter((d) => d === 'Default' || /^Profile \d+$/.test(d));
  } catch {
    return [];
  }
  return dirs
    .map((dir) => ({ dir, name: names[dir] || dir, cookies: path.join(root, dir, 'Cookies') }))
    .filter((p) => fs.existsSync(p.cookies));
}

// 브라우저가 쓰는 중이라 잠겨 있을 수 있어서 복사본을 읽는다.
async function query(cookieFile, where) {
  const tmp = path.join(os.tmpdir(), `aui-cookies-${crypto.randomUUID()}.db`);
  fs.copyFileSync(cookieFile, tmp);
  try {
    const sql = `select host_key, name, hex(encrypted_value) as ev, value, path, expires_utc, is_secure, is_httponly, samesite from cookies where ${where}`;
    const out = await run('/usr/bin/sqlite3', ['-json', tmp, sql]);
    const meta = await run('/usr/bin/sqlite3', [tmp, "select value from meta where key='version'"]);
    return { rows: out.trim() ? JSON.parse(out) : [], version: Number(meta.trim()) || 0 };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function hostWhere(hosts) {
  return '(' + hosts.map((h) => `host_key = '${h}' or host_key like '%.${h}'`).join(' or ') + ')';
}

// 어느 브라우저, 어느 프로필에 이 서비스 로그인이 있는지 (값은 풀지 않는다)
async function candidates(providerId) {
  const scope = SCOPES[providerId];
  if (!scope) return [];
  const found = [];
  for (const browser of BROWSERS) {
    for (const profile of profilesOf(browser)) {
      try {
        const { rows } = await query(profile.cookies, hostWhere(scope.hosts));
        if (rows.some((r) => scope.signedIn(r.name, r.host_key))) {
          found.push({ browser: browser.id, browserName: browser.name, profile: profile.dir, profileName: profile.name });
        }
      } catch {
        // 읽을 수 없는 프로필은 건너뛴다
      }
    }
  }
  return found;
}

async function keyFor(browser) {
  if (keyCache.has(browser.id)) return keyCache.get(browser.id);
  const pass = (await run('/usr/bin/security', ['find-generic-password', '-w', '-s', browser.service, '-a', browser.account])).trim();
  const key = crypto.pbkdf2Sync(pass, 'saltysalt', 1003, 16, 'sha1');
  keyCache.set(browser.id, key);
  return key;
}

function decrypt(hex, key, version) {
  const buf = Buffer.from(hex, 'hex');
  if (buf.length < 3) return '';
  const prefix = buf.subarray(0, 3).toString();
  if (prefix !== 'v10' && prefix !== 'v11') return buf.toString('utf8');
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
  let out = Buffer.concat([decipher.update(buf.subarray(3)), decipher.final()]);
  // 쿠키 파일 버전 24 부터는 앞 32바이트가 도메인 확인값이다
  if (version >= 24 && out.length >= 32) out = out.subarray(32);
  return out.toString('utf8');
}

const SAME_SITE = { 0: 'no_restriction', 1: 'lax', 2: 'strict' };

// 골라 둔 브라우저 프로필의 쿠키를 계정 전용 저장공간(ses)에 넣는다.
async function importInto(ses, providerId, browserId, profileDir) {
  const scope = SCOPES[providerId];
  const browser = BROWSERS.find((b) => b.id === browserId);
  if (!scope || !browser) throw new Error('unknown');
  const profile = profilesOf(browser).find((p) => p.dir === profileDir);
  if (!profile) throw new Error('profile');
  const key = await keyFor(browser);
  const { rows, version } = await query(profile.cookies, hostWhere(scope.hosts));
  let count = 0;
  for (const r of rows) {
    let value = r.value || '';
    if (!value && r.ev) {
      try {
        value = decrypt(r.ev, key, version);
      } catch {
        continue;
      }
    }
    if (!value) continue;
    const host = r.host_key.replace(/^\./, '');
    const details = {
      url: `${r.is_secure ? 'https' : 'http'}://${host}${r.path || '/'}`,
      name: r.name,
      value,
      path: r.path || '/',
      secure: Boolean(r.is_secure),
      httpOnly: Boolean(r.is_httponly),
    };
    if (r.host_key.startsWith('.') && !r.name.startsWith('__Host-')) details.domain = r.host_key;
    const same = SAME_SITE[r.samesite];
    if (same) details.sameSite = same;
    const exp = Number(r.expires_utc);
    if (exp > 0) details.expirationDate = exp / 1e6 - 11644473600;
    try {
      await ses.cookies.set(details);
      count += 1;
    } catch {
      // 맞지 않는 쿠키 하나는 건너뛴다
    }
  }
  if (!count) throw new Error('empty');
  return count;
}

module.exports = { candidates, importInto, BROWSERS };
