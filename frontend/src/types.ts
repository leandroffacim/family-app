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
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface TaskInstance {
  date: string;
  taskId: string;
  name: string;
  freq: TaskFrequency;
  weight: TaskWeight;
  assignee: string;
  status: InstanceStatus;
}

export interface FamilyEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  members: string[];
  location?: string;
}

export interface Family {
  name: string;
  streak: number;
}
