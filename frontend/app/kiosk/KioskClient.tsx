"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CalendarDays, Check, CheckCircle2, ChevronRight, Clock, Delete,
  HelpCircle, KeyRound, LogOut, MapPin, Nfc, Pointer, QrCode, ScanFace, Search,
  ShieldCheck, UserCheck, Users, UserSearch, Wifi, WifiOff,
} from "lucide-react";
import { api } from "@/lib/api";
import type { KioskOverview, KioskSession, KioskStaffResult } from "@/types";
import "./kiosk.css";

const TOKEN_KEY = "kiosk_device_token";
const QUEUE_KEY = "kiosk_offline_queue";
type QueuedAction = { staffId: string; pin: string; action: "in" | "out"; name: string; at: number };
type View = "loading" | "pairing" | "home";
type SuccessInfo = { name: string; action: "in" | "out"; time: string };

export default function KioskClient() {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<KioskSession | null>(null);
  const [overview, setOverview] = useState<KioskOverview | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const [pairToken, setPairToken] = useState("");
  const [pairErr, setPairErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KioskStaffResult[]>([]);

  const [selected, setSelected] = useState<KioskStaffResult | null>(null);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null) ?? "";
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const loadOverview = useCallback(async () => {
    const t = token(); if (!t) return;
    try { setOverview(await api.kioskOverview(t)); } catch { /* transient */ }
  }, []);

  const boot = useCallback(async () => {
    const t = token();
    if (!t) { setView("pairing"); return; }
    try { setSession(await api.kioskSession(t)); setView("home"); void loadOverview(); }
    catch { setView("pairing"); }
  }, [loadOverview]);
  useEffect(() => { void boot(); }, [boot]);

  // refresh overview periodically on home
  useEffect(() => {
    if (view !== "home") return;
    const id = setInterval(() => void loadOverview(), 30000);
    return () => clearInterval(id);
  }, [view, loadOverview]);

  // search (debounced)
  useEffect(() => {
    if (view !== "home") return;
    const t = token(); if (!t) return;
    if (!query.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      try { setResults(await api.kioskSearch(t, query)); } catch { /* offline */ }
    }, 180);
    return () => clearTimeout(id);
  }, [query, view]);

  const closeModal = useCallback(() => { setSelected(null); setPin(""); setPinErr(null); }, []);
  const goHome = useCallback(() => { closeModal(); setQuery(""); setResults([]); }, [closeModal]);

  const showSuccess = useCallback((info: SuccessInfo) => {
    closeModal();
    setSuccess(info);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => { setSuccess(null); goHome(); void loadOverview(); }, 3000);
  }, [closeModal, goHome, loadOverview]);

  // offline queue
  const readQueue = (): QueuedAction[] => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } };
  const writeQueue = (q: QueuedAction[]) => { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); setQueued(q.length); };
  const enqueue = (a: QueuedAction) => { const q = readQueue(); q.push(a); writeQueue(q); };
  const flushQueue = useCallback(async () => {
    const t = token(); if (!t || !navigator.onLine) return;
    const q = readQueue(); if (!q.length) return;
    const remaining: QueuedAction[] = [];
    for (const a of q) {
      try { a.action === "in" ? await api.kioskClockIn(t, a.staffId, a.pin) : await api.kioskClockOut(t, a.staffId, a.pin); }
      catch (e) { if (e instanceof TypeError) remaining.push(a); }
    }
    writeQueue(remaining);
  }, []);
  useEffect(() => { setQueued(readQueue().length); }, []);
  useEffect(() => {
    if (online) void flushQueue();
    const id = setInterval(() => { if (navigator.onLine) void flushQueue(); }, 20000);
    return () => clearInterval(id);
  }, [online, flushQueue]);

  const pair = async () => {
    setPairErr(null); const t = pairToken.trim(); if (!t) return;
    try { const s = await api.kioskSession(t); localStorage.setItem(TOKEN_KEY, t); setSession(s); setPairToken(""); setView("home"); void loadOverview(); }
    catch { setPairErr("That device code wasn't recognised. Check it and try again."); }
  };

  const pickStaff = (s: KioskStaffResult) => {
    if (!s.has_pin) { flash(`${s.name.split(" ")[0]} has no PIN yet — ask your manager.`); return; }
    setSelected(s); setPin(""); setPinErr(null);
  };

  const action: "in" | "out" | null = selected ? (selected.clocked_in ? "out" : "in") : null;

  const submit = async () => {
    if (!selected || !action) return;
    setPinErr(null);
    if (pin.length < 4) { setPinErr("Enter your 4-digit PIN"); return; }
    const t = token();
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (!navigator.onLine) { enqueue({ staffId: selected.id, pin, action, name: selected.name, at: Date.now() }); showSuccess({ name: selected.name, action, time }); return; }
    setBusy(true);
    try {
      action === "in" ? await api.kioskClockIn(t, selected.id, pin) : await api.kioskClockOut(t, selected.id, pin);
      showSuccess({ name: selected.name, action, time });
    } catch (e) {
      if (e instanceof TypeError) { enqueue({ staffId: selected.id, pin, action, name: selected.name, at: Date.now() }); showSuccess({ name: selected.name, action, time }); }
      else { setPinErr(e instanceof Error ? e.message : "Something went wrong"); setPin(""); }
    } finally { setBusy(false); }
  };

  const tapKey = (k: string) => { setPinErr(null); if (k === "del") { setPin((p) => p.slice(0, -1)); return; } if (pin.length >= 8) return; setPin((p) => p + k); };

  const greeting = () => { const h = (now ?? new Date()).getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const roleLine = (s: { job_title?: string; room_name?: string }) => [s.job_title, s.room_name].filter(Boolean).join(" · ") || "Staff";
  const sum = overview?.summary;

  // ── Header (shared) ─────────────────────────────────────────────────────────
  const header = (
    <div className="k-header">
      <div className="k-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/bluenest-logo.png" alt="Blue Nest" />
        <div><div className="bn">Blue Nest</div><div className="sub">MONTESSORI</div></div>
      </div>
      <div className="k-headclock">
        {now ? (
          <div className="t">{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }).replace(/\s?[ap]m/i, "")}<small>{now.getHours() < 12 ? "AM" : "PM"}</small></div>
        ) : <div className="t">--:--</div>}
        <div className="d">{now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}</div>
      </div>
      <div className="k-headbranch">
        <div className="loc"><MapPin style={{ height: 22, width: 22 }} /><div><div className="n">{session?.branch_name?.replace(/^Blue Nest Montessori School — /, "") ?? "Kiosk"}</div><div className="k">{session?.device_name}</div></div></div>
        <div className={`k-net ${online ? "on" : "off"}`}>{online ? <Wifi style={{ height: 26, width: 26 }} /> : <WifiOff style={{ height: 26, width: 26 }} />}{online ? "Online" : "Offline"}</div>
      </div>
    </div>
  );

  const footer = (
    <div className="k-footer">
      <div className="l"><ShieldCheck style={{ height: 20, width: 20 }} /> Your attendance helps us build a happy and safe learning environment for our children.{queued > 0 ? ` · ${queued} pending sync` : ""}</div>
      <div className="r">Need help? Contact your Manager <HelpCircle style={{ height: 18, width: 18 }} /></div>
    </div>
  );

  if (view === "loading") return <div className="kiosk">{header}<div className="k-main"><p className="k-recent-empty" style={{ textAlign: "center" }}>Starting kiosk…</p></div></div>;

  if (view === "pairing") {
    return (
      <div className="kiosk">
        {header}
        <div className="k-main" style={{ gridTemplateColumns: "1fr", placeItems: "center" }}>
          <div className="k-pair">
            <h1>Pair this tablet</h1>
            <p>Enter the device code from Admin → HR → Attendance Devices.</p>
            <input value={pairToken} onChange={(e) => setPairToken(e.target.value)} placeholder="Device code" autoFocus onKeyDown={(e) => { if (e.key === "Enter") void pair(); }} />
            {pairErr && <p className="err">{pairErr}</p>}
            <button className="btn" onClick={() => void pair()} disabled={!pairToken.trim()}>Pair device</button>
          </div>
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className="kiosk">
      {/* Success */}
      {success && (
        <div className="k-success">
          <div className={`k-check ${success.action}`}>
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><path className="path" d="M25 52 L43 70 L76 32" /></svg>
          </div>
          <p className="greet">{success.action === "in" ? `${greeting()}, ${success.name.split(" ")[0]}!` : `See you soon, ${success.name.split(" ")[0]}!`}</p>
          <p className="detail">Clock {success.action === "in" ? "in" : "out"} · <b>{success.time}</b></p>
        </div>
      )}

      {/* PIN modal */}
      {selected && (
        <div className="k-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="k-modal">
            <div className="k-person">
              <span className="avatar-lg">{initials(selected.name)}</span>
              <span className="n">{selected.name}</span>
              <span className="r">{roleLine(selected)}</span>
              <span className="prompt">Enter your PIN to clock {action === "in" ? "in" : "out"}</span>
            </div>
            <div className="k-dots">{Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <span key={i} className={`k-dot ${i < pin.length ? "filled" : ""}`} />)}</div>
            <div className="k-pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} className="k-key" onClick={() => tapKey(k)}>{k}</button>)}
              <button className="k-key ghost" onClick={() => { setPin(""); setPinErr(null); }}>×</button>
              <button className="k-key" onClick={() => tapKey("0")}>0</button>
              <button className="k-key" onClick={() => tapKey("del")} aria-label="delete"><Delete style={{ height: 24, width: 24, margin: "0 auto" }} /></button>
            </div>
            {pinErr && <p className="k-perr">{pinErr}</p>}
            <div className="k-mactions">
              <button className="k-btn ghost" onClick={closeModal}>Cancel</button>
              <button className={`k-btn ${action}`} onClick={() => void submit()} disabled={busy || pin.length < 4}>{busy ? "…" : action === "in" ? "🟢  CLOCK IN" : "🔴  CLOCK OUT"}</button>
            </div>
          </div>
        </div>
      )}

      {header}

      <div className="k-main">
        {/* Left */}
        <div>
          <div className="k-welcome">
            <h1>Welcome! Please identify yourself</h1>
            <p>Search your name, scan QR / Card or enter PIN to mark attendance</p>
          </div>
          <div className="k-search">
            <Search style={{ height: 28, width: 28 }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your name…" autoFocus />
          </div>

          {query.trim() ? (
            <div className="k-recent" style={{ marginTop: 18 }}>
              {results.length === 0 ? <p className="k-recent-empty">No one found for “{query}”.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {results.map((s) => (
                    <button key={s.id} className="k-method" style={{ flexDirection: "row", justifyContent: "flex-start", gap: 16, padding: "16px 18px" }} onClick={() => pickStaff(s)}>
                      <span className="k-ava" style={{ height: 48, width: 48, fontSize: 17 }}>{initials(s.name)}</span>
                      <span style={{ flex: 1, textAlign: "left" }}>
                        <span style={{ display: "block", fontSize: 18, fontWeight: 700 }}>{s.name}</span>
                        <span style={{ display: "block", fontSize: 13, color: "var(--k-muted)" }}>{roleLine(s)}</span>
                      </span>
                      {s.clocked_in && <span style={{ color: "var(--k-green)", fontWeight: 700, fontSize: 13 }}>● Working</span>}
                      {s.clocked_out && <span style={{ color: "var(--k-faint)", fontWeight: 700, fontSize: 13 }}>Clocked out</span>}
                      {!s.has_pin && <span style={{ color: "var(--k-amber)", fontWeight: 700, fontSize: 13 }}>No PIN</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="k-or">OR</div>
              <div className="k-methods">
                <button className="k-method" onClick={() => flash("Coming soon — search your name for now.")}><QrCode style={{ height: 34, width: 34 }} /><span className="ml">Scan QR Code</span></button>
                <button className="k-method" onClick={() => flash("Coming soon — search your name for now.")}><Nfc style={{ height: 34, width: 34 }} /><span className="ml">Tap NFC Card</span></button>
                <button className="k-method" onClick={() => flash("Search your name above, then enter your PIN.")}><KeyRound style={{ height: 34, width: 34 }} /><span className="ml">Enter PIN</span></button>
                <button className="k-method soon" disabled><ScanFace style={{ height: 34, width: 34 }} /><span className="ml">Face Recognition</span><span className="ms">(Coming Soon)</span></button>
              </div>

              <div className="k-recent">
                <div className="rh"><span className="t"><Users style={{ height: 18, width: 18 }} /> Recently Checked In</span></div>
                {(overview?.recent?.length ?? 0) === 0 ? <p className="k-recent-empty">No one has clocked in yet today.</p> : (
                  <div className="k-recent-row">
                    {overview!.recent.map((p, i) => (
                      <div key={i} className="k-recent-person">
                        <span className="k-ava">{initials(p.name)}<span className={`badge ${p.clocked_out ? "out" : ""}`}>{p.clocked_out ? <LogOut style={{ height: 12, width: 12 }} /> : <Check style={{ height: 13, width: 13 }} />}</span></span>
                        <span className="n">{p.name}</span>
                        <span className="r">{p.job_title || "Staff"}</span>
                        <span className="tm">{p.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right */}
        <div className="k-side">
          <div className="k-panel">
            <h2>How to mark attendance</h2>
            <div className="k-step"><span className="num">1</span><UserSearch className="ic" style={{ height: 26, width: 26 }} /><div><div className="st">Find your name</div><div className="sd">Search your name or use QR / Card / PIN</div></div></div>
            <div className="k-step"><span className="num">2</span><Pointer className="ic" style={{ height: 26, width: 26 }} /><div><div className="st">Tap Button</div><div className="sd">Tap CLOCK IN when arriving, CLOCK OUT when leaving</div></div></div>
            <div className="k-step"><span className="num">3</span><CheckCircle2 className="ic" style={{ height: 26, width: 26 }} /><div><div className="st">Done!</div><div className="sd">Your attendance will be recorded</div></div></div>
          </div>

          <div className="k-panel">
            <h2 className="left"><CalendarDays style={{ height: 18, width: 18 }} /> Today&apos;s Summary</h2>
            <div className="k-summary">
              <div className="k-stat in"><div className="ic"><UserCheck style={{ height: 20, width: 20 }} /></div><div className="v">{sum?.checked_in ?? 0}</div><div className="l">Checked In</div></div>
              <div className="k-stat pend"><div className="ic"><Clock style={{ height: 20, width: 20 }} /></div><div className="v">{sum?.not_checked_in ?? 0}</div><div className="l">Not In</div></div>
              <div className="k-stat late"><div className="ic"><AlertTriangle style={{ height: 20, width: 20 }} /></div><div className="v">{sum?.late ?? 0}</div><div className="l">Late</div></div>
              <div className="k-stat out"><div className="ic"><LogOut style={{ height: 20, width: 20 }} /></div><div className="v">{sum?.checked_out ?? 0}</div><div className="l">Checked Out</div></div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div style={{ position: "absolute", bottom: 78, left: "50%", transform: "translateX(-50%)", background: "#17307d", color: "#fff", padding: "12px 22px", borderRadius: 999, fontWeight: 600, zIndex: 40, boxShadow: "0 10px 30px rgba(23,48,125,.35)" }}>{toast}</div>}

      {footer}
    </div>
  );
}
