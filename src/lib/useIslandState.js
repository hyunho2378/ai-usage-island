import { useEffect, useState } from 'react';
import { bridge } from './bridge.js';

export function useIslandState() {
  const [state, setState] = useState(null);
  useEffect(() => {
    let alive = true;
    bridge.getState().then((s) => alive && setState(s));
    const off = bridge.onState((s) => setState(s));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

// 남은 시간 글자를 1분마다 다시 그린다.
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
