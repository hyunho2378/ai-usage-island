import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { bridge } from '../lib/bridge.js';
import { useIslandState } from '../lib/useIslandState.js';
import { topAccount } from '../lib/format.js';
import { levelOf } from '../tokens.js';
import MiniRing from '../components/MiniRing.jsx';

// 접힌 아일랜드. 노치 왼쪽에는 계정마다 고리 하나, 오른쪽에는 가장 많이 쓴 계정의 5시간 사용률.
export default function IslandApp() {
  const state = useIslandState();
  const [open, setOpen] = useState(false);
  useEffect(() => bridge.onPanelOpen((v) => setOpen(Boolean(v))), []);
  if (!state) return null;

  const { geometry, accounts } = state;
  const top = topAccount(accounts);
  const notch = geometry.mode === 'notch';
  const style = notch
    ? { '--notch-w': `${geometry.notchWidth}px`, '--island-h': `${geometry.height}px` }
    : { '--island-h': `${geometry.height}px` };

  const rings = accounts.length ? (
    accounts.map((a) => (
      <MiniRing
        key={a.id}
        pct={a.usage && a.usage.fiveHour ? a.usage.fiveHour.pct : null}
        label={`${a.label} 5시간 ${a.usage && a.usage.fiveHour ? a.usage.fiveHour.pct : '값 없음'}%`}
      />
    ))
  ) : (
    <Plus size={16} strokeWidth={2.5} aria-hidden="true" className="island__plus" />
  );

  const value = top ? (
    <span className={`island__value island__value--${levelOf(top.pct)}`}>{top.pct}%</span>
  ) : null;

  return (
    <button
      type="button"
      className={`island island--${geometry.mode}${open ? ' island--open' : ''}`}
      style={style}
      aria-label="Claude 사용량 열기"
      aria-expanded={open}
      onClick={() => bridge.togglePanel()}
    >
      <span className="island__content">
        <span className="island__leading">{rings}</span>
        {notch ? <span className="island__notch" aria-hidden="true" /> : null}
        <span className="island__trailing">{value}</span>
      </span>
    </button>
  );
}
