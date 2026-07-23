import type { User } from "@/types";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_UPDATED_EVENT = "blue-nest-auth-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

// A back-office (management) role is anything that isn't a parent/customer or a
// staff practitioner. This deliberately covers every built-in management role
// (incl. director, regional/deputy manager and the specialist officers) plus
// any custom role, so the admin shell and login routing never have to track a
// hardcoded list. Staff get their own portal; customers get the parent account.
export function isManagementRole(role?: string | null): boolean {
  return !!role && role !== "customer" && role !== "staff";
}

// Org-wide roles see every branch (no branch scope). Mirrors the backend
// policy.orgWide set — keep in sync. Scoped roles (regional/branch/deputy
// managers, specialists) are limited to their assigned branches, so the UI
// should not offer them an "all branches" view.
export function isOrgWideRole(role?: string | null): boolean {
  return role === "super_admin" || role === "admin" || role === "director";
}

// Narrows a branch list to the signed-in user's own scope, for dropdowns that
// create/filter branch-scoped records (daily log, rooms, staff, children…).
// This is a UI convenience only — the backend is the actual enforcement point
// (policy.EffectiveBranch / inScope) — so it fails open (returns the full list
// unfiltered) whenever it can't determine a scope, rather than ever hiding a
// branch a user is actually allowed to use. Many specialist roles (e.g.
// practitioner, room_leader) lack the admin.branches.manage permission needed
// to call GET /admin/branches, so this filters the public branch list against
// the user object already in local storage instead of fetching a scoped one.
export function scopedBranches<T extends { slug: string }>(branches: T[]): T[] {
  const user = getAuthUser();
  if (!user || isOrgWideRole(user.role)) return branches;
  const allowed = user.branch_slugs;
  if (!allowed || allowed.length === 0) return branches;
  return branches.filter((b) => allowed.includes(b.slug));
}

export function getAccessToken(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

export function getRefreshToken(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
}

/** Store access + refresh tokens (used by OAuth callback). Does NOT store user object. */
export function setTokens(accessToken: string, refreshToken: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function getAuthUser(): User | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuthSession(accessToken: string, user: User) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function storeAuthResponse(accessToken: string, refreshToken: string, user: User) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function getAuthUpdatedEventName() {
  return AUTH_UPDATED_EVENT;
}

