"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/ui/PageWrapper";
import { api } from "@/lib/api";
import { getAuthUser, isManagementRole, storeAuthResponse } from "@/lib/auth";
import { mergeGuestCartToServer } from "@/lib/cart-sync";
import type { AuthResponse, UserRole } from "@/types";

// Where a user lands after signing in, by role. Staff get their supply-request
// portal, the director opens the Command Centre, every other management role
// (incl. deputy/regional managers, specialists and custom roles) lands on the
// admin dashboard, and parents fall through to their account area.
const landingFor = (role: UserRole, fallback: string) => {
  if (role === "staff") return "/admin/my-requests";
  if (role === "director") return "/admin/command-center";
  if (isManagementRole(role)) return "/admin/dashboard";
  return fallback;
};

export default function LoginClient() {
  const router = useRouter();
  const [next, setNext] = useState("/account");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/account");
    // A management or staff user who lands on the customer login belongs in the
    // back-office, not the parent account area.
    const existing = getAuthUser();
    if (existing) {
      const dest = landingFor(existing.role, "");
      if (dest) router.push(dest);
    }
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const auth = await api.login({ email, password }) as AuthResponse;
      storeAuthResponse(auth.access_token, auth.refresh_token ?? "", auth.user);
      // Carry any guest-cart items into the server cart before we redirect.
      await mergeGuestCartToServer(auth.access_token);
      // Route by role: management → admin, staff → supply requests. A customer
      // WITH a linked parent record belongs in the Parent Portal; a plain
      // store customer keeps the account area. An explicit ?next= always wins.
      const roleDest = landingFor(auth.user.role, "");
      if (roleDest) {
        router.push(roleDest);
      } else if (next !== "/account") {
        router.push(next);
      } else {
        const isParent = await api.portalGetMe(auth.access_token).then(() => true).catch(() => false);
        router.push(isParent ? "/portal" : "/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper className="flex justify-center">
      <form className="card p-8 w-full max-w-md" onSubmit={onSubmit}>
        <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your Blue Nest account.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-brand-600 hover:underline font-medium">
            Register
          </Link>
        </p>
      </form>
    </PageWrapper>
  );
}
