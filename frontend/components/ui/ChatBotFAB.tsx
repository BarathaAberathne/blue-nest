"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import ChatBotCard from "./ChatBotCard";

export default function ChatBotFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating action button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat assistant"
        className="fixed bottom-6 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-[#6ecfc9] text-white shadow-[0_8px_24px_rgba(110,207,201,0.5)] transition-transform duration-200 hover:scale-110 active:scale-95 lg:hidden"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="fab-backdrop"
              className="fixed inset-0 z-[46] bg-[rgba(90,74,66,0.35)] backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            {/* Slide-up panel */}
            <motion.div
              key="fab-panel"
              className="fixed bottom-0 left-0 right-0 z-[47] flex flex-col items-center rounded-t-[2rem] bg-[var(--paper)] px-4 pb-8 pt-4 shadow-[0_-16px_50px_rgba(90,74,66,0.18)] lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {/* Drag handle */}
              <div className="mb-3 h-1.5 w-12 rounded-full bg-[rgba(90,74,66,0.15)]" />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)] text-[var(--ink)] transition hover:bg-[rgba(90,74,66,0.14)]"
              >
                <X className="h-5 w-5" />
              </button>

              <ChatBotCard />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
