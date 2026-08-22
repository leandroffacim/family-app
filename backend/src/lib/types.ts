export type TaskFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type InstanceStatus = "pending" | "done" | "passed" | "deferred";
export type TaskWeight = 1 | 2 | 3;

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
}

export interface FamilyEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  members: string[];
  location?: string;
}
