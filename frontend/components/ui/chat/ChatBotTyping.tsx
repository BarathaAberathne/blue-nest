"use client";

import { motion } from "framer-motion";

export default function ChatBotTyping() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-label="Blue Nest Bot is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[#6ecfc9]"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
