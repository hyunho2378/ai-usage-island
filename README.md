# Claude Island

맥북 노치 자리에 붙어서 Claude 계정 여러 개의 5시간 사용량과 주간 사용량을 보여주는 맥 앱입니다.

- 접힌 상태: 노치 왼쪽에 계정마다 고리 하나(5시간 사용률), 오른쪽에 가장 많이 쓴 계정의 퍼센트
- 누르면: 아래로 검정 패널이 열리고 계정마다 5시간, 주간 사용률과 초기화 시각이 보입니다.
- 다른 곳을 누르거나 Esc 를 누르면 닫힙니다. 단축키 Control + Option + C 로도 열고 닫습니다.
- 3분마다 새로 불러오고, 패널을 열 때도 새로 불러옵니다.
- 노치가 없는 모니터에서도 화면 위 가운데에 붙습니다 (위는 화면 끝, 아래 모서리만 둥근 모양).

## 바탕화면 카드

- 같은 내용의 검정 카드가 바탕화면에 위젯처럼 깔립니다. 다른 창 뒤, 배경 위에 놓입니다.
- 맥의 바탕화면 높이에 놓인 창은 클릭을 받지 못해서 카드는 보기 전용입니다. 새로 불러오기, 계정 추가, 다시 로그인은 노치 패널에서 합니다.
- 노치 패널 아래쪽 `바탕화면 카드` 줄에서 `옮기기`, `끄기`, `켜기` 를 고릅니다. 옮기기를 누르면 카드를 끌어 옮긴 뒤 `여기에 두기` 를 누릅니다.

## 설치

1. [Releases](https://github.com/hyunho2378/claude-island/releases/latest) 에서 `Claude-Island-버전-arm64.dmg` 를 받습니다.
2. 열어서 Claude Island 를 응용 프로그램 폴더로 옮깁니다.
3. 개발자 서명이 없는 앱이라 처음 한 번은 막힙니다. 터미널에서 아래 한 줄을 실행한 뒤 엽니다.

```
xattr -cr "/Applications/Claude Island.app"
```

Apple 실리콘 맥(M1 이후)용입니다.

## 계정 추가

1. 노치의 아일랜드를 누르고 패널 오른쪽 위 `+` 를 누릅니다.
2. Claude 로그인 창이 뜹니다. 계정마다 저장공간이 따로라서 4개 계정을 동시에 로그인해 둘 수 있습니다.
3. 구글 로그인이 막히면 이메일 칸에 같은 주소를 넣고 메일로 받은 코드로 들어갑니다.
4. 팀(Team) 계정은 팀 관리자가 사용량 보기를 꺼 두면 값이 나오지 않습니다.

로그인 정보는 앱이 따로 저장하지 않고, 계정별 브라우저 저장공간(맥 키체인으로 암호화)에만 남습니다. 계정을 빼면 그 저장공간도 지웁니다.

## 직접 빌드

```
npm install
npm start        # 바로 실행
npm run dist     # release 폴더에 dmg, zip 생성
npm run dev      # 브라우저 미리보기 (http://localhost:5173/preview.html)
```

노치 폭이 맞지 않으면 `ISLAND_NOTCH_WIDTH=190 npm start` 처럼 값을 바꿔 봅니다.

## 알아 둘 점

- 사용량은 claude.ai 설정의 사용량 화면이 쓰는 주소에서 읽습니다. 공개 문서가 없는 주소라서 Anthropic 이 바꾸면 동작이 멈출 수 있습니다.
- Anthropic 과 관계없는 개인 도구입니다.

## 함께 쓴 오픈소스

- [Electron](https://www.electronjs.org/), [React](https://react.dev/), [Vite](https://vite.dev/)
- [NumberFlow](https://number-flow.barvian.me/) 퍼센트 숫자 전환
- [Lucide](https://lucide.dev/) 아이콘
- [Claude Usage Tracker](https://github.com/hamed-elfayome/Claude-Usage-Tracker) 사용량 주소와 응답 구조 참고 (MIT)
- [electron-dynamic-island](https://github.com/IrtizaNasar/electron-dynamic-island) 노치 위 창 배치 방식 참고 (MIT)
- 색, 글자 크기, 행간, 막대 수치는 Apple iOS UI Kit 값을 따랐습니다.

## 라이선스

MIT
