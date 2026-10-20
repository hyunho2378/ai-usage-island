// 시간과 퍼센트를 사람이 읽는 말로 바꾼다.
const DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export function pctText(b) {
  return b && typeof b.pct === 'number' ? b.pct : null;
}

function hm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 실제 초기화 시각: "19:32 초기화", "내일 03:00 초기화", "월요일 03:00 초기화", "11월 18일 03:00 초기화"
export function resetText(bucket, now = Date.now()) {
  if (!bucket || !bucket.resetsAt) return '';
  const d = new Date(bucket.resetsAt);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date(now);
  const tomorrow = new Date(now + 24 * 3600 * 1000);
  if (d.getTime() <= now) return '곧 초기화';
  if (sameDay(d, today)) return `${hm(d)} 초기화`;
  if (sameDay(d, tomorrow)) return `내일 ${hm(d)} 초기화`;
  if (d.getTime() - now < 7 * 24 * 3600 * 1000) return `${DAYS[d.getDay()]} ${hm(d)} 초기화`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm(d)} 초기화`;
}

export function updatedText(ts, now = Date.now()) {
  if (!ts) return '아직 불러오지 않았어요';
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return '방금 갱신';
  if (min < 60) return `${min}분 전 갱신`;
  return `${Math.floor(min / 60)}시간 전 갱신`;
}

// 접힌 아일랜드 오른쪽에 보여 줄 값: 5시간 사용률이 가장 높은 계정
export function topAccount(accounts) {
  let best = null;
  for (const a of accounts) {
    const p = a.usage && a.usage.primary ? a.usage.primary.pct : null;
    if (p == null) continue;
    if (!best || p > best.pct) best = { id: a.id, pct: p, provider: a.provider };
  }
  return best;
}
