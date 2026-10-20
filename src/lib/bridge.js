// 앱 안에서는 preload 가 넣어 준 window.island 를 쓰고, 브라우저 미리보기에서는 가짜 데이터를 쓴다.
import { mockState } from './mock.js';

function mockBridge() {
  const params = new URLSearchParams(window.location.search);
  const state = mockState(params.get('state') || 'ok', params.get('mode') || 'notch');
  const noop = () => () => {};
  return {
    preview: true,
    getState: async () => state,
    onState: noop,
    onPanelShown: noop,
    onPanelOpen: noop,
    togglePanel: () => {},
    hidePanel: () => {},
    setPanelSize: () => {},
    setWidgetSize: () => {},
    setWidgetEnabled: () => {},
    moveWidget: () => {},
    placeWidget: () => {},
    addAccount: async () => ({ ok: false }),
    importCandidates: async (p) =>
      [
        { browser: 'aside', browserName: 'Aside', profile: 'Default', profileName: '현호' },
        { browser: 'whale', browserName: '웨일', profile: 'Default', profileName: '사용자 이름 1' },
      ].concat(p === 'gemini' ? [{ browser: 'whale', browserName: '웨일', profile: 'Profile 1', profileName: '사용자 이름 2' }] : []),
    importAccount: async () => ({ ok: false, reason: 'failed' }),
    removeAccount: async () => ({ ok: false }),
    relogin: async () => ({ ok: false }),
    refresh: async () => true,
    quit: () => {},
  };
}

export const bridge = typeof window !== 'undefined' && window.island ? window.island : mockBridge();
