import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import ServiceLogo from './ServiceLogo.jsx';
import { bridge } from '../lib/bridge.js';

export const SERVICES = [
  { id: 'claude', name: 'Claude' },
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'gemini', name: 'Gemini' },
];

const FAIL = {
  keychain: '맥이 브라우저 키 사용을 허락하지 않았어요. 다시 골라서 "허용"을 눌러 주세요.',
  failed: '가져오지 못했어요. 그 브라우저에서 로그아웃됐을 수 있어요. 직접 로그인해 주세요.',
};

// 계정 추가 메뉴. 한 상자 안에서 서비스를 고르고, 그다음 가져올 브라우저 프로필이나 직접 로그인을 고른다.
export default function ServiceChooser({ onDone }) {
  const [service, setService] = useState(null);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (service) setService(null);
      else if (onDone) onDone();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [service, onDone]);

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

  return (
    <div className="menu" role="menu" aria-label="계정 추가">
      {!service ? (
        SERVICES.map((s) => (
          <button key={s.id} type="button" role="menuitem" className="menu__item" onClick={() => pick(s)}>
            <ServiceLogo provider={s.id} size="menu" />
            <span className="menu__text">{s.name}</span>
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="menu__chevron" />
          </button>
        ))
      ) : (
        <>
          <button type="button" role="menuitem" className="menu__item menu__item--back" onClick={() => setService(null)}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            <ServiceLogo provider={service.id} size="menu" />
            <span className="menu__text">{service.name}</span>
          </button>
          {list == null ? <p className="menu__note">로그인된 브라우저를 찾는 중</p> : null}
          {(list || []).map((c) => {
            const key = `${c.browser}/${c.profile}`;
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                className="menu__item"
                onClick={() => take(c)}
                disabled={Boolean(busy)}
              >
                <span className="menu__text">{c.browserName}</span>
                <span className="menu__sub">{busy === key ? '가져오는 중' : c.profileName}</span>
              </button>
            );
          })}
          <button type="button" role="menuitem" className="menu__item" onClick={direct} disabled={Boolean(busy)}>
            <LogIn size={16} strokeWidth={2} aria-hidden="true" />
            <span className="menu__text">직접 로그인</span>
          </button>
          {error ? <p className="menu__note menu__note--error">{error}</p> : null}
        </>
      )}
    </div>
  );
}
