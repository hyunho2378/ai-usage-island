import { createRoot } from 'react-dom/client';
import { applyTokens } from '../tokens.js';
import '../styles/base.css';
import '../styles/panel.css';
import PanelApp from './PanelApp.jsx';

applyTokens({ surface: 'panel' });
createRoot(document.getElementById('root')).render(<PanelApp />);
