"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, MapPin, Sparkles } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

// ── Constants ─────────────────────────────────────────────────────────────────

const BRANCHES      = ["Harrow", "Borehamwood", "Pinner", "Northwood"];
const GENDERS       = ["Male", "Female", "Prefer not to say"];
const DAYS          = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAYS_FULL     = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SESSION_TYPES = [
  { key: "full_time",  label: "Full Time",    time: "8am – 6pm"    },
  { key: "morning",    label: "Morning",      time: "8am – 1pm"    },
  { key: "afternoon",  label: "Afternoon",    time: "1pm – 6pm"    },
  { key: "school",     label: "School",       time: "9am – 4pm"    },
  { key: "early_bird", label: "Early Bird",   time: "7:30 – 8am"   },
];

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-[0.75rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-3 py-2 text-sm " +
  "text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.32)] " +
  "focus:border-[#f4aac8] focus:outline-none focus:ring-1 focus:ring-[rgba(246,213,223,0.6)]";

const labelCls =
  "mb-1 block text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[rgba(90,74,66,0.55)]";

function Req() {
  return <span className="ml-0.5 text-[#ef8cab]">*</span>;
}

function Err({ show, msg }: { show: boolean; msg: string }) {
  return show ? (
    <p className="mt-0.5 text-[0.65rem] font-semibold text-[#e8719a]">{msg}</p>
  ) : null;
}

// ── Group heading ─────────────────────────────────────────────────────────────

function GroupLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="h-3 w-1 rounded-full" style={{ background: color }} />
      <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em]" style={{ color }}>
        {children}
      </span>
    </div>
  );
}

// ── Signature pad ─────────────────────────────────────────────────────────────

function SignaturePad({
  canvasRef,
  hasDrawn,
  setHasDrawn,
  showError,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hasDrawn: boolean;
  setHasDrawn: (v: boolean) => void;
  showError: boolean;
}) {
  const drawing = useRef(false);
  const last    = useRef<{ x: number; y: number } | null>(null);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    last.current = getPos(e);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#5a4a42";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    last.current = p;
    setHasDrawn(true);
  }

  function stopDraw() { drawing.current = false; last.current = null; }

  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => { const r = c.getBoundingClientRect(); c.width = r.width; c.height = r.height; };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRef]);

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-[0.75rem] border bg-white transition ${
          showError ? "border-[#e8719a] ring-1 ring-[rgba(232,113,154,0.3)]" : "border-[rgba(90,74,66,0.14)]"
        }`}
      >
        <canvas
          ref={canvasRef}
          aria-label="Signature pad — draw your signature here"
          className="block h-[72px] w-full cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasDrawn && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[rgba(90,74,66,0.30)]">
            Sign here
          </p>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <button type="button" onClick={clear}
          className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#cf7d9c] transition hover:text-[#b8698a]">
          Clear
        </button>
        {showError && <p className="text-[0.65rem] font-semibold text-[#e8719a]">Signature required</p>}
      </div>
    </div>
  );
}

// ── Sessions grid ─────────────────────────────────────────────────────────────

function SessionsGrid({
  sessions,
  toggle,
}: {
  sessions: Record<string, Set<string>>;
  toggle: (day: string, key: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-1.5 pr-2 text-left text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[rgba(90,74,66,0.48)] w-28" />
              {DAYS.map((d) => (
                <th key={d} className="pb-1.5 text-center text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-[rgba(90,74,66,0.48)]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SESSION_TYPES.map((st, ri) => (
              <tr key={st.key} className={ri % 2 === 1 ? "bg-[rgba(246,213,223,0.14)]" : ""}>
                <td className="py-1.5 pr-2">
                  <p className="text-[0.72rem] font-semibold leading-tight text-[var(--ink)]">{st.label}</p>
                  <p className="text-[0.6rem] text-[rgba(90,74,66,0.5)]">{st.time}</p>
                </td>
                {DAYS_FULL.map((d) => (
                  <td key={d} className="py-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${st.label} on ${d}`}
                      checked={sessions[d]?.has(st.key) ?? false}
                      onChange={() => toggle(d, st.key)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[#ef8cab]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile accordion */}
      <div className="sm:hidden space-y-1.5">
        {DAYS_FULL.map((day, i) => {
          const open  = expanded === day;
          const count = sessions[day]?.size ?? 0;
          return (
            <div key={day} className="overflow-hidden rounded-[0.9rem] border border-[rgba(90,74,66,0.08)] bg-white/70">
              <button type="button" onClick={() => setExpanded(open ? null : day)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-4 py-2.5">
                <span className="text-sm font-bold text-[var(--ink)]">
                  {DAYS[i]}
                  {count > 0 && (
                    <span className="ml-2 rounded-full bg-[#ef8cab] px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{count}</span>
                  )}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#cf7d9c] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {open && (
                <div className="border-t border-[rgba(90,74,66,0.07)] px-4 pb-3 pt-2 space-y-2">
                  {SESSION_TYPES.map((st) => (
                    <label key={st.key} className="flex cursor-pointer items-center gap-2.5">
                      <input type="checkbox" checked={sessions[day]?.has(st.key) ?? false}
                        onChange={() => toggle(day, st.key)} className="h-4 w-4 accent-[#ef8cab]" />
                      <span>
                        <span className="block text-xs font-semibold text-[var(--ink)]">{st.label}</span>
                        <span className="block text-[0.65rem] text-[rgba(90,74,66,0.5)]">{st.time}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function ApplicationFormClient() {
  const [status,       setStatus]       = useState<SubmitStatus>("idle");
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [branch,       setBranch]       = useState("");
  const [gender,       setGender]       = useState("");
  const [waitingList,  setWaitingList]  = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [attempted,    setAttempted]    = useState(false);
  const [sessions, setSessions] = useState<Record<string, Set<string>>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const submitted = status === "success";

  function toggleSession(day: string, key: string) {
    setSessions((prev) => {
      const s = new Set(prev[day] ?? []);
      if (s.has(key)) s.delete(key); else s.add(key);
      return { ...prev, [day]: s };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setSubmitError(null);

    // Manual validation for fields that aren't standard form inputs.
    if (!branch || !waitingList || !hasSignature) return;

    // Let the browser surface its native validity messages for required
    // text/date inputs (`required` is already on each one).
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Capture all named field values.
    const fd = new FormData(form);
    const childName    = String(fd.get("child_name")    ?? "").trim();
    const childDob     = String(fd.get("child_dob")     ?? "").trim();
    const parentName   = String(fd.get("parent_name")   ?? "").trim();
    const parentEmail  = String(fd.get("parent_email")  ?? "").trim();
    const parentPhone  = String(fd.get("parent_phone")  ?? "").trim();
    const settlingDate = String(fd.get("settling_date") ?? "").trim();

    // Flatten the day×type matrix into a list the backend can serialise.
    const sessionsList = DAYS_FULL.flatMap((day) =>
      Array.from(sessions[day] ?? []).map((typeKey) => {
        const meta = SESSION_TYPES.find((s) => s.key === typeKey);
        return { day, type: typeKey, label: meta?.label ?? typeKey, time: meta?.time ?? "" };
      }),
    );

    const signatureDataUrl = canvasRef.current?.toDataURL("image/png") ?? "";

    // Short one-line summary — the structured `application` sub-object is
    // rendered as a full "Application Details" table in both emails, so we
    // intentionally keep the free-text message field tiny to avoid
    // duplicating every line above and below the table.
    const summaryLine = `New application from ${parentName} for ${childName || "their child"} at ${branch}.`;

    setStatus("submitting");
    try {
      await api.submitEnquiry({
        name:         parentName,
        email:        parentEmail,
        phone:        parentPhone,
        branch:       branch,
        child_age:    childDob,
        enquiry_type: "Application form",
        message:      summaryLine,
        consent:      true,
        application: {
          child:        { name: childName, dob: childDob, gender: gender || null },
          parent:       { name: parentName, email: parentEmail, phone: parentPhone },
          branch,
          settling_in:  settlingDate,
          waiting_list: waitingList === "Yes",
          sessions:     sessionsList,
          signature_data_url: signatureDataUrl,
        },
      });
      // GA4 conversion — application submitted. No PII; only the
      // non-identifying branch + session count.
      trackEvent("application_form_submit", {
        form_name:    "application",
        branch,
        sessions_count: sessionsList.length,
        page_path:    typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setStatus("success");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting your application. Please try again.",
      );
      setStatus("error");
    }
  }

  const errBranch = attempted && !branch;
  const errWait   = attempted && !waitingList;
  const errSig    = attempted && !hasSignature;
  const submitting = status === "submitting";

  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          SINGLE SECTION — intro sidebar left, form right
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Doodle kind="blue-bird"      className="left-[1%]  top-4    h-8 w-8 opacity-45 hidden lg:block" />

        <div className="container-site">
          {submitted ? (
            /* ── Success ───────────────────────────────────── */
            <div className="mx-auto max-w-md rounded-[2rem] bg-white/92 px-8 py-12 text-center shadow-[0_12px_36px_rgba(90,74,66,0.10)] ring-1 ring-[rgba(90,74,66,0.06)]">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(127,216,210,0.25)]">
                <CheckCircle2 className="h-7 w-7 text-[#7fd8d2]" strokeWidth={1.8} />
              </span>
              <h2 className="font-heading text-[2rem] text-[var(--ink)]">Thanks for submitting!</h2>
              <p className="body-text mx-auto mt-3 max-w-xs text-sm">
                We&rsquo;ve received your application and will be in touch within 2 working days.
              </p>
              <div className="mt-6 flex justify-center">
                <PastelButton href="/" variant="mint">Back to Home <ArrowRight className="h-4 w-4" /></PastelButton>
              </div>
            </div>
          ) : (
            /* ── 3-pane layout: intro | form-left | form-right ── */
            <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8 xl:grid-cols-[300px_1fr]">

              {/* ══ INTRO SIDEBAR ════════════════════════════ */}
              <div className="lg:sticky lg:top-24 space-y-4">
                <div>
                  <span className="section-kicker">Admissions</span>
                  <h1 className="mt-3 font-heading text-[1.9rem] leading-tight text-[var(--ink)] sm:text-[2.1rem]">
                    Affordable private nursery in Harrow, Pinner and Borehamwood
                  </h1>
                </div>

                <div className="h-px bg-[rgba(90,74,66,0.08)]" />

                <div>
                  <h2 className="font-heading text-[1.15rem] leading-snug text-[#cf7d9c]">
                    Arrange your child&rsquo;s nursery place today
                  </h2>
                  <div className="mt-3 space-y-3 text-[0.8rem] leading-[1.7] text-[rgba(90,74,66,0.72)]">
                    <p>
                      As parents, we are all striving to give our children the best opportunities
                      we can, and education plays a major role. Located in Harrow, Pinner and
                      Borehamwood, Blue Nest Montessori School provides exceptional quality
                      development for children at a price you will be happy to pay.
                    </p>
                    <p>
                      We believe in preparing them for the future and are committed to delivering
                      exceptional standards of childcare. You can find copies of our nursery
                      policies and fee structure on our site.
                    </p>
                    <p>
                      Simply fill out the application form and we&rsquo;ll contact you to confirm
                      your child&rsquo;s place.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[0.65rem] text-[rgba(90,74,66,0.48)]">
                  <span className="h-2 w-2 rounded-full bg-[#ef8cab]" />
                  Fields marked <span className="font-bold text-[#ef8cab]">*</span> are required
                </div>
              </div>

              {/* ══ FORM ════════════════════════════════════ */}
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Nursery application form"
                className="rounded-[1.8rem] bg-white/92 px-5 py-6 shadow-[0_12px_36px_rgba(90,74,66,0.09)] ring-1 ring-[rgba(90,74,66,0.06)] sm:px-7 sm:py-7"
              >
                <div className="grid gap-5 sm:grid-cols-2">

                  {/* ── Form left ── */}
                  <div className="space-y-5">

                    <div>
                      <GroupLabel color="#cf7d9c">Child &amp; Branch Details</GroupLabel>
                      <div className="space-y-3">
                        <fieldset>
                          <legend className={labelCls}>Branch<Req /></legend>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                            {BRANCHES.map((b) => (
                              <label key={b} className="flex cursor-pointer items-center gap-1.5">
                                <input type="radio" name="branch" value={b}
                                  checked={branch === b} onChange={() => setBranch(b)}
                                  className="h-3.5 w-3.5 accent-[#ef8cab]" />
                                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--ink)]">
                                  <MapPin className="h-2.5 w-2.5 text-[#ef8cab]" aria-hidden="true" />{b}
                                </span>
                              </label>
                            ))}
                          </div>
                          <Err show={errBranch} msg="Please select a branch" />
                        </fieldset>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="child-name" className={labelCls}>Child&rsquo;s name<Req /></label>
                            <input id="child-name" name="child_name" type="text" required placeholder="e.g. Emma" className={inputCls} />
                          </div>
                          <div>
                            <label htmlFor="child-dob" className={labelCls}>Date of birth<Req /></label>
                            <input id="child-dob" name="child_dob" type="date" required className={inputCls} />
                          </div>
                        </div>

                        <fieldset>
                          <legend className={labelCls}>Gender</legend>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {GENDERS.map((g) => (
                              <label key={g} className="flex cursor-pointer items-center gap-1.5">
                                <input type="radio" name="gender" value={g}
                                  checked={gender === g} onChange={() => setGender(g)}
                                  className="h-3.5 w-3.5 accent-[#7fd8d2]" />
                                <span className="text-xs font-semibold text-[var(--ink)]">{g}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    </div>

                    <div className="h-px bg-[rgba(90,74,66,0.07)]" />

                    <div>
                      <GroupLabel color="#7fd8d2">Parent / Guardian Contact</GroupLabel>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="parent-name" className={labelCls}>Full name<Req /></label>
                            <input id="parent-name" name="parent_name" type="text" required placeholder="Sarah Johnson" className={inputCls} />
                          </div>
                          <div>
                            <label htmlFor="parent-email" className={labelCls}>Email<Req /></label>
                            <input id="parent-email" name="parent_email" type="email" required placeholder="sarah@email.com" className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="parent-phone" className={labelCls}>Phone<Req /></label>
                          <input id="parent-phone" name="parent_phone" type="tel" required placeholder="07700 900000" className={inputCls} />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ── Form right ── */}
                  <div className="space-y-5">

                    <div>
                      <GroupLabel color="#7fd8d2">Sessions Required</GroupLabel>
                      <SessionsGrid sessions={sessions} toggle={toggleSession} />
                    </div>

                    <div className="h-px bg-[rgba(90,74,66,0.07)]" />

                    <div>
                      <GroupLabel color="#f0bd55">Final Details</GroupLabel>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="settling-date" className={labelCls}>Settling-in week<Req /></label>
                            <input id="settling-date" name="settling_date" type="date" required className={inputCls} />
                          </div>
                          <fieldset>
                            <legend className={labelCls}>Waiting list if unavailable?<Req /></legend>
                            <div className="flex gap-4 pt-1.5">
                              {["Yes", "No"].map((opt) => (
                                <label key={opt} className="flex cursor-pointer items-center gap-1.5">
                                  <input type="radio" name="waiting_list" value={opt}
                                    checked={waitingList === opt} onChange={() => setWaitingList(opt)}
                                    className="h-3.5 w-3.5 accent-[#f0bd55]" />
                                  <span className="text-xs font-semibold text-[var(--ink)]">{opt}</span>
                                </label>
                              ))}
                            </div>
                            <Err show={errWait} msg="Please select" />
                          </fieldset>
                        </div>

                        <div>
                          <label className={labelCls}>Your signature<Req /></label>
                          <SignaturePad
                            canvasRef={canvasRef}
                            hasDrawn={hasSignature}
                            setHasDrawn={setHasSignature}
                            showError={errSig}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Submit */}
                <div className="mt-6 border-t border-[rgba(90,74,66,0.07)] pt-5">
                  {attempted && (!branch || !waitingList || !hasSignature) && (
                    <p className="mb-3 text-center text-[0.7rem] font-semibold text-[#e8719a]" role="alert">
                      Please complete all required fields before submitting.
                    </p>
                  )}
                  {submitError && (
                    <div
                      role="alert"
                      className="mb-3 rounded-[0.9rem] border border-[rgba(232,113,154,0.45)] bg-[rgba(246,213,223,0.32)] px-4 py-3 text-[0.75rem] font-semibold text-[#b8516f]"
                    >
                      {submitError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {submitting ? "Sending…" : "Send Application"}
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>
      </section>


    </PublicLayout>
  );
}
