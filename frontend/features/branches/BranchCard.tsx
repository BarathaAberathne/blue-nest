import Link from "next/link";
import type { Branch } from "@/types";
import Badge from "@/components/ui/Badge";

export default function BranchCard({ branch }: { branch: Branch }) {
  return (
    <Link
      href={`/branches/${branch.slug}`}
      className="card p-6 block hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-heading font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
          {branch.name}
        </h3>
        {branch.status === "coming_soon" ? (
          <Badge label="Coming Soon" variant="amber" />
        ) : (
          <Badge label="Open" variant="green" />
        )}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">{branch.short_description}</p>
      {branch.status === "active" && (
        <p className="text-xs text-gray-400">{branch.contact.address}</p>
      )}
    </Link>
  );
}
