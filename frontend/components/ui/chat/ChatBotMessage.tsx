"use client";

import { motion } from "framer-motion";
import { marked } from "marked";
import ChatBotTyping from "./ChatBotTyping";
import type { ChatMessage } from "@/types/chat";

marked.use({ breaks: true, gfm: true });

interface Props {
  message: ChatMessage;
}

function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch {
    return content;
  }
}

export default function ChatBotMessageBubble({ message }: Props) {
  const isBot = message.role === "assistant";
  const isStreaming = message.status === "streaming";
  const isEmpty = isStreaming && message.content === "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {/* Bot avatar dot */}
      {isBot && (
        <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8ee2dc,#6ecfc9)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
        </div>
      )}

      <div
        className={[
          "max-w-[82%] px-4 py-3 text-sm leading-relaxed",
          isBot
            ? `rounded-[1.4rem] rounded-tl-[0.3rem] bg-white shadow-[0_2px_12px_rgba(90,74,66,0.1)] text-[var(--ink)] ${
                message.status === "error"
                  ? "border border-red-200 bg-red-50/60"
                  : "border border-[rgba(90,74,66,0.07)]"
              }`
            : "rounded-[1.4rem] rounded-tr-[0.3rem] bg-[linear-gradient(135deg,#6ecfc9,#5bbfb8)] text-white shadow-[0_2px_10px_rgba(110,207,201,0.35)]",
        ].join(" ")}
      >
        {isEmpty ? (
          <ChatBotTyping />
        ) : isBot ? (
          <div
            className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_p:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:mb-0.5 [&_strong]:font-bold [&_a]:text-[#4aa7a2] [&_a]:underline [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1,h2,h3]:font-bold [&_h1,h2,h3]:mb-1"
            // Safe: content originates from our controlled Anthropic API call
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : (
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        )}

        {isStreaming && message.content !== "" && (
          <span
            className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-[#6ecfc9] align-middle"
            aria-hidden="true"
          />
        )}
      </div>
    </motion.div>
  );
}
