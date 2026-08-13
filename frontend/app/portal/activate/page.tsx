import { Suspense } from "react";
import type { Metadata } from "next";
import ActivateClient from "./ActivateClient";

export const metadata: Metadata = { title: "Activate your parent account", robots: { index: false, follow: false } };

export default function PortalActivatePage() {
  return (
    // Suspense: ActivateClient reads ?parent= and ?token= via useSearchParams.
    <Suspense>
      <ActivateClient />
    </Suspense>
  );
}
