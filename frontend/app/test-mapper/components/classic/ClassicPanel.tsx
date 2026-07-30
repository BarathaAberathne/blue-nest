"use client";

import { useState } from "react";

interface ClassicPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
}

/** A dockable-panel look-alike: blue title bar + pin/close, matching "Test
 * Explorer" / "Node Details" / "Process Map Overview" style panels. Close
 * genuinely collapses the panel (down to just its title bar) rather than
 * being a dead decorative button — click it again (the small restore
 * chevron takes its place) to bring the content back. */
export default function ClassicPanel({ title, icon, children, className, collapsible = true }: ClassicPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`tf-panel ${className ?? ""}`}>
      <div className="tf-panel-title">
        {icon}
        <span>{title}</span>
        {collapsible && (
          <div className="tf-panel-title-actions">
            <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Restore" : "Collapse"}>
              {collapsed ? "▢" : "_"}
            </button>
          </div>
        )}
      </div>
      {!collapsed && <div className="tf-panel-body">{children}</div>}
    </div>
  );
}
