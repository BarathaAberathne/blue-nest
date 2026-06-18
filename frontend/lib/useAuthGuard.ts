"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getAuthUpdatedEventName, getAuthUser } from "@/lib/auth";
import type { User, UserRole } from "@/types";

/**
 * @param loginBasePath where to send unauthenticated users — defaults to the
 * parent/customer login (`/login`). Admin areas pass `/admin/login` so they
 * never bounce staff to the customer sign-in screen.
 */
export function useAuthGuard(loginBasePath: string = "/login") {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const sync = () => {
      setToken(getAccessToken());
      setUser(getAuthUser());
      setReady(true);
    };

    sync();
    const eventName = getAuthUpdatedEventName();
    window.addEventListener(eventName, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const redirectToLogin = useCallback((nextPath: string) => {
    router.push(`${loginBasePath}?next=${encodeURIComponent(nextPath)}`);
  }, [router, loginBasePath]);

  const ensureAuthenticated = useCallback((nextPath: string) => {
    const isAuthenticated = Boolean(token && user);
    if (!isAuthenticated) {
      redirectToLogin(nextPath);
      return false;
    }
    return true;
  }, [redirectToLogin, token, user]);

  const hasAnyRole = useCallback((roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const ensureRole = useCallback((roles: UserRole[], nextPath: string) => {
    if (!ensureAuthenticated(nextPath)) return false;
    if (!hasAnyRole(roles)) return false;
    return true;
  }, [ensureAuthenticated, hasAnyRole]);

  return {
    ready,
    token,
    user,
    isAuthenticated: Boolean(token && user),
    hasAnyRole,
    redirectToLogin,
    ensureAuthenticated,
    ensureRole,
  };
}
