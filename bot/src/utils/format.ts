export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatReport(data: {
  id: number;
  reporter: string;
  reported: string;
  messageText: string | null;
  reason: string | null;
  chatTitle: string | null;
}): string {
  const lines: string[] = [
    `<b>📋 Laporan Baru</b>`,
    `<b>ID:</b> ${data.id}`,
    `<b>Pelapor:</b> ${escapeHtml(data.reporter)}`,
    `<b>Terlapor:</b> ${escapeHtml(data.reported)}`,
    `<b>Grup:</b> ${escapeHtml(data.chatTitle ?? 'Unknown')}`,
  ];
  if (data.reason) {
    lines.push(`<b>Alasan:</b> ${escapeHtml(data.reason)}`);
  }
  if (data.messageText) {
    lines.push(`<b>Pesan:</b> ${escapeHtml(data.messageText)}`);
  }
  return lines.join('\n');
}

export function formatUser(user: {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}): string {
  const parts: string[] = [];
  if (user.first_name) {
    parts.push(user.first_name);
  }
  if (user.last_name) {
    parts.push(user.last_name);
  }
  const name = parts.join(' ') || 'Unknown';
  if (user.username) {
    return `${name} (@${user.username}) [${user.id}]`;
  }
  return `${name} [${user.id}]`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return 'kurang dari 1 menit';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (mins > 0) parts.push(`${mins} menit`);

  return parts.join(' ') || '0 menit';
}
