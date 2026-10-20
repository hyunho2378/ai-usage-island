// 시간과 퍼센트를 사람이 읽는 말로 바꾼다.

export function pctText(b) {
  return b && typeof b.pct === 'number' ? b.pct : null;
}

function hm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const SHORT_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 남은 시간과 실제 시각을 같이: "3시간 00분 (17:21) 초기화", "4일 3시간 (토 19:39) 초기화", "29일 (11월 18일) 초기화"
export function resetText(bucket, now = Date.now()) {
  if (!bucket || !bucket.resetsAt) return '';
  const d = new Date(bucket.resetsAt);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.round((d.getTime() - now) / 60000);
  if (min <= 0) return '곧 초기화';
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  if (days === 0) {
    const left = hours > 0 ? `${hours}시간 ${String(mins).padStart(2, '0')}분` : `${mins}분`;
    return `${left} (${hm(d)}) 초기화`;
  }
  if (days < 7) return `${days}일 ${hours}시간 (${SHORT_DAYS[d.getDay()]} ${hm(d)}) 초기화`;
  return `${days}일 (${d.getMonth() + 1}월 ${d.getDate()}일) 초기화`;
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
