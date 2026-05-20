"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { useChatBot } from "./ChatBotContext";

const QUICK_ACTIONS = [
  { label: "Book a Show Around", isLead: true },
  { label: "Fees & Funding", isLead: false },
  { label: "Our Curriculum", isLead: false },
  { label: "Forest School", isLead: false },
  { label: "Find a Branch", isLead: false },
];

export default function ChatBotInput() {
  const { sendMessage, openLeadForm, isStreaming, messages } = useChatBot();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show quick actions only on the welcome state
  const showQuickActions = messages.length <= 1;

  function handleSend() {
    if (!text.trim() || isStreaming) return;
    sendMessage(text);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    // Auto-grow textarea up to 3 rows
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
  }

  function handleQuickAction(action: typeof QUICK_ACTIONS[number]) {
    if (action.isLead) {
      openLeadForm();
    } else {
      sendMessage(action.label);
    }
  }

  return (
    <div className="border-t border-[rgba(90,74,66,0.07)] bg-[var(--soft-white)] px-4 pb-4 pt-3">
      {/* Quick action pills */}
      {showQuickActions && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action)}
              disabled={isStreaming}
              className="rounded-full border border-[rgba(110,207,201,0.4)] bg-[rgba(110,207,201,0.08)] px-3 py-1.5 text-xs font-bold text-[#4aa7a2] transition hover:bg-[rgba(110,207,201,0.18)] disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 rounded-[1.2rem] bg-[#f3f0ec] px-4 py-2.5">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={isStreaming ? "Blue Nest Bot is typing…" : "Ask anything about Blue Nest…"}
          aria-label="Type your message"
          className="flex-1 resize-none bg-transparent text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none disabled:opacity-50"
          style={{ maxHeight: 80 }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isStreaming}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6ecfc9] text-white shadow-[0_2px_8px_rgba(110,207,201,0.4)] transition hover:bg-[#5bbfb8] disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-[rgba(90,74,66,0.85)]">
        Blue Nest Bot · AI assistant · Not a substitute for professional advice
      </p>
    </div>
  );
}
