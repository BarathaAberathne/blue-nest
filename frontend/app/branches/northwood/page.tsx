import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Blue Nest Montessori – Northwood (Coming Soon)" };

export default function NorthwoodBranchPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h1 className="section-title">Blue Nest Montessori – Northwood</h1>
            <Badge label="Coming Soon" variant="amber" />
          </div>
          <p className="section-subtitle mb-10">
            We are excited to be expanding to Northwood. Our newest branch will bring the same outstanding
            Montessori experience to HA6.
          </p>

          <div className="card p-8 text-center mb-8">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-3">
              Opening Soon
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Register your interest now to be first in line for a place and receive updates as we get closer to opening.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact" className="btn-primary">Register Interest</Link>
              <Link href="/admission" className="btn-outline">Learn About Admissions</Link>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading font-semibold text-gray-900 mb-2">Contact</h2>
            <p className="text-sm text-gray-500 mb-1">Northwood, London, HA6</p>
            <a href="mailto:northwood@bluenestmontessori.co.uk" className="text-sm text-brand-600 hover:underline">
              northwood@bluenestmontessori.co.uk
            </a>
          </div>
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
