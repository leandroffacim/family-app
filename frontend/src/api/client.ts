import { getFamilyId, getToken, notifyUnauthorized } from "../auth/tokenStore";
import {
  Family,
  FamilyEvent,
  Member,
  Task,
  TaskFrequency,
  TaskInstance,
  TaskWeight,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const familyId = getFamilyId();
  if (!API_URL || !familyId) {
    throw new Error(
      "VITE_API_URL não configurado ou familyId ausente — verifique .env e se o login foi concluído.",
    );
  }
  const token = getToken();
  const res = await fetch(`${API_URL}/families/${familyId}${path}`, {
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
    request<{ date: string; items: TaskInstance[] }>(
      `/deck${date ? `?date=${date}` : ""}`,
    ),

  decide: (taskId: string, action: "done" | "pass" | "defer") =>
    request<{ status: string; nextAssignee?: string }>(
      `/deck/${taskId}/decide`,
      {
        method: "POST",
        body: JSON.stringify({ action }),
      },
    ),

  undo: (taskId: string) =>
    request<{ status: string; assignee?: string }>(`/deck/${taskId}/undo`, {
      method: "POST",
    }),

  listTasks: () => request<{ items: Task[] }>("/tasks"),

  createTask: (payload: NewTaskPayload) =>
    request<{ id: string }>("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listMembers: () => request<{ items: Member[] }>("/members"),

  inviteMember: (payload: { email: string; memberId: string }) =>
    request<{ invited: boolean }>("/members/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listEvents: (date?: string) =>
    request<{ items: FamilyEvent[] }>(`/events${date ? `?date=${date}` : ""}`),

  createEvent: (payload: NewEventPayload) =>
    request<{ id: string }>("/events", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
