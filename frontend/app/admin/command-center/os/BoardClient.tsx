"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft, Plus, Sparkles, Check, X } from "lucide-react";
import "../command-center.css";
import {
  useTasks, addTask, setStatus, toggleDone, removeTask,
  STATUS_ORDER, STATUS_LABEL, type TaskStatus, type TaskPriority,
} from "./tasks";
import { AI_COMMAND } from "../data";

const PRIO_COLOR: Record<TaskPriority, string> = {
  high: "var(--cc-error)", med: "var(--cc-warning)", low: "var(--cc-success)",
};

export default function BoardClient() {
  const router = useRouter();
  const tasks = useTasks();
  const [draft, setDraft] = useState("");

  const addManual = () => { if (draft.trim()) { addTask({ title: draft, source: "manual" }); setDraft(""); } };
  const addAi = () => {
    const existing = new Set(tasks.map((t) => t.title));
    const rec = AI_COMMAND.recommendations.find((r) => !existing.has(r.text)) ?? AI_COMMAND.recommendations[0];
    addTask({ title: rec.text, source: "ai", priority: rec.tone === "bad" ? "high" : rec.tone === "warn" ? "med" : "low" });
  };
  const move = (id: string, cur: TaskStatus, dir: -1 | 1) => {
    const i = STATUS_ORDER.indexOf(cur) + dir;
    if (i >= 0 && i < STATUS_ORDER.length) setStatus(id, STATUS_ORDER[i]);
  };

  return (
    <div className="cc-os cc-board">
      <header className="cc-os-header">
        <button className="cc-board-back" onClick={() => router.push("/admin/command-center")}>
          <ArrowLeft size={14} /> Command Centre
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <p className="cc-serif" style={{ fontSize: 16, color: "var(--cc-accent)", letterSpacing: "0.06em" }}>TASK BOARD</p>
          <span className="cc-ws-chip" style={{ borderColor: "rgba(214,179,106,0.45)", color: "var(--cc-accent)", background: "rgba(214,179,106,0.1)" }}>PREVIEW · FULL BOARD COMING SOON</span>
        </div>
        <div className="cc-board-add">
          <input className="cc-tasks-input" placeholder="Add a task…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addManual(); }} />
          <button className="cc-tasks-btn" onClick={addManual} title="Add"><Plus size={14} /></button>
          <button className="cc-tasks-btn cc-tasks-btn--ai" onClick={addAi} title="AI suggests a task"><Sparkles size={14} /></button>
        </div>
      </header>

      <div className="cc-board-cols">
        {STATUS_ORDER.map((status) => {
          const items = tasks.filter((t) => t.status === status);
          return (
            <section key={status} className="cc-board-col">
              <div className="cc-board-col-head">
                <span className="cc-heading" style={{ fontSize: 11, letterSpacing: "0.14em", color: status === "done" ? "var(--cc-success)" : status === "doing" ? "var(--cc-primary-soft)" : "var(--cc-accent)" }}>{STATUS_LABEL[status]}</span>
                <span className="cc-board-count">{items.length}</span>
              </div>
              <div className="cc-board-col-body cc-col-scroll">
                {items.map((t) => (
                  <div key={t.id} className={`cc-board-card ${t.status === "done" ? "cc-task--done" : ""}`}>
                    <div className="flex items-start gap-2">
                      <span className="cc-task-prio" style={{ background: PRIO_COLOR[t.priority], marginTop: 4 }} />
                      <span className="cc-board-card-title">{t.title}</span>
                      <button className="cc-task-del" onClick={() => removeTask(t.id)} title="Remove"><X size={12} /></button>
                    </div>
                    <div className="cc-board-card-foot">
                      <span className="cc-board-tag">{t.source === "ai" ? <><Sparkles size={9} /> AI</> : "Manual"}</span>
                      {t.branch && <span className="cc-board-tag">{t.branch}</span>}
                      <span style={{ flex: 1 }} />
                      <button className="cc-board-move" disabled={status === "todo"} onClick={() => move(t.id, status, -1)} title="Move left"><ChevronLeft size={13} /></button>
                      <button className="cc-board-move" onClick={() => toggleDone(t.id)} title="Toggle done"><Check size={13} /></button>
                      <button className="cc-board-move" disabled={status === "done"} onClick={() => move(t.id, status, 1)} title="Move right"><ChevronRight size={13} /></button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="cc-board-empty">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
