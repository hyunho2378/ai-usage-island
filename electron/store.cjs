// 계정 목록 저장. 비밀번호나 쿠키는 여기 넣지 않는다 (이메일, 표시 이름, 조직 번호, 요금제 이름만).
const fs = require('fs');
const path = require('path');

function createStore(dir) {
  const file = path.join(dir, 'accounts.json');

  function read() {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(data.accounts) ? data.accounts : [];
    } catch {
      return [];
    }
  }

  function write(accounts) {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ accounts }, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, file);
  }

  return { read, write, file };
}

module.exports = { createStore };
