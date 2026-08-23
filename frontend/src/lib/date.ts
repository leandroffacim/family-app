// Mesma regra do backend: America/Sao_Paulo, sem horário de verão.
// Aqui usamos Intl em vez do offset manual porque roda no navegador
// do usuário, não sabemos o timezone do dispositivo.

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Datas (YYYY-MM-DD) de segunda a domingo da semana atual.
export function currentWeekDates(): string[] {
  return weekDatesFor(todayISO());
}

// Datas (YYYY-MM-DD) de segunda a domingo da semana da data informada.
// A âncora ao meio-dia evita mudanças inesperadas em transições de timezone.
export function weekDatesFor(date: string): string[] {
  const anchor = new Date(`${date}T12:00:00`);
  const dow = anchor.getDay(); // 0=domingo..6=sábado
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function shiftISO(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return shifted.toISOString().slice(0, 10);
}

// Converte índice de exibição (0=Seg..6=Dom, igual a WEEKDAYS) para o
// dayOfWeek que a API espera (0=domingo..6=sábado, padrão Date.getUTCDay()).
export function displayIndexToApiWeekday(displayIndex: number): number {
  return (displayIndex + 1) % 7;
}

export function freqLabel(freq: "DAILY" | "WEEKLY" | "MONTHLY"): string {
  return freq === "DAILY" ? "Diária" : freq === "WEEKLY" ? "Semanal" : "Mensal";
}
