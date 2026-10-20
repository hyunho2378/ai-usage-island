import claude from '../assets/logos/claude.svg';
import chatgpt from '../assets/logos/chatgpt.svg';
import gemini from '../assets/logos/gemini.svg';

const LOGOS = { claude, chatgpt, gemini };
const NAMES = { claude: 'Claude', chatgpt: 'ChatGPT', gemini: 'Gemini' };

// 서비스 로고. 사용자 로고 폴더(12. 각종 로고)의 파일을 그대로 쓴다.
export default function ServiceLogo({ provider, size = 'row' }) {
  const src = LOGOS[provider];
  if (!src) return null;
  return <img className={`logo logo--${size}`} src={src} alt={NAMES[provider]} draggable="false" />;
}
