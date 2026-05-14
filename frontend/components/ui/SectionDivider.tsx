type Props = {
  /** Background colour of the section ABOVE — fills the rectangular container */
  from: string;
  /** Fill colour of the wave/torn path — matches the section BELOW */
  to: string;
  variant?: "wave" | "torn" | "scallop";
  /** Flip 180deg — use when divider sits at the top of the section below */
  flip?: boolean;
  className?: string;
};

// Organic asymmetric wave — varies in amplitude and rhythm
const WAVE =
  "M0,48 C140,72 280,12 460,42 C620,65 760,8 940,38 C1080,60 1260,15 1440,44 L1440,70 L0,70 Z";

// Hand-torn paper — irregular spacing, dramatic peaks, varying heights
const TORN =
  "M0,38 L38,18 L68,46 L108,14 L152,48 L184,22 L228,52 L264,18 " +
  "L296,42 L336,10 L380,46 L416,24 L448,56 L484,20 L520,44 " +
  "L556,16 L596,50 L628,26 L664,54 L704,14 L740,46 L776,24 " +
  "L820,52 L864,12 L900,44 L936,22 L972,50 L1008,18 L1048,46 " +
  "L1084,20 L1128,52 L1172,16 L1208,44 L1248,24 L1284,50 " +
  "L1320,18 L1360,46 L1400,22 L1440,40 L1440,70 L0,70 Z";

// Soft scallop bumps — like bunting or a ruffled hem
const SCALLOP =
  "M0,60 Q48,0 96,60 Q144,0 192,60 Q240,0 288,60 Q336,0 384,60 " +
  "Q432,0 480,60 Q528,0 576,60 Q624,0 672,60 Q720,0 768,60 " +
  "Q816,0 864,60 Q912,0 960,60 Q1008,0 1056,60 Q1104,0 1152,60 " +
  "Q1200,0 1248,60 Q1296,0 1344,60 Q1392,0 1440,60 L1440,70 L0,70 Z";

const paths = { wave: WAVE, torn: TORN, scallop: SCALLOP };

export default function SectionDivider({
  from,
  to,
  variant = "wave",
  flip = false,
  className = "",
}: Props) {
  return (
    <div
      aria-hidden="true"
      // `w-full` rather than `w-screen`: 100vw includes scrollbar width on
      // Windows/Linux Chrome, so `w-screen` pushes the divider a scrollbar-width
      // past the viewport and triggers horizontal scroll on every page that
      // uses a divider. `w-full` matches the section container exactly.
      className={`pointer-events-none -mb-px w-full overflow-hidden leading-none ${className}`}
      style={{ background: from }}
    >
      <svg
        viewBox="0 0 1440 70"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="block h-[50px] w-full sm:h-[65px] lg:h-[75px]"
        style={flip ? { transform: "scaleY(-1)" } : undefined}
      >
        <path d={paths[variant]} fill={to} />
      </svg>
    </div>
  );
}
