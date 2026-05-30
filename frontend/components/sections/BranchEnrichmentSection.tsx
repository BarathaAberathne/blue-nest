import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Motion";
import type { LucideIcon } from "lucide-react";

export interface EnrichmentActivity {
  name:   string;
  icon:   LucideIcon;
  accent: string;
}

interface Props {
  activities: EnrichmentActivity[];
  branchName: string;
  rightSlot?: ReactNode;
}

export default function BranchEnrichmentSection({ activities, branchName, rightSlot }: Props) {
  const enrichmentContent = (
    <>
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-kicker">Enrichment activities</span>
          <h2 className="section-title mt-4">Weekly Enrichment Activities</h2>
          <p className="body-text mt-5">
            Alongside Montessori learning, children at our {branchName} nursery enjoy a rich
            weekly programme of movement, music, language and early technology activities —
            designed to build confidence, creativity and curiosity.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <ul
          className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2.5 sm:gap-3"
          aria-label={`Weekly enrichment activities at Blue Nest Montessori ${branchName}`}
        >
          {activities.map((a) => (
            <li key={a.name} className="pastel-chip">
              <a.icon
                className="h-4 w-4 shrink-0"
                style={{ color: a.accent }}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span>{a.name}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-[var(--muted)]">
          Activities may vary by term, timetable and child age group.
        </p>
      </Reveal>
    </>
  );

  return (
    <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="container-site">
        {rightSlot ? (
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div>{enrichmentContent}</div>
            <div>{rightSlot}</div>
          </div>
        ) : (
          enrichmentContent
        )}
      </div>
    </section>
  );
}
