"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Leaf,
  Loader2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { storeAuthResponse } from "@/lib/auth";
import type { AuthResponse } from "@/types";

const LOGO = "/logo/bluenest-logo.png";

const VALUES = [
  { icon: Sparkles, label: "Child-led" },
  { icon: Heart, label: "Family-first" },
  { icon: Leaf, label: "Outdoor play" },
];

const BRANCHES = ["Harrow", "Pinner", "Borehamwood", "Pinner Green"];

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
      storeAuthResponse(auth.access_token, auth.refresh_token ?? "", auth.user);
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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand panel (hidden on small screens) ───────────────────────── */}
      <div
        className="relative hidden flex-col justify-center overflow-hidden px-14 py-16 lg:flex xl:px-20"
        style={{ background: "linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 55%, #1e40af 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(760px 480px at 12% -8%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(620px 460px at 92% 104%, rgba(147,197,253,0.22), transparent 55%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
              maskImage: "radial-gradient(circle at 30% 40%, #000 0%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(circle at 30% 40%, #000 0%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative max-w-md">
          <div className="inline-flex rounded-2xl bg-white/95 p-3 shadow-lg">
            <Image src={LOGO} alt="Blue Nest Montessori" width={168} height={92} priority style={{ width: 168, height: "auto" }} />
          </div>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Nursery Management Platform</p>
          <h1 className="mt-3 font-body text-[1.9rem] font-semibold leading-tight text-white">
            Nurturing confident, capable children through authentic Montessori education.
          </h1>

          <div className="mt-9 flex flex-wrap gap-3">
            {VALUES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-blue-100" />
                <span className="text-xs font-medium text-white">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-white/15 pt-6">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <MapPin className="h-3.5 w-3.5" />
              Our nurseries
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-100">
              {BRANCHES.map((b, i) => (
                <span key={b} className="flex items-center gap-4">
                  {b}
                  {i < BRANCHES.length - 1 && <span className="h-1 w-1 rounded-full bg-blue-300/50" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <form onSubmit={onSubmit} className="w-full max-w-[24rem]">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Image src={LOGO} alt="Blue Nest Montessori" width={124} height={68} priority style={{ width: 124, height: "auto" }} className="lg:hidden" />
            <h2 className="mt-6 font-body text-2xl font-semibold text-slate-900 lg:mt-0">Sign in to your account</h2>
            <p className="mt-1.5 text-sm text-slate-500">Secure access for staff &amp; management</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bluenestmontessori.co.uk"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/25"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.45)] transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
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

          <div className="mt-6 flex items-center gap-3 text-slate-200">
            <div className="h-px flex-1 bg-current" />
            <span className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">or</span>
            <div className="h-px flex-1 bg-current" />
          </div>

          <Link
            href="/login"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Users className="h-4 w-4" />
            Parent &amp; family login
          </Link>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[0.68rem] text-slate-400 lg:justify-start">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secured, role-based access · Blue Nest Montessori
          </p>
        </form>
      </div>
    </div>
  );
}
