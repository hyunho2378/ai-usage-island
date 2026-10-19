import { useLayoutEffect, useRef } from 'react';
import { bridge } from '../lib/bridge.js';
import { useIslandState, useNow } from '../lib/useIslandState.js';
import { updatedText } from '../lib/format.js';
import UsageList from '../components/UsageList.jsx';
import TextButton from '../components/TextButton.jsx';

// 바탕화면 카드. 평소에는 보기 전용이고, 옮기기 중에만 끌어서 옮기고 버튼 하나를 누른다.
export default function WidgetApp() {
  const state = useIslandState();
  const now = useNow();
  const ref = useRef(null);
  const moving = new URLSearchParams(window.location.search).get('move') === '1';

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(() => {
      const r = ref.current.getBoundingClientRect();
      bridge.setWidgetSize(Math.ceil(r.width), Math.ceil(r.height));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [state ? state.accounts.length : 0]);

  if (!state) return null;
  const { accounts, refreshing, lastRefresh } = state;

  return (
    <main
      ref={ref}
      className={`panel card${accounts.length > 4 ? ' panel--wide' : ''}${moving ? ' card--moving' : ''}`}
      aria-label="AI 계정별 사용량 카드"
    >
      <header className="panel__header">
        <h1 className="panel__title">AI 사용량</h1>
        <span className="panel__meta">{refreshing ? '불러오는 중' : updatedText(lastRefresh, now)}</span>
      </header>

      <UsageList accounts={accounts} now={now} interactive={false} />

      {moving ? (
        <footer className="panel__footer card__move">
          <span className="panel__meta">끌어서 옮긴 뒤 눌러 주세요.</span>
          <TextButton variant="strong" onClick={() => bridge.placeWidget()}>
            여기에 두기
          </TextButton>
        </footer>
      ) : null}
    </main>
  );
}
