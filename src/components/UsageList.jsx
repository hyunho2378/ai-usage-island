import AccountRow from './AccountRow.jsx';
import TextButton from './TextButton.jsx';
import { bridge } from '../lib/bridge.js';

// 계정 목록. 패널(누를 수 있음)과 바탕화면 카드(보기 전용)가 같이 쓴다.
export default function UsageList({ accounts, now, interactive }) {
  if (accounts.length === 0) {
    return (
      <section className="empty">
        <h2 className="empty__title">계정을 추가해 주세요.</h2>
        <p className="empty__body">
          {interactive
            ? 'Claude에 로그인하면 계정마다 5시간 사용량과 주간 사용량이 여기에 보여요.'
            : '노치의 아일랜드를 누르고 계정 추가를 눌러 주세요.'}
        </p>
        {interactive ? (
          <TextButton variant="strong" onClick={() => bridge.addAccount()}>
            계정 추가
          </TextButton>
        ) : null}
      </section>
    );
  }
  return (
    <ul className="rows">
      {accounts.map((a) => (
        <AccountRow
          key={a.id}
          account={a}
          now={now}
          interactive={interactive}
          onRelogin={() => bridge.relogin(a.id)}
          onRemove={() => bridge.removeAccount(a.id)}
        />
      ))}
    </ul>
  );
}
