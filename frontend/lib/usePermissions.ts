"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Permission } from "@/types";

const CACHE_KEY = "bn_permissions";

function readCache(): Permission[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Permission[]) : null;
  } catch {
    return null;
  }
}

/**
 * usePermissions resolves the caller's granular capabilities from GET /auth/me
 * (cached in sessionStorage for the tab), exposing a `has(permission)` gate the
 * admin shell uses to show/hide navigation and pages. While loading it returns
 * the cached set (or empty), so the UI never flashes the wrong nav.
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>(() => readCache() ?? []);
  const [ready, setReady] = useState<boolean>(() => readCache() !== null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setReady(true); return; }
    let cancelled = false;
    api.getMe(token)
      .then((me) => {
        if (cancelled) return;
        const perms = me?.permissions ?? [];
        setPermissions(perms);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(perms)); } catch { /* ignore */ }
      })
      .catch(() => { /* keep cached / empty */ })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const has = useCallback((perm: Permission) => permissions.includes(perm), [permissions]);
  const hasAny = useCallback((perms: Permission[]) => perms.some((p) => permissions.includes(p)), [permissions]);

  return { permissions, ready, has, hasAny };
}

export function clearPermissionsCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
