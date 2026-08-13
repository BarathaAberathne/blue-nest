import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Backend-triggered on-demand cache invalidation. When public-facing data
// changes (e.g. a branch flips to coming_soon in the admin), the Go backend
// POSTs here so the site updates immediately instead of waiting out the ISR
// window. Authenticated by the REVALIDATE_SECRET shared env (server-side
// only, never NEXT_PUBLIC_*); with no secret configured the route is off.
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let scope = "layout";
  let paths: string[] = [];
  try {
    const body = (await req.json()) as { scope?: string; paths?: string[] };
    if (body?.scope) scope = body.scope;
    if (Array.isArray(body?.paths)) paths = body.paths;
  } catch {
    // empty body → default layout-wide invalidation
  }

  if (scope === "layout") {
    // Branch data renders on many routes (hero, nurseries section, branch
    // pages, contact) — invalidating the root layout refreshes them all.
    revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: ["/ (layout)"] });
  }

  const done: string[] = [];
  for (const p of paths.slice(0, 50)) {
    if (typeof p === "string" && p.startsWith("/")) {
      revalidatePath(p);
      done.push(p);
    }
  }
  return NextResponse.json({ revalidated: done });
}
