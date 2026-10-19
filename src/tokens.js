// 클로드 아일랜드 디자인 토큰. UI.md 와 이 파일이 다르면 작업을 멈추고 둘을 함께 맞춘다.
// 값의 출처: 피그마 "네이버 산학 UI 디자인" 파일의 Apple iOS UI Kit 페이지
//   Colors(5707:28659) 라이트, 다크 값
//   Text Styles(5418:17464) 크기, 행간, 자간, 굵기
//   Progress Indicators(5433:20248) 막대 바탕 색과 높이 4
//   Status bar 안의 Dynamic Island(10465:42998) 불투명 검정, 완전 둥근 모서리

// 아일랜드는 화면 모드와 관계없이 검정이다. (HIG: 다이나믹 아일랜드는 불투명 검정 바탕)
export const islandColor = {
  island: '#000000',
  textPrimary: '#FFFFFF',
  track: 'rgba(120, 120, 128, 0.36)',
  ok: '#30D158',
  warn: '#FF9230',
  danger: '#FF4245',
  focus: '#0091FF',
};

// 펼친 패널의 색. 아일랜드와 같은 검정 바탕에 iOS 다크 값을 쓴다.
export const panelColor = {
  surface: '#000000',
  textPrimary: '#FFFFFF',
  textInverse: '#000000',
  textSecondary: 'rgba(235, 235, 245, 0.70)',
  textTertiary: 'rgba(235, 235, 245, 0.30)',
  track: 'rgba(120, 120, 128, 0.36)',
  // 버튼 바탕: iOS 키트 Liquid Glass 다크의 채움을 검정 위에 옮긴 값
  glass: 'rgba(255, 255, 255, 0.12)',
  glassPressed: 'rgba(255, 255, 255, 0.20)',
  ok: '#30D158',
  warn: '#FF9230',
  danger: '#FF4245',
  focus: '#0091FF',
};

// 사용률 구간. 이 퍼센트 이상이면 해당 색.
export const threshold = { warn: 70, danger: 90 };

// iOS Text Styles 값 그대로 (px). 모든 글자에 행간을 직접 지정한다. 기본 행간은 쓰지 않는다.
export const type = {
  familyText: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Apple SD Gothic Neo", sans-serif',
  familyNumber: 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, sans-serif',
  title2: { size: 22, line: 28, track: -0.26, weight: 700 },
  title3: { size: 20, line: 25, track: -0.45, weight: 590 },
  headline: { size: 17, line: 22, track: -0.43, weight: 590 },
  callout: { size: 16, line: 21, track: -0.31, weight: 400 },
  subheadline: { size: 15, line: 20, track: -0.23, weight: 590 },
  footnote: { size: 13, line: 18, track: -0.08, weight: 400 },
  footnoteStrong: { size: 13, line: 18, track: -0.08, weight: 590 },
  caption1: { size: 12, line: 16, track: 0, weight: 400 },
};

// 4의 배수 간격
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 };

// 반경은 이 네 단계만 쓴다. 패널 28 = 안쪽 여백 16 + 버튼 12 (동심 배치)
export const radius = { bar: 999, control: 12, compact: 16, panel: 28 };

export const size = {
  icon: 16,
  iconButton: 32,
  barHeight: 4,
  miniRing: 14,
  miniRingStroke: 2.5,
  meter: 55, // 사용률 하나의 높이: 숫자 25 + 4 + 막대 4 + 4 + 초기화 글자 18
  wing: 108, // 접힌 아일랜드에서 노치 양옆 날개 폭 (고리 4개 14 + 사이 12 x 3 + 노치 쪽 여백 8)
  ringGap: 12,
  panelWidth: 440,
};

export const motion = {
  enter: 320,
  fade: 160,
  press: 120,
  spin: 900,
  easeOut: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

function setVars(root, prefix, obj) {
  Object.entries(obj).forEach(([k, v]) => root.style.setProperty(`--${prefix}-${k}`, String(v)));
}

// 토큰을 CSS 변수로 바꿔 넣는다. CSS 파일은 변수만 참조한다.
export function applyTokens({ surface }) {
  const root = document.documentElement;
  setVars(root, 'c', surface === 'island' ? islandColor : panelColor);
  root.style.setProperty('--f-text', type.familyText);
  root.style.setProperty('--f-number', type.familyNumber);
  Object.entries(type).forEach(([k, v]) => {
    if (typeof v !== 'object') return;
    root.style.setProperty(`--t-${k}-size`, `${v.size}px`);
    root.style.setProperty(`--t-${k}-line`, `${v.line}px`);
    root.style.setProperty(`--t-${k}-track`, `${v.track}px`);
    root.style.setProperty(`--t-${k}-weight`, String(v.weight));
  });
  Object.entries(space).forEach(([k, v]) => root.style.setProperty(`--s-${k}`, `${v}px`));
  Object.entries(radius).forEach(([k, v]) => root.style.setProperty(`--r-${k}`, `${v}px`));
  Object.entries(size).forEach(([k, v]) => root.style.setProperty(`--z-${k}`, `${v}px`));
  root.style.setProperty('--m-enter', `${motion.enter}ms`);
  root.style.setProperty('--m-fade', `${motion.fade}ms`);
  root.style.setProperty('--m-press', `${motion.press}ms`);
  root.style.setProperty('--m-spin', `${motion.spin}ms`);
  root.style.setProperty('--m-easeOut', motion.easeOut);
}

export function levelOf(pct) {
  if (pct == null) return 'none';
  if (pct >= threshold.danger) return 'danger';
  if (pct >= threshold.warn) return 'warn';
  return 'ok';
}
