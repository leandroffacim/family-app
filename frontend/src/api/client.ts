import { Member, Task, TaskInstance, FamilyEvent, TaskFrequency, TaskWeight, Family } from "../types";
import { getToken, notifyUnauthorized } from "../auth/tokenStore";

const API_URL = import.meta.env.VITE_API_URL;
const FAMILY_ID = import.meta.env.VITE_FAMILY_ID;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL || !FAMILY_ID) {
    throw new Error(
      "VITE_API_URL / VITE_FAMILY_ID não configurados — copie .env.example para .env e preencha."
    );
  }
  const token = getToken();
  const res = await fetch(`${API_URL}/families/${FAMILY_ID}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    notifyUnauthorized();
    throw new Error("Sessão expirada — faça login de novo.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface NewTaskPayload {
  name: string;
  freq: TaskFrequency;
  weight: TaskWeight;
  rotationOrder: string[];
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface NewEventPayload {
  date: string;
  time: string;
  title: string;
  members: string[];
  location?: string;
}

export const api = {
  getFamily: () => request<Family>(""),

  getDeck: (date?: string) =>
    request<{ date: string; items: TaskInstance[] }>(`/deck${date ? `?date=${date}` : ""}`),

  decide: (taskId: string, action: "done" | "pass" | "defer") =>
    request<{ status: string; nextAssignee?: string }>(`/deck/${taskId}/decide`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  undo: (taskId: string) =>
    request<{ status: string; assignee?: string }>(`/deck/${taskId}/undo`, {
      method: "POST",
    }),

  listTasks: () => request<{ items: Task[] }>("/tasks"),

  createTask: (payload: NewTaskPayload) =>
    request<{ id: string }>("/tasks", { method: "POST", body: JSON.stringify(payload) }),

  listMembers: () => request<{ items: Member[] }>("/members"),

  listEvents: (date?: string) =>
    request<{ items: FamilyEvent[] }>(`/events${date ? `?date=${date}` : ""}`),

  createEvent: (payload: NewEventPayload) =>
    request<{ id: string }>("/events", { method: "POST", body: JSON.stringify(payload) }),
};
