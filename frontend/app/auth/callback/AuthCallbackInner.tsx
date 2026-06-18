"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { setTokens, storeAuthResponse } from "@/lib/auth";
import type { User } from "@/types";

export default function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const refresh = params.get("refresh") ?? "";
    if (!token) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    // Store tokens first so the /me call is authenticated, then hydrate the
    // full user object — the OAuth redirect only carries tokens, not the user.
    setTokens(token, refresh);
    api.getMe(token)
      .then((data) => {
        const user = data as User;
        storeAuthResponse(token, refresh, user);
        const isAdmin = user.role === "admin" || user.role === "branch_manager";
        router.replace(isAdmin ? "/admin/dashboard" : "/account");
      })
      .catch(() => {
        router.replace("/login?error=oauth_failed");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Signing you in...</p>
    </div>
  );
}
