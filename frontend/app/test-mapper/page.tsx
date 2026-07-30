import type { Metadata } from "next";
import TestMapperClient from "./TestMapperClient";

export const metadata: Metadata = {
  title: "BlueNest TestFlow — Visual Mapper",
  robots: { index: false, follow: false },
};

export default function TestMapperPage() {
  return <TestMapperClient />;
}
