import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, RotateCw } from 'lucide-react';
import { bridge } from '../lib/bridge.js';
import { useIslandState, useNow } from '../lib/useIslandState.js';
import UsageList from '../components/UsageList.jsx';
import ServiceChooser from '../components/ServiceChooser.jsx';
import IconButton from '../components/IconButton.jsx';

// 아일랜드에 포인터를 올리면 열리는 패널. 계정이 다 한 화면에 보이게 한다.
export default function PanelApp() {
  const state = useIslandState();
  const now = useNow();
  const ref = useRef(null);
  const [enterKey, setEnterKey] = useState(0);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => bridge.onPanelShown(() => setEnterKey((k) => k + 1)), []);
  useEffect(
    () =>
      bridge.onPanelOpen((v) => {
        if (!v) setChoosing(false);
      }),
    [],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') bridge.hidePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 내용 크기에 맞춰 창 크기를 바꾼다.
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(() => {
      const r = ref.current.getBoundingClientRect();
      bridge.setPanelSize(Math.ceil(r.width), Math.ceil(r.height));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [state ? state.accounts.length : 0]);

  if (!state) return null;
  const { accounts, refreshing } = state;

  return (
    <main ref={ref} className={`panel${accounts.length > 4 ? ' panel--wide' : ''}`} aria-label="AI 계정별 사용량">
      <div key={enterKey} className="panel__inner">
        <header className="panel__header">
          <h1 className="panel__title">AI 사용량</h1>
          <span className="panel__tools">
            <IconButton label="지금 새로 불러오기" onClick={() => bridge.refresh()} spinning={refreshing}>
              <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
            </IconButton>
            <IconButton label="계정 추가" onClick={() => setChoosing((v) => !v)}>
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          </span>
        </header>

        {choosing && accounts.length > 0 ? <ServiceChooser onDone={() => setChoosing(false)} /> : null}

        <UsageList accounts={accounts} now={now} interactive />
      </div>
    </main>
  );
}
