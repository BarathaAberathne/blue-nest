"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import type { AuthResponse } from "@/types";

const LOGO = "/logo/bluenest-logo.png";

export default function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const auth = await api.adminLogin({ email, password }) as AuthResponse;
      setAuthSession(auth.access_token, auth.user);
      // Staff land in their restricted portal; the director lands on the MD
      // Command Centre; other management gets the standard dashboard.
      const landing =
        auth.user.role === "staff"
          ? "/admin/my-requests"
          : auth.user.role === "director"
            ? "/admin/command-center"
            : "/admin/dashboard";
      router.push(landing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12" style={{ background: "#070d1a" }}>
      {/* Ambient backdrop — blueprint grid + soft radial glows, matching the Command Centre palette */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(900px 560px at 18% -10%, rgba(54,169,255,0.16), transparent 60%), radial-gradient(700px 520px at 88% 108%, rgba(214,179,106,0.10), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,180,214,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,180,214,0.5) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(circle at 50% 35%, #000 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 35%, #000 0%, transparent 75%)",
          }}
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-[26rem] rounded-2xl border p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-9"
        style={{ background: "rgba(14,34,61,0.72)", borderColor: "rgba(54,169,255,0.18)" }}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src={LOGO} alt="Blue Nest Montessori" width={44} height={24} priority style={{ width: 44, height: "auto" }} />
          <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#d6b36a" }}>
            Nursery Management Platform
          </p>
          <h1 className="mt-1.5 font-body text-xl font-semibold text-white">Sign in to your account</h1>
          <p className="mt-1.5 text-sm" style={{ color: "#8aa6c6" }}>
            Staff &amp; management access
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: "#8aa6c6" }}>
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#5f7a9c" }} />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bluenestmontessori.co.uk"
                className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#5f7a9c] outline-none transition focus:ring-2"
                style={{ background: "rgba(7,19,33,0.7)", borderColor: "rgba(148,180,214,0.18)" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(54,169,255,0.45)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: "#8aa6c6" }}>
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#5f7a9c" }} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border py-2.5 pl-10 pr-11 text-sm text-white placeholder-[#5f7a9c] outline-none transition focus:ring-2"
                style={{ background: "rgba(7,19,33,0.7)", borderColor: "rgba(148,180,214,0.18)" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(54,169,255,0.45)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition hover:text-white"
                style={{ color: "#5f7a9c" }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm"
              style={{ background: "rgba(255,92,115,0.08)", borderColor: "rgba(255,92,115,0.3)", color: "#ff8b9a" }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #36a9ff, #2884d9)",
              boxShadow: submitting ? "none" : "0 8px 24px -6px rgba(54,169,255,0.5)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3" style={{ color: "rgba(148,180,214,0.25)" }}>
          <div className="h-px flex-1" style={{ background: "currentColor" }} />
          <span className="text-[0.65rem] font-medium uppercase tracking-wider" style={{ color: "#5f7a9c" }}>
            or
          </span>
          <div className="h-px flex-1" style={{ background: "currentColor" }} />
        </div>

        <Link
          href="/login"
          className="mt-4 flex w-full items-center justify-center rounded-xl border py-2.5 text-sm font-medium transition hover:text-white"
          style={{ borderColor: "rgba(148,180,214,0.18)", color: "#8aa6c6" }}
        >
          Parent &amp; family login
        </Link>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[0.68rem]" style={{ color: "#5f7a9c" }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Secured, role-based access · Blue Nest Montessori
        </p>
      </form>
    </div>
  );
}
