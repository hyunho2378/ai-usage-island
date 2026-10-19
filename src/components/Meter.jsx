import NumberFlow from '@number-flow/react';
import { levelOf } from '../tokens.js';

// 사용률 하나: 이름, 큰 퍼센트, 막대, 초기화 시각
export default function Meter({ name, bucket, resetText, loading }) {
  const pct = bucket && typeof bucket.pct === 'number' ? bucket.pct : null;
  const level = levelOf(pct);
  return (
    <div className={`meter${loading ? ' meter--loading' : ''}`}>
      <div className="meter__top">
        <span className="meter__name">{name}</span>
        <span className={`meter__value meter__value--${level}`}>
          {pct == null ? (
            <span className="meter__empty">{loading ? '불러오는 중' : '값 없음'}</span>
          ) : (
            <NumberFlow value={pct} suffix="%" />
          )}
        </span>
      </div>
      <div
        className="meter__track"
        role="progressbar"
        aria-label={`${name} 사용률`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
      >
        <div className={`meter__fill meter__fill--${level}`} style={{ transform: `scaleX(${(pct ?? 0) / 100})` }} />
      </div>
      <span className="meter__reset">{resetText || ' '}</span>
    </div>
  );
}
