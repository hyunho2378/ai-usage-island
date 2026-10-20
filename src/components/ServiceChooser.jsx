import { useState } from 'react';
import TextButton from './TextButton.jsx';
import ServiceLogo from './ServiceLogo.jsx';
import { bridge } from '../lib/bridge.js';

export const SERVICES = [
  { id: 'claude', name: 'Claude' },
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'gemini', name: 'Gemini' },
];

const FAIL = {
  keychain: '맥이 브라우저 키 사용을 허락하지 않았어요. 다시 눌러 "허용"을 골라 주세요.',
  failed: '가져오지 못했어요. 그 브라우저에서 로그아웃됐을 수 있어요. 직접 로그인해 주세요.',
};

// 계정 추가: 서비스를 고른 뒤, 이미 로그인된 브라우저(Aside, 웨일, Chrome)에서 가져오거나 직접 로그인한다.
export default function ServiceChooser({ label = '어느 서비스 계정인가요?', onDone }) {
  const [service, setService] = useState(null);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const pick = async (s) => {
    setService(s);
    setError('');
    setList(null);
    setList(await bridge.importCandidates(s.id));
  };

  const take = async (c) => {
    const key = `${c.browser}/${c.profile}`;
    setBusy(key);
    setError('');
    const r = await bridge.importAccount(service.id, c.browser, c.profile);
    setBusy('');
    if (r && r.ok) {
      if (onDone) onDone();
      return;
    }
    setError(FAIL[(r && r.reason) || 'failed'] || FAIL.failed);
  };

  const direct = () => {
    if (onDone) onDone();
    bridge.addAccount(service.id);
  };

  if (!service) {
    return (
      <div className="chooser" role="group" aria-label="계정 추가할 서비스">
        <span className="chooser__label">{label}</span>
        {SERVICES.map((s) => (
          <TextButton key={s.id} onClick={() => pick(s)}>
            {s.name}
          </TextButton>
        ))}
      </div>
    );
  }

  return (
    <div className="chooser chooser--source" role="group" aria-label={`${service.name} 계정 가져올 곳`}>
      <div className="chooser__head">
        <ServiceLogo provider={service.id} />
        <span className="chooser__label">
          {list == null ? '로그인된 브라우저를 찾는 중' : list.length ? '어디에 로그인된 계정을 가져올까요?' : '로그인된 브라우저가 없어요.'}
        </span>
        <TextButton onClick={() => setService(null)}>뒤로</TextButton>
      </div>
      <div className="chooser__options">
        {(list || []).map((c) => {
          const key = `${c.browser}/${c.profile}`;
          return (
            <TextButton key={key} onClick={() => take(c)} disabled={Boolean(busy)}>
              {busy === key ? '가져오는 중' : `${c.browserName} ${c.profileName}`}
            </TextButton>
          );
        })}
        <TextButton variant="strong" onClick={direct} disabled={Boolean(busy)}>
          직접 로그인
        </TextButton>
      </div>
      {error ? <p className="chooser__error">{error}</p> : null}
    </div>
  );
}
