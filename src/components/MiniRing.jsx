import { levelOf } from '../tokens.js';

// 접힌 아일랜드에 계정마다 하나씩 놓는 작은 고리. 5시간 사용률을 보여준다.
export default function MiniRing({ pct, label }) {
  const r = 5.75;
  const c = 2 * Math.PI * r;
  const value = typeof pct === 'number' ? pct : 0;
  const level = levelOf(typeof pct === 'number' ? pct : null);
  return (
    <svg className="mini-ring" viewBox="0 0 14 14" role="img" aria-label={label}>
      <circle className="mini-ring__track" cx="7" cy="7" r={r} />
      <circle
        className={`mini-ring__value mini-ring__value--${level}`}
        cx="7"
        cy="7"
        r={r}
        strokeDasharray={`${(c * value) / 100} ${c}`}
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}
