"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { AssignableRole, UserRole } from "@/types";

// The render fallback when GET /admin/roles/assignable is unreachable — the
// built-in back-office roles (matches the org-seeded defaults). Custom roles
// only ever come from the live endpoint.
const FALLBACK_ROLES: AssignableRole[] = ([
  "staff", "practitioner", "apprentice", "room_leader", "eyfs_lead", "senco",
  "office_admin", "admissions_officer", "finance_officer", "hr_officer", "kitchen", "maintenance",
  "deputy_manager", "branch_manager", "regional_manager", "director",
  "external_inspector", "finance", "admissions", "procurement", "admin", "super_admin",
] as UserRole[]).map((name) => ({ name, label: name.replace(/_/g, " "), is_custom: false }));

// Org-admin-tier roles: the staff form's login section doesn't offer them —
// backend policy.CanGrantRole gates them behind super-admin callers, so for
// every other staff.manage holder they'd only ever error. Assign them on
// /admin/users. Mirrors the backend guard — keep in sync.
const ADMIN_TIER: UserRole[] = ["super_admin", "admin", "director"];

// useAssignableRoles is the ONE source every role picker renders from —
// built-in AND Permission-Builder custom roles, live from the org's role
// definitions, so a new custom role appears in every picker without a code
// change. `forStaffLogin` narrows to what the staff form may assign.
export function useAssignableRoles(forStaffLogin = false): AssignableRole[] {
  const [roles, setRoles] = useState<AssignableRole[]>(FALLBACK_ROLES);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.adminGetAssignableRoles(token)
      .then((r) => { if (r?.length) setRoles(r); })
      .catch(() => { /* keep fallback */ });
  }, []);
  return forStaffLogin ? roles.filter((r) => !ADMIN_TIER.includes(r.name)) : roles;
}
