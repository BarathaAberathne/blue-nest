"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import type { AuthResponse } from "@/types";

export default function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <form className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl" onSubmit={onSubmit}>
      <p className="font-heading text-xl font-bold text-white mb-1">🌿 Blue Nest</p>
      <p className="text-gray-400 text-sm mb-6">Staff &amp; admin sign in</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@bluenestmontessori.co.uk"
            className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full mt-2" disabled={submitting}>
          {submitting ? "Signing In..." : "Sign In"}
        </button>
      </div>
      <p className="text-center mt-4">
        <Link href="/login" className="text-xs text-gray-500 hover:text-gray-300">Parent Login</Link>
      </p>
    </form>
  );
}
