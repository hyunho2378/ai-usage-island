// 브라우저 미리보기 전용 가짜 데이터. 앱(Electron)에서는 쓰지 않는다.
// 주소 뒤에 ?state=ok | mixed | empty | loading 을 붙여 상태를 바꿔 본다.
const H = 3600 * 1000;

function acc(id, label, plan, five, week, fiveInH, weekInH, status = 'ok') {
  const now = Date.now();
  return {
    id,
    label,
    email: `${label}@example.com`,
    plan,
    status,
    updatedAt: now - 60 * 1000,
    usage:
      five == null
        ? null
        : {
            fiveHour: { pct: five, resetsAt: new Date(now + fiveInH * H).toISOString() },
            weekly: { pct: week, resetsAt: new Date(now + weekInH * H).toISOString() },
          },
  };
}

export function mockState(kind = 'ok', mode = 'notch') {
  const base = {
    geometry: mode === 'notch'
      ? { mode: 'notch', notchWidth: 200, height: 37, wing: 108 }
      : { mode: 'pill', notchWidth: 0, height: 34, wing: 108 },
    refreshing: false,
    lastRefresh: Date.now() - 60 * 1000,
    shortcut: 'Control+Option+C',
  };
  if (kind === 'empty') return { ...base, accounts: [] };
  if (kind === 'loading') {
    return {
      ...base,
      refreshing: true,
      accounts: [1, 2, 3, 4].map((n) => ({ id: `m${n}`, label: `미리보기 ${n}`, plan: '', status: 'loading', usage: null })),
    };
  }
  if (kind === 'mixed') {
    return {
      ...base,
      accounts: [
        acc('m1', '미리보기 1', 'Max 5x', 34, 12, 1.7, 100),
        acc('m2', '미리보기 2', 'Max 5x', 93, 71, 0.4, 52),
        acc('m3', '미리보기 3', 'Max 20x', null, null, 0, 0, 'needLogin'),
        acc('m4', '미리보기 4', 'Team', null, null, 0, 0, 'noAccess'),
      ],
    };
  }
  return {
    ...base,
    accounts: [
      acc('m1', '미리보기 1', 'Max 5x', 34, 12, 1.7, 100),
      acc('m2', '미리보기 2', 'Max 5x', 76, 48, 3.2, 52),
      acc('m3', '미리보기 3', 'Max 20x', 8, 3, 4.6, 140),
      acc('m4', '미리보기 4', 'Team', 93, 71, 0.4, 20),
    ],
  };
}
