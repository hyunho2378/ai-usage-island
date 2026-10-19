import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, RotateCw } from 'lucide-react';
import { bridge } from '../lib/bridge.js';
import { useIslandState, useNow } from '../lib/useIslandState.js';
import { updatedText } from '../lib/format.js';
import UsageList from '../components/UsageList.jsx';
import IconButton from '../components/IconButton.jsx';
import TextButton from '../components/TextButton.jsx';

const SHORTCUT_LABEL = '⌃⌥C';

// 리퀴드 글래스 패널. 계정 4개가 스크롤 없이 한 화면에 다 보이게 한다.
export default function PanelApp() {
  const state = useIslandState();
  const now = useNow();
  const ref = useRef(null);
  const [enterKey, setEnterKey] = useState(0);

  useEffect(() => bridge.onPanelShown(() => setEnterKey((k) => k + 1)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') bridge.hidePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 내용 높이에 맞춰 창 높이를 바꾼다.
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(() => {
      bridge.setPanelHeight(Math.ceil(ref.current.getBoundingClientRect().height));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [state ? state.accounts.length : 0]);

  if (!state) return null;
  const { accounts, refreshing, lastRefresh } = state;
  const widget = state.widget || { enabled: false, moving: false };

  return (
    <main ref={ref} className="panel" aria-label="Claude 계정별 사용량">
      <div key={enterKey} className="panel__inner">
        <header className="panel__header">
          <h1 className="panel__title">Claude 사용량</h1>
          <span className="panel__tools">
            <IconButton label="지금 새로 불러오기" onClick={() => bridge.refresh()} spinning={refreshing}>
              <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
            </IconButton>
            <IconButton label="계정 추가" onClick={() => bridge.addAccount()}>
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          </span>
        </header>

        <UsageList accounts={accounts} now={now} interactive />

        <section className="setting" aria-label="바탕화면 카드">
          <span className="setting__label">바탕화면 카드</span>
          <span className="setting__actions">
            {widget.enabled ? (
              <>
                <TextButton onClick={() => bridge.moveWidget()}>옮기기</TextButton>
                <TextButton onClick={() => bridge.setWidgetEnabled(false)}>끄기</TextButton>
              </>
            ) : (
              <TextButton onClick={() => bridge.setWidgetEnabled(true)}>켜기</TextButton>
            )}
          </span>
        </section>

        <footer className="panel__footer">
          <span className="panel__meta">
            {refreshing ? '불러오는 중' : updatedText(lastRefresh, now)}
          </span>
          <span className="panel__meta panel__meta--quiet">열고 닫기 {SHORTCUT_LABEL}</span>
          <TextButton onClick={() => bridge.quit()}>종료</TextButton>
        </footer>
      </div>
    </main>
  );
}
