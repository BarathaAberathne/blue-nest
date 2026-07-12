"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Check, X, LayoutGrid } from "lucide-react";
import { AI_COMMAND } from "../data";
import { useTasks, addTask, toggleDone, removeTask, type TaskPriority } from "./tasks";

const PRIO_COLOR: Record<TaskPriority, string> = {
  high: "var(--cc-error)", med: "var(--cc-warning)", low: "var(--cc-success)",
};
const toneToPriority = (tone: string): TaskPriority => (tone === "bad" ? "high" : tone === "warn" ? "med" : "low");

export default function TasksPanel() {
  const router = useRouter();
  const tasks = useTasks();
  const [draft, setDraft] = useState("");

  const addManual = () => {
    if (!draft.trim()) return;
    addTask({ title: draft, source: "manual" });
    setDraft("");
  };
  // AI creation: pull the next recommendation not already on the list.
  const addAi = () => {
    const existing = new Set(tasks.map((t) => t.title));
    const rec = AI_COMMAND.recommendations.find((r) => !existing.has(r.text)) ?? AI_COMMAND.recommendations[0];
    addTask({ title: rec.text, source: "ai", priority: toneToPriority(rec.tone) });
  };

  const open = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="cc-tasks">
      <div className="cc-tasks-head">
        <span className="cc-tasks-count">{open} open</span>
        <button className="cc-tasks-board" onClick={() => router.push("/admin/command-center/board")}>
          <LayoutGrid size={11} /> Board
        </button>
      </div>

      <div className="cc-tasks-add">
        <input
          className="cc-tasks-input"
          placeholder="Add a task…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addManual(); }}
        />
        <button className="cc-tasks-btn" title="Add task" onClick={addManual}><Plus size={13} /></button>
        <button className="cc-tasks-btn cc-tasks-btn--ai" title="AI suggests a task" onClick={addAi}><Sparkles size={13} /></button>
      </div>

      <div className="cc-tasks-list cc-col-scroll">
        {tasks.map((t) => (
          <div key={t.id} className={`cc-task ${t.status === "done" ? "cc-task--done" : ""}`}>
            <button className="cc-task-check" onClick={() => toggleDone(t.id)} title="Toggle done">
              {t.status === "done" && <Check size={11} />}
            </button>
            <span className="cc-task-prio" style={{ background: PRIO_COLOR[t.priority] }} />
            <span className="cc-task-title">{t.title}</span>
            {t.source === "ai" && <Sparkles size={10} className="cc-task-ai" />}
            {t.branch && <span className="cc-task-branch">{t.branch}</span>}
            <button className="cc-task-del" onClick={() => removeTask(t.id)} title="Remove"><X size={11} /></button>
          </div>
        ))}
        {tasks.length === 0 && <p style={{ fontSize: 10.5, color: "var(--cc-muted-dim)", padding: "8px 2px" }}>No tasks — add one or ask the AI.</p>}
      </div>
    </div>
  );
}
