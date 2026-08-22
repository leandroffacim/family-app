// América/São_Paulo é UTC-3 o ano todo (o Brasil aboliu o horário de
// verão em 2019). Se isso mudar, ajustar aqui é suficiente — é o
// único lugar do projeto que sabe sobre timezone.

export function todayISO(): string {
  const now = new Date();
  const spTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return spTime.toISOString().slice(0, 10);
}

export function weekdayIndex(dateISO: string): number {
  // 0 = domingo ... 6 = sábado
  return new Date(`${dateISO}T00:00:00Z`).getUTCDay();
}

export function dayOfMonthOf(dateISO: string): number {
  return Number(dateISO.slice(8, 10));
}
