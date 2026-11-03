import { setView } from '../ui.js';
export function render() { setView('<div class="panel">Settings soon</div>'); }
export async function handleImportLink() { location.hash = '#/'; }
