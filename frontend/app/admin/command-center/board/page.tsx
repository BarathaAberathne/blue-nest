import type { Metadata } from "next";
import BoardClient from "../os/BoardClient";
import AccessGuard from "../AccessGuard";

// Placeholder Kanban board for Command Centre tasks. Shares the task store with
// the Tasks widget; a full backend-backed board (assignees, due dates, drag-drop,
// per-branch swimlanes) is planned — this is the intentional Stage placeholder.
export const metadata: Metadata = {
  title: "Task Board",
  robots: { index: false, follow: false },
};

export default function BoardPage() {
  return (
    <AccessGuard>
      <BoardClient />
    </AccessGuard>
  );
}
