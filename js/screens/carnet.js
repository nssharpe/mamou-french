import { setView } from '../ui.js';
import { topbar } from './common.js';
export function render({ pid }) { setView((pid ? topbar(pid) : '') + '<div class="panel">Bientôt ! (coming soon)</div>'); }
export const play = render;
