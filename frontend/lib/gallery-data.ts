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
  // Each branch has 5 photo items so the branch-filter chip is never empty.
  // All `src` paths point at optimised assets in /public/home/branches/.

  // Harrow (5)
  {
    id: "p-h1",
    type: "photo",
    title: "Story-time prepared environment",
    description: "Little Red Riding Hood storytelling set on the Montessori work table.",
    branch: "harrow",
    category: "classroom",
    date: "2026-04-10",
    featured: true,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-01.webp",
    alt: "Storytelling table with Little Red Riding Hood books and Montessori letter cards at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h2",
    type: "photo",
    title: "Little Ducks water play",
    description: "Toddler-friendly water table activity.",
    branch: "harrow",
    category: "learning",
    date: "2026-04-08",
    featured: true,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-02.webp",
    alt: "Toddler at the Little Ducks water-play table at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h3",
    type: "photo",
    title: "Citrus sensory tray",
    description: "Hands-on discovery with citrus, water, and natural materials.",
    branch: "harrow",
    category: "learning",
    date: "2026-04-02",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-03.webp",
    alt: "Teacher and toddler exploring a citrus water sensory tray at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h4",
    type: "photo",
    title: "Outdoor garden",
    description: "Wisteria-shaded garden and outdoor learning area.",
    branch: "harrow",
    category: "outdoor",
    date: "2026-03-25",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-preview-01.webp",
    alt: "Children playing in the wisteria-shaded garden at Blue Nest Harrow",
    aspectRatio: 0.67,
  },
  {
    id: "p-h5",
    type: "photo",
    title: "Fizzy volcano experiment",
    description: "STEM curiosity through a hands-on chemistry experiment.",
    branch: "harrow",
    category: "events",
    date: "2026-03-15",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-05.webp",
    alt: "Three children running a fizzy volcano experiment at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h6",
    type: "photo",
    title: "Balance frames",
    description: "Practical-life balance frames help young children develop core stability.",
    branch: "harrow",
    category: "learning",
    date: "2026-03-10",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-04.webp",
    alt: "Child walking on Montessori balance frames at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h7",
    type: "photo",
    title: "Little Red Riding Hood reading",
    description: "Calm one-to-one storytelling with a Blue Nest teacher.",
    branch: "harrow",
    category: "classroom",
    date: "2026-03-05",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-06.webp",
    alt: "Blue Nest Harrow teacher reading Little Red Riding Hood with a child",
    aspectRatio: 0.75,
  },
  {
    id: "p-h8",
    type: "photo",
    title: "Outdoor sensory tray",
    description: "Natural materials, water and texture exploration outdoors.",
    branch: "harrow",
    category: "outdoor",
    date: "2026-02-28",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-07.webp",
    alt: "Child focused on an outdoor wood-and-water sensory tray at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h9",
    type: "photo",
    title: "Music sessions",
    description: "Weekly enrichment music programme.",
    branch: "harrow",
    category: "events",
    date: "2026-02-25",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-09.webp",
    alt: "Child playing a drum kit during a music session at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h10",
    type: "photo",
    title: "Imaginative role-play",
    description: "Ice-cream parlour role-play builds early social skills.",
    branch: "harrow",
    category: "classroom",
    date: "2026-02-20",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-10.webp",
    alt: "Children at the ice-cream parlour role-play area at Blue Nest Harrow",
    aspectRatio: 0.75,
  },

  // Harrow — 2026-06 refresh (14 new photos)
  {
    id: "p-h11", type: "photo", title: "Outdoor activities", description: "Children gathered around an outdoor activity table in the garden.",
    branch: "harrow", category: "outdoor", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-11.webp",
    alt: "Children gathered around an outdoor activity table in the Blue Nest Harrow garden",
    aspectRatio: 0.75,
  },
  {
    id: "p-h12", type: "photo", title: "Our garden", description: "The outdoor play area with slide, climbing toys and pergola.",
    branch: "harrow", category: "outdoor", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-12.webp",
    alt: "The outdoor play area with a slide, climbing toys and pergola at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h13", type: "photo", title: "Creative craft", description: "Exploring colourful dough and craft materials.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-13.webp",
    alt: "Children exploring colourful dough and craft materials at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h14", type: "photo", title: "Small-world play", description: "A colourful small-world village set up for imaginative play.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-14.webp",
    alt: "A colourful small-world village and animal display set up for imaginative play at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h15", type: "photo", title: "Guided learning", description: "An educator guiding two children through a tabletop activity.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-15.webp",
    alt: "An educator guiding two children through a tabletop Montessori activity at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h16", type: "photo", title: "Working together", description: "An educator supporting a small group at the activity table.",
    branch: "harrow", category: "classroom", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-16.webp",
    alt: "An educator supporting a small group at the activity table at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h17", type: "photo", title: "Our classroom", description: "Children busy at activity tables across the bright classroom.",
    branch: "harrow", category: "classroom", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-17.webp",
    alt: "Children busy at activity tables across the bright Montessori classroom at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h18", type: "photo", title: "Hands-on making", description: "A child and educator working closely on a craft activity.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-18.webp",
    alt: "Close-up of a child and educator working on a craft activity at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h19", type: "photo", title: "Fine-motor focus", description: "A toddler concentrating on a colourful threading activity.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-19.webp",
    alt: "Toddler concentrating on a colourful threading activity at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h20", type: "photo", title: "Playtime together", description: "Children enjoying playtime together.",
    branch: "harrow", category: "classroom", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-20.webp",
    alt: "Children enjoying playtime together at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h21", type: "photo", title: "Our Studio classroom", description: "Children learning in the Studio classroom.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-21.webp",
    alt: "Children learning in the Studio classroom at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h22", type: "photo", title: "Group Music Sessions", description: "Children gathered for a group music session.",
    branch: "harrow", category: "classroom", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-22.webp",
    alt: "Children gathered for a group music session at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h23", type: "photo", title: "Early Mathematics", description: "Working on early mathematics with an educator.",
    branch: "harrow", category: "learning", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-23.webp",
    alt: "A child working on early mathematics with an educator at Blue Nest Harrow",
    aspectRatio: 0.75,
  },
  {
    id: "p-h24", type: "photo", title: "Prepared environment", description: "A well-prepared classroom with natural materials and open shelves.",
    branch: "harrow", category: "classroom", date: "2026-05-01", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/harrow/harrow-gallery-24.webp",
    alt: "A well-prepared Montessori classroom with natural materials and open shelves at Blue Nest Harrow",
    aspectRatio: 0.75,
  },

  // Pinner (14 — 2026-06 refresh)
  {
    id: "p-p1", type: "photo", title: "Tabletop activity", description: "An educator and children at the activity table.",
    branch: "pinner", category: "classroom", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-01.webp",
    alt: "An educator and children at a tabletop snack and craft activity at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p2", type: "photo", title: "Small-world garden", description: "A small-world village and animal display in the garden.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-02.webp",
    alt: "Children exploring a small-world village and animal display in the Blue Nest Pinner garden", aspectRatio: 0.75,
  },
  {
    id: "p-p3", type: "photo", title: "Outdoor activity", description: "An educator with children at an outdoor table.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-03.webp",
    alt: "An educator with children at an outdoor activity table at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p4", type: "photo", title: "Reading & letters", description: "Children at a reading and letters activity.",
    branch: "pinner", category: "learning", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-04.webp",
    alt: "Children at a reading and letters activity at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p5", type: "photo", title: "Guided learning", description: "One-to-one tabletop learning with an educator.",
    branch: "pinner", category: "learning", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-05.webp",
    alt: "A child working on a tabletop activity with an educator at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p6", type: "photo", title: "Water play", description: "Children at the outdoor water-play table.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-06.webp",
    alt: "Children gathered around the outdoor water-play table at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p7", type: "photo", title: "Sensory water play", description: "An educator and children at the water table.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-07.webp",
    alt: "An educator and children at the outdoor water-play table at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p8", type: "photo", title: "Outdoor learning", description: "An outdoor floor activity on a colourful mat.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-08.webp",
    alt: "Children at an outdoor floor activity on a colourful mat at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p9", type: "photo", title: "Group time outdoors", description: "A group activity on the mat outdoors.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-09.webp",
    alt: "Children gathered for a group activity on the mat outdoors at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p10", type: "photo", title: "Garden play", description: "Playing with toys on a mat in the garden.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-10.webp",
    alt: "Children playing with toys on a mat in the Blue Nest Pinner garden", aspectRatio: 0.75,
  },
  {
    id: "p-p11", type: "photo", title: "Outdoor exploration", description: "Exploring the outdoor garden.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-11.webp",
    alt: "A child exploring the outdoor garden at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p12", type: "photo", title: "Mud kitchen", description: "The outdoor Mud Cafe mud-kitchen station.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-12.webp",
    alt: "Children at the outdoor Mud Cafe mud-kitchen station at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p13", type: "photo", title: "Mud play", description: "Playing at the outdoor mud kitchen.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-13.webp",
    alt: "A child playing at the outdoor mud kitchen at Blue Nest Pinner", aspectRatio: 0.75,
  },
  {
    id: "p-p14", type: "photo", title: "Nature display", description: "A small-world nature display in the garden.",
    branch: "pinner", category: "outdoor", date: "2026-05-28", featured: false, source: "manual", isPublic: true,
    src: "/home/branches/pinner/pinner-gallery-14.webp",
    alt: "A small-world nature display with plants and toy animals in the Blue Nest Pinner garden", aspectRatio: 0.75,
  },

  // Borehamwood (5)
  {
    id: "p-b1",
    type: "photo",
    title: "Volcano science experiment",
    description: "Children watch the volcano erupt during a hands-on science experiment.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-04-10",
    featured: true,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-04.webp",
    alt: "Children and a practitioner watching the erupting volcano science experiment at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b2",
    type: "photo",
    title: "Role-play farm shop",
    description: "Imaginative play together at the role-play farm shop.",
    branch: "borehamwood",
    category: "classroom",
    date: "2026-04-02",
    featured: true,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-hero.webp",
    alt: "Children exploring the role-play farm shop at Blue Nest Borehamwood",
    aspectRatio: 0.67,
  },
  {
    id: "p-b3",
    type: "photo",
    title: "Arctic small-world display",
    description: "A small-world Arctic scene with igloos and polar animals.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-03-22",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-08.webp",
    alt: "Arctic small-world display with igloos and polar animals at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b4",
    type: "photo",
    title: "Hands-on sensory play",
    description: "Children and a practitioner enjoying a hands-on sensory activity.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-03-18",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-09.webp",
    alt: "Children and a practitioner laughing during a hands-on sensory activity at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b5",
    type: "photo",
    title: "Exploring the human body",
    description: "Learning about the human body on the anatomy floor mat.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-03-10",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-05.webp",
    alt: "Child learning about the human body on the anatomy floor mat at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b6",
    type: "photo",
    title: "Small-world sensory tray",
    description: "Imaginative small-world play in the sand sensory tray.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-03-08",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-01.webp",
    alt: "Children exploring a small-world sand sensory tray at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b7",
    type: "photo",
    title: "Mark-making table",
    description: "Early writing and mark-making with a practitioner.",
    branch: "borehamwood",
    category: "classroom",
    date: "2026-03-01",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-02.webp",
    alt: "Child practising early mark-making with a practitioner at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b8",
    type: "photo",
    title: "Sensory projection room",
    description: "Exploring the immersive underwater sensory projection room.",
    branch: "borehamwood",
    category: "classroom",
    date: "2026-02-22",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-03.webp",
    alt: "Children exploring the immersive underwater sensory projection room at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b9",
    type: "photo",
    title: "The human body — skeleton",
    description: "Discovering the life-size skeleton during the Human Body topic.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-02-15",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-06.webp",
    alt: "Children exploring the life-size skeleton model at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },
  {
    id: "p-b10",
    type: "photo",
    title: "Role-play shop",
    description: "Imaginative play together in the role-play shop.",
    branch: "borehamwood",
    category: "classroom",
    date: "2026-02-10",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-07.webp",
    alt: "Children playing together in the role-play shop at Blue Nest Borehamwood",
    aspectRatio: 0.67,
  },
  {
    id: "p-b11",
    type: "photo",
    title: "Sensory light play",
    description: "A child delighted by the colourful sensory light projection.",
    branch: "borehamwood",
    category: "learning",
    date: "2026-02-05",
    featured: false,
    source: "manual",
    isPublic: true,
    src: "/home/branches/borehamwood/borehamwood-gallery-10.webp",
    alt: "Child delighted by the colourful sensory light projection at Blue Nest Borehamwood",
    aspectRatio: 0.75,
  },

  // ── Videos ─────────────────────────────────────────────────────────────────
  // (none yet — real Blue Nest videos to be added; placeholders removed)

  // ── Updates ────────────────────────────────────────────────────────────────
  // (none — Updates tab retired)
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Branch colour tokens — matches the per-branch design tokens defined
// in styles/globals.css (--branch-* variables) so the gallery chips
// match the rest of the site.
export const BRANCH_COLOURS: Record<Exclude<BranchFilter, "all">, string> = {
  harrow:      "#E99FC1",  // rose
  pinner:      "#7ECFC8",  // teal
  borehamwood: "#BFD3A1",  // sage  (was the same teal as Pinner — fixed)
};

export const CATEGORY_LABELS: Record<Exclude<CategoryFilter, "all">, string> = {
  classroom: "Classroom",
  outdoor:   "Outdoor",
  events:    "Events",
  learning:  "Learning",
};
