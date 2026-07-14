"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete, WifiOff } from "lucide-react";
import { api } from "@/lib/api";
import type { KioskSession, KioskStaffResult } from "@/types";
import "./kiosk.css";

const TOKEN_KEY = "kiosk_device_token";
const QUEUE_KEY = "kiosk_offline_queue";
type QueuedAction = { staffId: string; pin: string; action: "in" | "out"; name: string; at: number };

type View = "loading" | "pairing" | "home" | "pin";
type SuccessInfo = { name: string; action: "in" | "out"; time: string };

export default function KioskClient() {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<KioskSession | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);

  // Pairing
  const [pairToken, setPairToken] = useState("");
  const [pairErr, setPairErr] = useState<string | null>(null);

  // Search / results
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KioskStaffResult[]>([]);

  // PIN entry
  const [selected, setSelected] = useState<KioskStaffResult | null>(null);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null) ?? "";

  // ── live clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── online/offline ──────────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── boot: validate stored device token ──────────────────────────────────────
  const boot = useCallback(async () => {
    const t = token();
    if (!t) { setView("pairing"); return; }
    try {
      const s = await api.kioskSession(t);
      setSession(s);
      setView("home");
    } catch {
      setView("pairing");
    }
  }, []);
  useEffect(() => { void boot(); }, [boot]);

  // ── search (debounced) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "home") return;
    const t = token();
    if (!t) return;
    const id = setTimeout(async () => {
      try { setResults(await api.kioskSearch(t, query)); } catch { /* offline / transient */ }
    }, 180);
    return () => clearTimeout(id);
  }, [query, view]);

  const goHome = useCallback(() => {
    setSelected(null); setPin(""); setPinErr(null); setQuery("");
    setView("home");
  }, []);

  const showSuccess = useCallback((info: SuccessInfo) => {
    setSuccess(info);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => { setSuccess(null); goHome(); }, 3000);
  }, [goHome]);

  // ── offline queue ───────────────────────────────────────────────────────────
  const readQueue = (): QueuedAction[] => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
  };
  const writeQueue = (q: QueuedAction[]) => { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); setQueued(q.length); };
  const enqueue = (a: QueuedAction) => { const q = readQueue(); q.push(a); writeQueue(q); };

  const flushQueue = useCallback(async () => {
    const t = token();
    if (!t || !navigator.onLine) return;
    const q = readQueue();
    if (q.length === 0) return;
    const remaining: QueuedAction[] = [];
    for (const a of q) {
      try {
        if (a.action === "in") await api.kioskClockIn(t, a.staffId, a.pin);
        else await api.kioskClockOut(t, a.staffId, a.pin);
      } catch (e) {
        // Network error → keep for the next attempt. A rejection (already
        // clocked etc.) is dropped — the record already reflects reality.
        if (e instanceof TypeError) remaining.push(a);
      }
    }
    writeQueue(remaining);
  }, []);

  useEffect(() => { setQueued(readQueue().length); }, []);
  useEffect(() => {
    if (online) void flushQueue();
    const id = setInterval(() => { if (navigator.onLine) void flushQueue(); }, 20000);
    return () => clearInterval(id);
  }, [online, flushQueue]);

  // ── actions ─────────────────────────────────────────────────────────────────
  const pair = async () => {
    setPairErr(null);
    const t = pairToken.trim();
    if (!t) return;
    try {
      const s = await api.kioskSession(t);
      localStorage.setItem(TOKEN_KEY, t);
      setSession(s); setPairToken(""); setView("home");
    } catch {
      setPairErr("That device code wasn't recognised. Check it and try again.");
    }
  };

  const pickStaff = (s: KioskStaffResult) => {
    if (!s.has_pin) { return; }
    setSelected(s); setPin(""); setPinErr(null); setView("pin");
  };

  const action: "in" | "out" | null = selected ? (selected.clocked_in ? "out" : "in") : null;

  const submit = async () => {
    if (!selected || !action) return;
    setPinErr(null);
    if (pin.length < 4) { setPinErr("Enter your 4-digit PIN"); return; }
    const t = token();
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    // Offline → queue optimistically.
    if (!navigator.onLine) {
      enqueue({ staffId: selected.id, pin, action, name: selected.name, at: Date.now() });
      showSuccess({ name: selected.name, action, time });
      return;
    }
    setBusy(true);
    try {
      if (action === "in") await api.kioskClockIn(t, selected.id, pin);
      else await api.kioskClockOut(t, selected.id, pin);
      showSuccess({ name: selected.name, action, time });
    } catch (e) {
      if (e instanceof TypeError) {
        // Network dropped mid-request → queue.
        enqueue({ staffId: selected.id, pin, action, name: selected.name, at: Date.now() });
        showSuccess({ name: selected.name, action, time });
      } else {
        setPinErr(e instanceof Error ? e.message : "Something went wrong");
        setPin("");
      }
    } finally { setBusy(false); }
  };

  const tapKey = (k: string) => {
    setPinErr(null);
    if (k === "del") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 8) return;
    setPin((p) => p + k);
  };

  const greeting = () => {
    const h = (now ?? new Date()).getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };
  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // ── render ──────────────────────────────────────────────────────────────────
  if (view === "loading") {
    return <div className="kiosk"><div className="kiosk-body"><p className="kiosk-empty">Starting kiosk…</p></div></div>;
  }

  if (view === "pairing") {
    return (
      <div className="kiosk">
        <div className="kiosk-body">
          <div className="kiosk-pair kiosk-stage">
            <h1 className="kiosk-title">Pair this tablet</h1>
            <p className="kiosk-sub">Enter the device code from Admin → HR → Attendance devices.</p>
            <input className="kiosk-search kiosk-pair" value={pairToken} onChange={(e) => setPairToken(e.target.value)}
              placeholder="Device code" autoFocus onKeyDown={(e) => { if (e.key === "Enter") void pair(); }} />
            {pairErr && <p className="kiosk-error">{pairErr}</p>}
            <div className="kiosk-actions">
              <button className="kiosk-btn in" onClick={() => void pair()} disabled={!pairToken.trim()}>Pair device</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk">
      {/* Success overlay */}
      {success && (
        <div className="kiosk-success">
          <div className={`kiosk-check ${success.action}`}>
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
              <path className="path" d="M25 52 L43 70 L76 32" />
            </svg>
          </div>
          <p className="greet">{success.action === "in" ? `${greeting()}, ${success.name.split(" ")[0]}!` : `See you soon, ${success.name.split(" ")[0]}!`}</p>
          <p className="detail">Clock {success.action === "in" ? "in" : "out"} · <b>{success.time}</b></p>
        </div>
      )}

      <div className="kiosk-top">
        <div className="kiosk-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/bluenest-logo.png" alt="Blue Nest" />
          <div>
            <div className="name">Blue Nest Montessori</div>
            <div className="branch">{session?.branch_name ?? ""}</div>
          </div>
        </div>
        <div className="kiosk-clock">
          <div className="time">{now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</div>
          <div className="date">{now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""}</div>
        </div>
      </div>

      <div className="kiosk-body">
        {view === "home" && (
          <div className="kiosk-stage">
            <h1 className="kiosk-title">Search your name to clock in or out</h1>
            <input className="kiosk-search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍  Start typing your name…" autoFocus />
            <div className="kiosk-results">
              {results.length === 0 && query && <p className="kiosk-empty">No one found for “{query}”.</p>}
              {results.map((s) => (
                <button key={s.id} className="kiosk-card" onClick={() => pickStaff(s)}>
                  <span className="kiosk-avatar">{initials(s.name)}</span>
                  <span className="who">
                    <span className="n">{s.name}</span>
                    <span className="r">{[s.job_title, s.room_name].filter(Boolean).join(" · ") || "Staff"}</span>
                  </span>
                  {s.clocked_in && <span className="kiosk-pill in">● Working</span>}
                  {s.clocked_out && <span className="kiosk-pill done">Clocked out</span>}
                  {!s.has_pin && <span className="kiosk-pill done">No PIN set</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "pin" && selected && (
          <div className="kiosk-stage">
            <div className="kiosk-person">
              <span className="avatar-lg">{initials(selected.name)}</span>
              <span className="n">{selected.name}</span>
              <span className="r">{[selected.job_title, selected.room_name].filter(Boolean).join(" · ") || "Staff"}</span>
            </div>
            <p className="kiosk-sub" style={{ margin: "0 0 10px" }}>Enter your PIN to clock {action === "in" ? "in" : "out"}</p>
            <div className="kiosk-dots">
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <span key={i} className={`kiosk-dot ${i < pin.length ? "filled" : ""}`} />
              ))}
            </div>
            <div className="kiosk-pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
                <button key={k} className="kiosk-key" onClick={() => tapKey(k)}>{k}</button>
              ))}
              <button className="kiosk-key ghost" onClick={() => { setPin(""); setPinErr(null); }} aria-label="clear">×</button>
              <button className="kiosk-key" onClick={() => tapKey("0")}>0</button>
              <button className="kiosk-key" onClick={() => tapKey("del")} aria-label="delete"><Delete style={{ height: 26, width: 26, margin: "0 auto" }} /></button>
            </div>
            {pinErr && <p className="kiosk-error">{pinErr}</p>}
            <div className="kiosk-actions">
              <button className="kiosk-btn ghost" onClick={goHome}>Cancel</button>
              <button className={`kiosk-btn ${action}`} onClick={() => void submit()} disabled={busy || pin.length < 4}>
                {busy ? "…" : action === "in" ? "🟢  CLOCK IN" : "🔴  CLOCK OUT"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="kiosk-foot">
        {online
          ? <>Blue Nest attendance kiosk{queued > 0 ? ` · ${queued} pending sync` : ""}</>
          : <span className="kiosk-offline"><WifiOff style={{ height: 14, width: 14 }} /> Offline — clock actions are saved and will sync automatically{queued > 0 ? ` (${queued} pending)` : ""}</span>}
      </div>
    </div>
  );
}
