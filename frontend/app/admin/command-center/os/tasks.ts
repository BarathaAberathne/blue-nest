"use client";

// Shared task store for the Command Centre. Tasks can be created manually or by
// the AI; the Tasks widget, the AI conversation, and the (placeholder) Kanban
// board all read/write through here. Persisted to localStorage for now — a real
// backend-backed Kanban board is planned (see /admin/command-center/board).

import { useEffect, useState } from "react";

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "high" | "med" | "low";
export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  source: "ai" | "manual";
  branch?: string;
};

const KEY = "cc-tasks-v1";
const EVT = "cc-tasks-changed";

// Seed shown until the user edits (kept static so SSR and first client render match).
const SEED: Task[] = [
  { id: "seed-1", title: "Review Borehamwood safeguarding actions", status: "todo", priority: "high", source: "ai", branch: "Borehamwood" },
  { id: "seed-2", title: "Approve funding reconciliation (due today)", status: "todo", priority: "high", source: "ai", branch: "Group" },
  { id: "seed-3", title: "Follow up 6 new enquiries", status: "doing", priority: "med", source: "ai" },
  { id: "seed-4", title: "Prepare Q2 board report", status: "todo", priority: "med", source: "manual" },
  { id: "seed-5", title: "Sign off Northwood roster", status: "done", priority: "low", source: "manual", branch: "Northwood" },
];

export const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To Do", doing: "In Progress", done: "Done" };
export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

function read(): Task[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : SEED;
  } catch {
    return SEED;
  }
}

function write(tasks: Task[]) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event(EVT));
}

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `t-${Math.random().toString(36).slice(2)}`);

export function addTask(input: { title: string; source?: "ai" | "manual"; priority?: TaskPriority; branch?: string }): Task {
  const task: Task = {
    id: newId(),
    title: input.title.trim(),
    status: "todo",
    priority: input.priority ?? "med",
    source: input.source ?? "manual",
    branch: input.branch,
  };
  write([task, ...read()]);
  return task;
}
export function toggleDone(id: string) {
  write(read().map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t)));
}
export function setStatus(id: string, status: TaskStatus) {
  write(read().map((t) => (t.id === id ? { ...t, status } : t)));
}
export function removeTask(id: string) {
  write(read().filter((t) => t.id !== id));
}

// Reactive hook — re-renders when tasks change anywhere (same or other tab).
export function useTasks(): Task[] {
  const [tasks, setTasks] = useState<Task[]>(SEED);
  useEffect(() => {
    const sync = () => setTasks(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return tasks;
}
