# AI Usage Island

맥 화면 위 가운데(노치 자리)에 붙어서 Claude, ChatGPT, Gemini 계정별 사용 한도를 보여주는 맥 앱입니다.

- 접힌 상태: 계정마다 고리 하나(짧은 한도 사용률), 옆에 가장 많이 쓴 계정의 퍼센트
- 누르면: 아래로 패널이 열리고 계정마다 5시간, 주간 사용률과 초기화 시각이 보입니다. 계정이 5개 이상이면 두 줄로 놓입니다.
- 다른 곳을 누르거나 Esc 를 누르면 닫힙니다. 단축키 Control + Option + C 로도 열고 닫습니다.
- 3분마다 새로 불러오고, 패널을 열 때도 새로 불러옵니다.
- 노치가 없는 모니터에서도 화면 위 가운데에 붙습니다.

## 읽는 한도

| 서비스 | 짧은 한도 | 긴 한도 |
| --- | --- | --- |
| Claude | 5시간 | 주간 |
| ChatGPT | 5시간 (무료 계정은 30일 하나) | 주간 |
| Gemini | 5시간 | 주간 |

ChatGPT 는 Codex 사용 한도, Gemini 는 gemini.google.com/usage 에 나오는 한도입니다.

## 설치

1. [Releases](https://github.com/hyunho2378/ai-usage-island/releases/latest) 에서 `AI-Usage-Island-버전-arm64.dmg` 를 받습니다.
2. 열어서 AI Usage Island 를 응용 프로그램 폴더로 옮깁니다.
3. 개발자 서명이 없는 앱이라 처음 한 번은 막힙니다. 터미널에서 아래 한 줄을 실행한 뒤 엽니다.

```
xattr -cr "/Applications/AI Usage Island.app"
```

Apple 실리콘 맥(M1 이후)용입니다. 예전 이름(Claude Island)으로 깔았다면 그 앱은 지워도 됩니다. 추가해 둔 계정은 새 앱이 처음 켜질 때 옮겨 옵니다.

## 계정 추가

1. 아일랜드를 누르고 패널 오른쪽 위 `+` 를 누른 뒤 Claude, ChatGPT, Gemini 중 하나를 고릅니다.
2. 로그인 창이 뜹니다. 계정마다 저장공간이 따로라서 같은 서비스 계정 여러 개를 동시에 로그인해 둘 수 있습니다.
3. 구글 로그인이 막히면 이메일과 메일 코드로 들어갑니다.
4. Claude 팀(Team) 계정은 팀 관리자가 사용량 보기를 꺼 두면 값이 나오지 않습니다.

로그인 정보는 앱이 따로 저장하지 않고, 계정별 브라우저 저장공간(맥 키체인으로 암호화)에만 남습니다. 계정을 빼면 그 저장공간도 지웁니다.

## 바탕화면 카드

- 같은 내용의 카드가 바탕화면에 위젯처럼 깔립니다. 다른 창 뒤, 배경 위에 놓입니다.
- 맥의 바탕화면 높이에 놓인 창은 클릭을 받지 못해서 카드는 보기 전용입니다. 새로 불러오기, 계정 추가, 다시 로그인은 패널에서 합니다.
- 패널 아래쪽 `바탕화면 카드` 줄에서 `옮기기`, `끄기`, `켜기` 를 고릅니다.

## 직접 빌드

```
npm install
npm start        # 바로 실행
npm run dist     # release 폴더에 dmg, zip 생성
npm run dev      # 브라우저 미리보기 (http://localhost:5173/preview.html)
```

노치 폭이 맞지 않으면 `ISLAND_NOTCH_WIDTH=190 npm start` 처럼 값을 바꿔 봅니다.

## 알아 둘 점

- 사용량은 각 서비스의 사용량 화면이 쓰는 주소에서 읽습니다. 공개 문서가 없는 주소라서 서비스가 바꾸면 그 서비스만 멈출 수 있습니다.
- Anthropic, OpenAI, Google 과 관계없는 개인 도구입니다.

## 함께 쓴 오픈소스

- [Electron](https://www.electronjs.org/), [React](https://react.dev/), [Vite](https://vite.dev/)
- [NumberFlow](https://number-flow.barvian.me/) 퍼센트 숫자 전환
- [Lucide](https://lucide.dev/) 아이콘
- [CodexBar](https://github.com/steipete/CodexBar) Gemini 사용량 요청 형식 참고 (MIT)
- [Claude Usage Tracker](https://github.com/hamed-elfayome/Claude-Usage-Tracker) Claude 사용량 주소 참고 (MIT)
- [electron-dynamic-island](https://github.com/IrtizaNasar/electron-dynamic-island) 화면 위 창 배치 방식 참고 (MIT)
- 글자 크기, 행간, 막대 수치는 Apple iOS UI Kit 값을 따랐습니다.

## 라이선스

MIT
