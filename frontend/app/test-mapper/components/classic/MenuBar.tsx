"use client";

import { useEffect, useRef, useState } from "react";

interface MenuBarProps {
  onRefresh: () => void;
  onSetView: (v: "explorer" | "runs") => void;
  density: "comfortable" | "compact";
  onSetDensity: (d: "comfortable" | "compact") => void;
  onFocusSearch: () => void;
  onCopyCommand: (cmd: string) => void;
  onShowAbout: () => void;
}

const RUN_COMMANDS = [
  { label: "Copy: run everything", cmd: "make test-new" },
  { label: "Copy: run one suite", cmd: "make test-suite SUITE=SUI-REG-001" },
  { label: "Copy: run one case", cmd: "make test-case CASE=KEY-TC-001" },
  { label: "Copy: validate only", cmd: "make test-validate" },
];

export default function MenuBar({ onRefresh, onSetView, density, onSetDensity, onFocusSearch, onCopyCommand, onShowAbout }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function item(label: string, action: () => void) {
    return (
      <button
        key={label}
        onClick={() => {
          action();
          setOpenMenu(null);
        }}
      >
        {label}
      </button>
    );
  }

  const menus: Record<string, React.ReactNode> = {
    File: (
      <>
        {item("Refresh Data", onRefresh)}
        <hr />
        {item("Print View", () => window.print())}
      </>
    ),
    View: (
      <>
        {item(`${density === "comfortable" ? "✓ " : ""}Comfortable Density`, () => onSetDensity("comfortable"))}
        {item(`${density === "compact" ? "✓ " : ""}Compact Density`, () => onSetDensity("compact"))}
        <hr />
        {item("Explorer", () => onSetView("explorer"))}
        {item("Runs", () => onSetView("runs"))}
      </>
    ),
    Tests: (
      <>
        {item("Go to Test Explorer", () => onSetView("explorer"))}
        {item("Focus Search", onFocusSearch)}
      </>
    ),
    Runs: (
      <>
        {item("Go to Runs Screen", () => onSetView("runs"))}
        {item("Refresh Run History", onRefresh)}
      </>
    ),
    Reports: <>{item("View Latest Report", () => onSetView("runs"))}</>,
    Tools: (
      <>
        {RUN_COMMANDS.map((c) => item(c.label, () => onCopyCommand(c.cmd)))}
      </>
    ),
    Window: <>{item("Reset Layout", () => window.location.reload())}</>,
    Help: <>{item("About BlueNest TestFlow", onShowAbout)}</>,
  };

  return (
    <div className="tf-menubar" ref={ref}>
      {Object.entries(menus).map(([label, content]) => (
        <div key={label} style={{ position: "relative" }}>
          <div
            className={`tf-menu-item ${openMenu === label ? "tf-open" : ""}`}
            onClick={() => setOpenMenu(openMenu === label ? null : label)}
          >
            {label}
          </div>
          {openMenu === label && <div className="tf-menu-dropdown">{content}</div>}
        </div>
      ))}
    </div>
  );
}
