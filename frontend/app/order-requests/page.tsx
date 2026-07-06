import { redirect } from "next/navigation";

// Supply requests moved into the admin back-office (/admin/my-requests). Keep
// this route as a permanent redirect so old links/bookmarks still work.
export default function OrderRequestsRedirect() {
  redirect("/admin/my-requests");
}
