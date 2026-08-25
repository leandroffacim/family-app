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
