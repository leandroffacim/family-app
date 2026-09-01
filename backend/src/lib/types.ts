export type TaskFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type InstanceStatus = "pending" | "done" | "passed" | "deferred";
export type TaskWeight = 1 | 2 | 3;

export const AVATAR_COLORS = [
  "#4F46E5",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#0EA5E9",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
] as const;

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  freq: TaskFrequency;
  weight: TaskWeight;
  rotationOrder: string[];
  currentIndex: number;
  dayOfWeek?: number; // 0=domingo .. 6=sábado, obrigatório se freq=WEEKLY
  dayOfMonth?: number; // 1-31, obrigatório se freq=MONTHLY
}

export interface TaskInstance {
  date: string; // YYYY-MM-DD
  taskId: string;
  name: string;
  freq: TaskFrequency;
  weight: TaskWeight;
  assignee: string;
  status: InstanceStatus;
  // memberId de quem de fato tomou a ação (vem do token, nunca do body) —
  // pode ser diferente do assignee se outro membro ajudou/decidiu por ele.
  completedBy?: string;
  passedBy?: string;
}

export interface FamilyEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  members: string[];
  location?: string;
}

export interface FamilyMetadata {
  name: string;
  streak: number;
  // último dia (YYYY-MM-DD) em que o streak foi recalculado — evita
  // contar o mesmo dia duas vezes se o job diário rodar de novo
  streakUpdatedDate?: string;
}
