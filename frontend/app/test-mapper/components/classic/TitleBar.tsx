"use client";

interface TitleBarProps {
  title: string;
  minimized: boolean;
  onToggleMinimize: () => void;
}

export default function TitleBar({ title, minimized, onToggleMinimize }: TitleBarProps) {
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="tf-titlebar">
      <span style={{ fontSize: 15 }}>🗂️</span>
      <span>{title}</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        <button className="tf-titlebar-btn" onClick={onToggleMinimize} title={minimized ? "Restore" : "Minimize"}>
          {minimized ? "▢" : "_"}
        </button>
        <button className="tf-titlebar-btn" onClick={toggleFullscreen} title="Maximize / Restore (browser fullscreen)">
          ▢
        </button>
        <button className="tf-titlebar-btn tf-close" title="Not available in a browser tab">
          ✕
        </button>
      </div>
    </div>
  );
}
