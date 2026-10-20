import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { bridge } from '../lib/bridge.js';
import { useIslandState } from '../lib/useIslandState.js';
import { topAccount } from '../lib/format.js';
import { levelOf } from '../tokens.js';
import ServiceLogo from '../components/ServiceLogo.jsx';

// 접힌 아일랜드: 왼쪽에 가장 많이 쓴 계정의 서비스 로고, 오른쪽에 그 계정의 짧은 한도 사용률.
// 포인터를 올리면 패널이 열린다 (열고 닫기는 메인 프로세스가 포인터 위치로 판단한다).
export default function IslandApp() {
  const state = useIslandState();
  const [open, setOpen] = useState(false);
  useEffect(() => bridge.onPanelOpen((v) => setOpen(Boolean(v))), []);
  if (!state) return null;

  const { geometry, accounts } = state;
  const top = topAccount(accounts);
  const notch = geometry.mode === 'notch';
  const style = {
    '--island-h': `${geometry.height}px`,
    '--wing': `${geometry.wing}px`,
    ...(notch ? { '--notch-w': `${geometry.notchWidth}px` } : {}),
  };

  const leading = top ? (
    <ServiceLogo provider={top.provider} size="island" />
  ) : accounts.length ? (
    <ServiceLogo provider={accounts[0].provider} size="island" />
  ) : (
    <Plus size={16} strokeWidth={2.5} aria-hidden="true" className="island__plus" />
  );

  return (
    <div
      className={`island island--${geometry.mode}${open ? ' island--open' : ''}`}
      style={style}
      role="button"
      tabIndex={-1}
      aria-label="AI 사용량, 포인터를 올리면 열려요"
      aria-expanded={open}
    >
      <span className="island__content">
        <span className="island__leading">{leading}</span>
        {notch ? <span className="island__notch" aria-hidden="true" /> : null}
        <span className="island__trailing">
          {top ? <span className={`island__value island__value--${levelOf(top.pct)}`}>{top.pct}%</span> : null}
        </span>
      </span>
    </div>
  );
}
