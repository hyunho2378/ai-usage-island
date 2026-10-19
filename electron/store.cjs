// 계정 목록과 설정 저장. 비밀번호나 쿠키는 여기 넣지 않는다 (이메일, 표시 이름, 조직 번호, 요금제 이름만).
const fs = require('fs');
const path = require('path');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(dir, file, data) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function createStore(dir) {
  const file = path.join(dir, 'accounts.json');
  const settingsFile = path.join(dir, 'settings.json');

  return {
    read() {
      const data = readJson(file, {});
      return Array.isArray(data.accounts) ? data.accounts : [];
    },
    write(accounts) {
      writeJson(dir, file, { accounts });
    },
    readSettings() {
      return readJson(settingsFile, {});
    },
    writeSettings(settings) {
      writeJson(dir, settingsFile, settings);
    },
  };
}

module.exports = { createStore };
