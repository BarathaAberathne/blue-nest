"use client";

import { AnimatePresence } from "framer-motion";
import ChatBotHeader from "./ChatBotHeader";
import ChatBotMessages from "./ChatBotMessages";
import ChatBotInput from "./ChatBotInput";
import ChatBotLeadForm from "./ChatBotLeadForm";
import { useChatBot } from "./ChatBotContext";

export default function ChatBotWindow() {
  const { showLeadForm } = useChatBot();

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-[var(--paper)] shadow-[0_24px_60px_rgba(90,74,66,0.22)]"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(90,74,66,0.04) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Bottom-sheet drag handle — shown on mobile + tablet; hidden on
          desktop (≥lg) where the chat is a floating window. */}
      <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[rgba(90,74,66,0.15)] lg:hidden" aria-hidden="true" />

      <ChatBotHeader />

      <ChatBotMessages />

      <ChatBotInput />

      {/* Lead form slides over input area */}
      <AnimatePresence>{showLeadForm && <ChatBotLeadForm />}</AnimatePresence>
    </div>
  );
}
