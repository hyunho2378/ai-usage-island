// 브라우저 미리보기 전용 가짜 데이터. 앱(Electron)에서는 쓰지 않는다.
// 주소 뒤에 ?state=ok | many | mixed | empty | loading, &mode=notch | top | pill 을 붙여 바꿔 본다.
const H = 3600 * 1000;
const NAMES = { claude: 'Claude', chatgpt: 'ChatGPT', gemini: 'Gemini' };

function win(label, kind, pct, inH) {
  return { label, kind, pct, resetsAt: new Date(Date.now() + inH * H).toISOString() };
}

function acc(id, provider, label, plan, primary, secondary, status = 'ok') {
  return {
    id,
    provider,
    providerName: NAMES[provider],
    noAccessHint: provider === 'claude' ? '팀 관리자가 사용량 보기를 꺼 두었을 수 있어요.' : '',
    label,
    email: `${label}@example.com`,
    plan,
    status,
    updatedAt: Date.now() - 60 * 1000,
    usage: primary ? { primary, secondary } : null,
  };
}

const OK = [
  acc('m1', 'claude', '미리보기 1', 'Max 5x', win('5시간', 'session', 34, 1.7), win('주간', 'week', 12, 100)),
  acc('m2', 'claude', '미리보기 2', 'Max 5x', win('5시간', 'session', 76, 3.2), win('주간', 'week', 48, 52)),
  acc('m3', 'chatgpt', '미리보기 3', 'Plus', win('5시간', 'session', 8, 4.6), win('주간', 'week', 3, 140)),
  acc('m4', 'gemini', '미리보기 4', 'Pro', win('5시간', 'session', 93, 0.4), win('주간', 'week', 71, 20)),
];

const MORE = [
  acc('m5', 'claude', '미리보기 5', 'Team', win('5시간', 'session', 22, 2.1), win('주간', 'week', 40, 90)),
  acc('m6', 'chatgpt', '미리보기 6', 'Free', win('30일', 'long', 5, 700), null),
];

export function mockState(kind = 'ok', mode = 'notch') {
  const base = {
    geometry:
      mode === 'notch'
        ? { mode: 'notch', notchWidth: 200, height: 37, wing: 108 }
        : mode === 'top'
          ? { mode: 'top', notchWidth: 0, height: 32, wing: 108 }
          : { mode: 'pill', notchWidth: 0, height: 34, wing: 108 },
    widget: { enabled: true, moving: false },
    refreshing: false,
    lastRefresh: Date.now() - 60 * 1000,
    shortcut: 'Control+Option+C',
  };
  if (kind === 'empty') return { ...base, accounts: [] };
  if (kind === 'loading') {
    return {
      ...base,
      refreshing: true,
      accounts: OK.map((a) => ({ ...a, status: 'loading', usage: null })),
    };
  }
  if (kind === 'mixed') {
    return {
      ...base,
      accounts: [OK[0], OK[1], { ...OK[2], status: 'needLogin', usage: null }, { ...MORE[0], status: 'noAccess', usage: null }],
    };
  }
  if (kind === 'many') {
    const wing = 6 * 14 + 5 * 12 + 24;
    return { ...base, geometry: { ...base.geometry, wing }, accounts: [OK[0], OK[1], MORE[0], OK[2], MORE[1], OK[3]] };
  }
  return { ...base, accounts: OK };
}
