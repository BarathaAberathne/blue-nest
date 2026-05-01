"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearAuthSession } from "@/lib/auth";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { User } from "@/types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-1">
        {label}
      </p>
      <p className="rounded-xl border border-[rgba(90,74,66,0.09)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}

export default function AccountClient() {
  const router = useRouter();
  const { ready, user: authUser, ensureAuthenticated } = useAuthGuard();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!ensureAuthenticated("/account")) return;
    setUser(authUser);
  }, [authUser, ensureAuthenticated, ready]);

  if (!user) return null;

  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
    user.email[0].toUpperCase();

  return (
    <div className="space-y-5 max-w-lg">
      {/* Profile card */}
      <div className="rounded-[2rem] bg-[var(--soft-white)] shadow-[0_14px_40px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.06)] p-6">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7fd8d2, #cf7d9c)" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-heading text-[1.6rem] leading-none text-[var(--ink)]">
              {user.first_name} {user.last_name}
            </p>
            <span className="mt-1.5 inline-block rounded-full bg-[rgba(127,216,210,0.20)] px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-[#3aada9]">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <Field label="First Name" value={user.first_name} />
          <Field label="Last Name"  value={user.last_name}  />
          <Field label="Email"      value={user.email}      />
        </div>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={() => {
          clearAuthSession();
          router.push("/login");
        }}
        className="flex items-center gap-2 rounded-full border border-[rgba(90,74,66,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:border-[rgba(90,74,66,0.30)] hover:text-[var(--ink)]"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
