"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { MeOrg, Permission } from "@/types";

const CACHE_KEY = "bn_permissions";
const ORG_CACHE_KEY = "bn_org";

function readCache(): Permission[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Permission[]) : null;
  } catch {
    return null;
  }
}

function readOrgCache(): MeOrg | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ORG_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MeOrg) : null;
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
  const [org, setOrg] = useState<MeOrg | null>(() => readOrgCache());
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
        setOrg(me?.org ?? null);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(perms));
          if (me?.org) sessionStorage.setItem(ORG_CACHE_KEY, JSON.stringify(me.org));
        } catch { /* ignore */ }
      })
      .catch(() => { /* keep cached / empty */ })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const has = useCallback((perm: Permission) => permissions.includes(perm), [permissions]);
  const hasAny = useCallback((perms: Permission[]) => perms.some((p) => permissions.includes(p)), [permissions]);
  // A feature is on when the org has no feature list configured (unrestricted)
  // or the list contains it — so flags act as an allowlist once set.
  const hasFeature = useCallback(
    (feature: string) => !org || !org.features?.length || org.features.includes(feature),
    [org],
  );

  return { permissions, ready, has, hasAny, org, hasFeature };
}

export function clearPermissionsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(ORG_CACHE_KEY);
  } catch { /* ignore */ }
}
