"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { ChatBotProvider, useChatBot } from "./ChatBotContext";
import ChatBotWindow from "./ChatBotWindow";

function Widget() {
  const { isOpen, open, close, unreadCount } = useChatBot();
  const [showPulse, setShowPulse] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  // Attention pulse after 3 s on first load if not yet opened
  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasOpened) setShowPulse(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [hasOpened]);

  function handleOpen() {
    setHasOpened(true);
    setShowPulse(false);
    open();
  }

  return (
    <>
      {/* ── Mobile + tablet backdrop ─────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cb-backdrop"
            className="fixed inset-0 z-[58] bg-[rgba(90,74,66,0.3)] backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Chat window ──────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cb-window"
            className={[
              "fixed z-[59] overflow-hidden",
              // Mobile + tablet (<1024px): full-width bottom sheet.
              // Uses dvh so the iOS browser chrome / soft keyboard shrink
              // the sheet rather than pushing it out of view.
              "inset-x-0 bottom-0 h-[88dvh] max-h-[680px] rounded-t-[2rem]",
              // Desktop (≥1024px): floating window pinned bottom-right.
              // max-h ensures it never exceeds the viewport on short
              // displays (e.g. iPad landscape, laptop at 100% scale).
              "lg:inset-auto lg:bottom-24 lg:right-6",
              "lg:h-[640px] lg:max-h-[calc(100dvh-8rem)] lg:w-[400px] lg:rounded-[2rem]",
            ].join(" ")}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Blue Nest Bot chat assistant"
          >
            <ChatBotWindow />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB button ───────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[60]" role="complementary" aria-label="Chat assistant">
        {/* Pulse ring — decorative; must not intercept taps. The scale
            animation grows it past the button's box, so without
            pointer-events-none an edge tap can land on the pulse instead
            of the button on touch devices. */}
        {showPulse && !isOpen && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full bg-[#6ecfc9]/50"
            animate={{ scale: [1, 1.65], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}

        {/* Unread badge — decorative; ditto. */}
        {unreadCount > 0 && !isOpen && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#e87d9a] text-[10px] font-bold text-white shadow-md"
            aria-label={`${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}

        <motion.button
          type="button"
          onClick={isOpen ? close : handleOpen}
          aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
          aria-expanded={isOpen}
          className="flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[linear-gradient(135deg,#8ee2dc,#6ecfc9)] text-white shadow-[0_8px_24px_rgba(110,207,201,0.5)] transition-shadow hover:shadow-[0_10px_28px_rgba(110,207,201,0.65)]"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <X className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span
                key="msg"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <MessageCircle className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}

export default function ChatBotWidget() {
  return (
    <ChatBotProvider>
      <Widget />
    </ChatBotProvider>
  );
}
