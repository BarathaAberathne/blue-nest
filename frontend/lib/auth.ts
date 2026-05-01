import type { User } from "@/types";

const ACCESS_TOKEN_KEY = "access_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_UPDATED_EVENT = "blue-nest-auth-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
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

export function clearAuthSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function getAuthUpdatedEventName() {
  return AUTH_UPDATED_EVENT;
}

