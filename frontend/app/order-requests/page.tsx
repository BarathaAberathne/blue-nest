import type { Metadata } from "next";
import OrderRequestsClient from "./OrderRequestsClient";

export const metadata: Metadata = {
  title: "Supply Requests – Blue Nest",
  robots: { index: false, follow: false },
};

export default function OrderRequestsPage() {
  return <OrderRequestsClient />;
}
