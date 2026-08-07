import { redirect } from "next/navigation";

// Legacy route: My Leave moved into the My Profile hub. Old notification rows
// (and bookmarks) still link here, so keep a permanent redirect.
export default function MyLeaveRedirect() {
  redirect("/admin/profile?tab=leave");
}
