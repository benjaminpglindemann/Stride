export function paceToSec(p: string): number {
  if (typeof p !== 'string' || !p.includes(':')) return 0;
  const [m, s] = p.split(':').map(Number);
  return m * 60 + s;
}

export function daysOut(targetIso: string, fromIso?: string): string {
  const t = new Date(targetIso);
  const now = fromIso ? new Date(fromIso) : new Date();
  const days = Math.round((t.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d past`;
  return `${days}d out`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function renderMd(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => {
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*(.+?)\*(?=$|[\s.,!?:;)])/g, '$1<em>$2</em>');
    return s;
  };
  const lines = text.split('\n');
  let out = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { out += '</ul>'; inList = false; }
      continue;
    }
    if (line.startsWith('- ')) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += `<li>${inline(line.slice(2))}</li>`;
    } else {
      if (inList) { out += '</ul>'; inList = false; }
      out += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) out += '</ul>';
  return out;
}
