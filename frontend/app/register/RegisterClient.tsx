"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/ui/PageWrapper";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import type { AuthResponse } from "@/types";

export default function RegisterClient() {
  const router = useRouter();
  const [next, setNext] = useState("/account");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/account");
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const auth = await api.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      }) as AuthResponse;
      setAuthSession(auth.access_token, auth.user);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper className="flex justify-center">
      <form className="card p-8 w-full max-w-md" onSubmit={onSubmit}>
        <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">Create an account</h1>
        <p className="text-sm text-gray-500 mb-6">Join Blue Nest to shop and manage your orders.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-brand-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </PageWrapper>
  );
}
