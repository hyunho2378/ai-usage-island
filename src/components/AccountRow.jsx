import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Meter from './Meter.jsx';
import IconButton from './IconButton.jsx';
import TextButton from './TextButton.jsx';
import { resetIn, resetAt } from '../lib/format.js';

// 계정 한 줄: 이름과 요금제, 그 아래 5시간과 주간 사용률
export default function AccountRow({ account, now, onRelogin, onRemove }) {
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
        <span className="row__notice-text">로그인이 풀렸어요.</span>
        <TextButton onClick={onRelogin}>다시 로그인</TextButton>
      </div>
    );
  } else if (account.status === 'noAccess' && !u) {
    body = (
      <div className="row__notice">
        <span className="row__notice-text">이 계정은 사용량을 볼 수 없어요. 팀 관리자가 사용량 보기를 꺼 두었을 수 있어요.</span>
      </div>
    );
  } else {
    body = (
      <div className="row__meters">
        <Meter name="5시간" bucket={u && u.fiveHour} resetText={u && u.fiveHour ? resetIn(u.fiveHour.resetsAt, now) : ''} loading={loading} />
        <Meter name="주간" bucket={u && u.weekly} resetText={u && u.weekly ? resetAt(u.weekly.resetsAt, now) : ''} loading={loading} />
      </div>
    );
  }

  return (
    <li className="row">
      <div className="row__head">
        <span className="row__label">{account.label}</span>
        {account.plan ? <span className="row__plan">{account.plan}</span> : null}
        {account.status === 'offline' ? <span className="row__flag">연결 안 됨</span> : null}
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
      </div>
      {body}
    </li>
  );
}
