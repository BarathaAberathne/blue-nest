"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { UserRole } from "@/types";

// The Command Centre renders its own full-screen shell (it deliberately does NOT
// use AdminLayout), so it can't rely on the layout's route guard. This wrapper
// restricts the whole surface to the Managing Director + Super Admin; everyone
// else is bounced to their dashboard (or the login page if unauthenticated).
const ALLOWED_ROLES: UserRole[] = ["super_admin", "director"];

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    const user = getAuthUser();
    if (user && ALLOWED_ROLES.includes(user.role as UserRole)) {
      setState("ok");
      return;
    }
    router.replace(user ? "/admin/dashboard" : "/admin/login");
  }, [router]);

  if (state !== "ok") return null;
  return <>{children}</>;
}
