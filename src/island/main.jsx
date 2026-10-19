import { createRoot } from 'react-dom/client';
import { applyTokens } from '../tokens.js';
import '../styles/base.css';
import '../styles/island.css';
import IslandApp from './IslandApp.jsx';

applyTokens({ surface: 'island' });
createRoot(document.getElementById('root')).render(<IslandApp />);
