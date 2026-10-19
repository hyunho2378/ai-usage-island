// 시간과 퍼센트를 사람이 읽는 말로 바꾼다.
const DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export function pctText(b) {
  return b && typeof b.pct === 'number' ? b.pct : null;
}

// 5시간 창: "1시간 42분 뒤 초기화"
export function resetIn(resetsAt, now = Date.now()) {
  if (!resetsAt) return '';
  const min = Math.round((new Date(resetsAt).getTime() - now) / 60000);
  if (Number.isNaN(min)) return '';
  if (min <= 0) return '곧 초기화';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분 뒤 초기화`;
  if (m === 0) return `${h}시간 뒤 초기화`;
  return `${h}시간 ${m}분 뒤 초기화`;
}

// 주간 창: "금요일 14:00 초기화"
export function resetAt(resetsAt, now = Date.now()) {
  if (!resetsAt) return '';
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return '';
  if (d.getTime() - now < 24 * 3600 * 1000) return resetIn(resetsAt, now);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${hh}:${mm} 초기화`;
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
    const p = a.usage && a.usage.fiveHour ? a.usage.fiveHour.pct : null;
    if (p == null) continue;
    if (!best || p > best.pct) best = { id: a.id, pct: p };
  }
  return best;
}
