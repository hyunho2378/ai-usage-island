import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Meter from './Meter.jsx';
import IconButton from './IconButton.jsx';
import TextButton from './TextButton.jsx';
import { resetText } from '../lib/format.js';

// 계정 한 줄: 이름과 요금제, 그 아래 5시간과 주간 사용률
export default function AccountRow({ account, now, onRelogin, onRemove, interactive = true }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return undefined;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  const u = account.usage;
  const loading = account.status === 'loading' && !u;

  let body;
  if (account.status === 'needLogin') {
    body = (
      <div className="row__notice">
        <span className="row__notice-text">
          {interactive ? '로그인이 풀렸어요.' : '로그인이 풀렸어요. 노치 패널에서 다시 로그인해 주세요.'}
        </span>
        {interactive ? <TextButton onClick={onRelogin}>다시 로그인</TextButton> : null}
      </div>
    );
  } else if (account.status === 'noAccess' && !u) {
    body = (
      <div className="row__notice">
        <span className="row__notice-text">
          {`이 계정은 사용량을 볼 수 없어요.${account.noAccessHint ? ` ${account.noAccessHint}` : ''}`}
        </span>
      </div>
    );
  } else {
    body = (
      <div className="row__meters">
        <Meter name={(u && u.primary && u.primary.label) || '5시간'} bucket={u && u.primary} resetText={resetText(u && u.primary, now)} loading={loading} />
        {loading || (u && u.secondary) ? (
          <Meter name={(u && u.secondary && u.secondary.label) || '주간'} bucket={u && u.secondary} resetText={resetText(u && u.secondary, now)} loading={loading} />
        ) : null}
      </div>
    );
  }

  return (
    <li className="row">
      <div className="row__head">
        <span className="row__label">{account.label}</span>
        <span className="row__service">{account.providerName}</span>
        {account.plan ? <span className="row__plan">{account.plan}</span> : null}
        {account.status === 'offline' ? <span className="row__flag">연결 안 됨</span> : null}
        {interactive ? (
        <span className="row__actions">
          {confirming ? (
            <TextButton variant="danger" onClick={onRemove}>
              삭제
            </TextButton>
          ) : (
            <IconButton label={`${account.label} 계정 빼기`} onClick={() => setConfirming(true)}>
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          )}
        </span>
        ) : null}
      </div>
      {body}
    </li>
  );
}
