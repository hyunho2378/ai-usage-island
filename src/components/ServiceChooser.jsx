import TextButton from './TextButton.jsx';
import { bridge } from '../lib/bridge.js';

export const SERVICES = [
  { id: 'claude', name: 'Claude' },
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'gemini', name: 'Gemini' },
];

// 계정 추가: 어느 서비스에 로그인할지 고른다. OS 메뉴 대신 버튼 줄로 보여준다.
export default function ServiceChooser({ label = '어느 서비스 계정인가요?', onDone }) {
  return (
    <div className="chooser" role="group" aria-label="계정 추가할 서비스">
      <span className="chooser__label">{label}</span>
      {SERVICES.map((s) => (
        <TextButton
          key={s.id}
          variant="neutral"
          onClick={() => {
            if (onDone) onDone();
            bridge.addAccount(s.id);
          }}
        >
          {s.name}
        </TextButton>
      ))}
    </div>
  );
}
