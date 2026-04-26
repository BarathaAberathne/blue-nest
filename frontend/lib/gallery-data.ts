// ── Types ─────────────────────────────────────────────────────────────────────
// Designed for future Famly / YouTube / social integration.
// isPublic: false items are never rendered in the public gallery.

export type ContentType   = "photo" | "video" | "update";
export type BranchFilter  = "all" | "harrow" | "pinner" | "borehamwood";
export type CategoryFilter = "all" | "classroom" | "outdoor" | "events" | "learning";

export interface GalleryItem {
  id:          string;
  type:        ContentType;
  title:       string;
  description?: string;
  branch:      Exclude<BranchFilter,  "all">;
  category:    Exclude<CategoryFilter, "all">;
  date:        string;       // ISO "YYYY-MM-DD"
  featured:    boolean;
  source:      "famly" | "youtube" | "manual";
  isPublic:    boolean;
  // photos
  src?:         string;
  alt?:         string;
  aspectRatio?: number;      // height / width — drives masonry visual weight
  // videos
  youtubeId?:   string;
  thumbnailSrc?: string;
  duration?:    string;
  // updates
  excerpt?: string;
  href?:    string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
// Replace these arrays with API calls once Famly / YouTube are integrated.

export const GALLERY_ITEMS: GalleryItem[] = [
  // ── Photos ─────────────────────────────────────────────────────────────────
  {
    id: "p1",
    type: "photo",
    title: "Morning circle time",
    description: "Children gathering for morning welcome and Montessori work cycle.",
    branch: "harrow",
    category: "classroom",
    date: "2026-04-10",
    featured: true,
    source: "famly",
    isPublic: true,
    src: "/home/structured-routine.jpg",
    alt: "Children sitting in a circle during morning routine at Blue Nest Harrow",
    aspectRatio: 0.67,
  },
  {
    id: "p2",
    type: "photo",
    title: "Spring celebration",
    description: "Our annual spring event at Borehamwood — art, music, and movement.",
    branch: "borehamwood",
    category: "events",
    date: "2026-03-28",
    featured: true,
    source: "manual",
    isPublic: true,
    src: "/home/classroom-collage.png",
    alt: "Classroom collage of children's artwork and activities at Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p3",
    type: "photo",
    title: "Outdoor play — Pinner",
    description: "Free exploration on our adventure playground.",
    branch: "pinner",
    category: "outdoor",
    date: "2026-04-05",
    featured: true,
    source: "famly",
    isPublic: true,
    src: "/home/outdoor-childrens-play-area2.jpg",
    alt: "Children playing on outdoor equipment at Blue Nest Pinner",
    aspectRatio: 0.8,
  },
  {
    id: "p4",
    type: "photo",
    title: "Classroom exploration",
    description: "Hands-on Montessori materials in action.",
    branch: "harrow",
    category: "classroom",
    date: "2026-03-18",
    featured: false,
    source: "famly",
    isPublic: true,
    src: "/home/DSC_0151.jpg",
    alt: "Children working with Montessori learning materials at Harrow",
    aspectRatio: 1.0,
  },
  {
    id: "p5",
    type: "photo",
    title: "Creative arts session",
    description: "Painting, collage, and sensory art at Borehamwood.",
    branch: "borehamwood",
    category: "classroom",
    date: "2026-03-22",
    featured: false,
    source: "famly",
    isPublic: true,
    src: "/home/DSC_0177.jpg",
    alt: "Children creating art in the Borehamwood classroom",
    aspectRatio: 0.75,
  },
  {
    id: "p6",
    type: "photo",
    title: "Garden time at Harrow",
    description: "Tending the nursery garden — planting seeds and watering.",
    branch: "harrow",
    category: "outdoor",
    date: "2026-04-02",
    featured: false,
    source: "famly",
    isPublic: true,
    src: "/home/outdoor-childrens-play-area.jpg",
    alt: "Children exploring the outdoor play area at Blue Nest Harrow",
    aspectRatio: 0.67,
  },
  {
    id: "p7",
    type: "photo",
    title: "Forest school adventures",
    description: "Mud kitchens, log balance beams, and nature treasure hunts.",
    branch: "borehamwood",
    category: "outdoor",
    date: "2026-03-30",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/outdoor-learning-and-play-area.jpg",
    alt: "Outdoor learning and play area at Blue Nest Borehamwood",
    aspectRatio: 0.63,
  },
  {
    id: "p8",
    type: "photo",
    title: "Active learning",
    description: "Building fine motor skills through purposeful play.",
    branch: "harrow",
    category: "learning",
    date: "2026-04-08",
    featured: false,
    source: "famly",
    isPublic: true,
    src: "/home/outdoor-play-for-children.jpg",
    alt: "Children engaged in active outdoor learning at Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p9",
    type: "photo",
    title: "Discovery at Pinner",
    description: "Nature-inspired learning and scientific curiosity.",
    branch: "pinner",
    category: "learning",
    date: "2026-04-12",
    featured: false,
    source: "famly",
    isPublic: true,
    src: "/home/outdoor-play-for-children-new.jpg",
    alt: "Children discovering nature at Blue Nest Pinner",
    aspectRatio: 0.67,
  },

  // ── Videos ─────────────────────────────────────────────────────────────────
  {
    id: "v1",
    type: "video",
    title: "A day at Blue Nest Montessori",
    description: "Follow a typical day from morning arrival to afternoon exploration.",
    branch: "harrow",
    category: "classroom",
    date: "2026-04-01",
    featured: true,
    source: "youtube",
    isPublic: true,
    youtubeId: "ZRtdQ81jPUQ",
    thumbnailSrc: "/home/structured-routine.jpg",
    duration: "3:42",
  },
  {
    id: "v2",
    type: "video",
    title: "Our Forest School programme",
    description: "A look at how outdoor education shapes our youngest learners.",
    branch: "borehamwood",
    category: "outdoor",
    date: "2026-03-15",
    featured: false,
    source: "youtube",
    isPublic: true,
    youtubeId: "dQw4w9WgXcQ",
    thumbnailSrc: "/home/outdoor-learning-and-play-area.jpg",
    duration: "4:18",
  },
  {
    id: "v3",
    type: "video",
    title: "Montessori materials explained",
    description: "Our lead educator walks through key Montessori learning tools.",
    branch: "pinner",
    category: "learning",
    date: "2026-02-20",
    featured: false,
    source: "youtube",
    isPublic: true,
    youtubeId: "3JZ_D3ELwOQ",
    thumbnailSrc: "/home/DSC_0151.jpg",
    duration: "6:05",
  },

  // ── Updates ─────────────────────────────────────────────────────────────────
  {
    id: "u1",
    type: "update",
    title: "Spring term highlights from Harrow",
    description: "A round-up of our most memorable moments this spring term.",
    branch: "harrow",
    category: "events",
    date: "2026-04-14",
    featured: true,
    source: "manual",
    isPublic: true,
    excerpt:
      "This spring term has been full of discovery, creativity, and connection. From our garden planting project to the spring showcase, our children have been busy exploring the world around them.",
    href: "/blog",
  },
  {
    id: "u2",
    type: "update",
    title: "New outdoor equipment at Pinner",
    description: "We've upgraded our outdoor learning space with new adventure structures.",
    branch: "pinner",
    category: "outdoor",
    date: "2026-03-20",
    featured: false,
    source: "manual",
    isPublic: true,
    excerpt:
      "We are thrilled to unveil our newly upgraded outdoor area at Pinner. The new climbing frame, mud kitchen, and sensory garden have already become firm favourites with the children.",
    href: "/blog",
  },
  {
    id: "u3",
    type: "update",
    title: "Borehamwood earns Forest School Gold",
    description: "Our Borehamwood branch has been awarded the Forest School Gold accreditation.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-03-05",
    featured: false,
    source: "manual",
    isPublic: true,
    excerpt:
      "We are incredibly proud to announce that Blue Nest Borehamwood has been awarded the Forest School Gold Award, recognising our commitment to nature-based learning and outdoor education.",
    href: "/blog",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const BRANCH_COLOURS: Record<Exclude<BranchFilter, "all">, string> = {
  harrow:      "#f4aac8",
  pinner:      "#7fd8d2",
  borehamwood: "#7fd8d2",
};

export const CATEGORY_LABELS: Record<Exclude<CategoryFilter, "all">, string> = {
  classroom: "Classroom",
  outdoor:   "Outdoor",
  events:    "Events",
  learning:  "Learning",
};
