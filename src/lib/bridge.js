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
    setPanelHeight: () => {},
    addAccount: async () => ({ ok: false }),
    removeAccount: async () => ({ ok: false }),
    relogin: async () => ({ ok: false }),
    refresh: async () => true,
    quit: () => {},
  };
}

export const bridge = typeof window !== 'undefined' && window.island ? window.island : mockBridge();
