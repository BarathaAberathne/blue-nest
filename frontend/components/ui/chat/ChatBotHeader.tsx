"use client";

import { X, Sparkles } from "lucide-react";
import { useChatBot } from "./ChatBotContext";

export default function ChatBotHeader() {
  const { close, isStreaming } = useChatBot();

  return (
    <div className="flex shrink-0 items-center justify-between rounded-t-[2rem] bg-[linear-gradient(135deg,#8ee2dc_0%,#6ecfc9_100%)] px-5 py-4">
      {/* Identity */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/25">
          <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
            {/* Simple bird / nest icon */}
            <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.15)" />
            <path
              d="M14 6c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 11.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
              fill="white"
            />
          </svg>
          {/* Online dot */}
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
              isStreaming ? "animate-pulse bg-[#f7d774]" : "bg-[#7ecb8f]"
            }`}
            aria-hidden="true"
          />
        </div>

        {/* Name + status */}
        <div>
          <p className="font-heading text-[1.35rem] leading-tight text-white">Blue Nest Bot</p>
          <p className="text-xs text-white/85">
            {isStreaming ? "Typing…" : "Online · Typically replies instantly"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--butter)] opacity-80" aria-hidden="true" />
        <button
          type="button"
          onClick={close}
          aria-label="Close chat assistant"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
