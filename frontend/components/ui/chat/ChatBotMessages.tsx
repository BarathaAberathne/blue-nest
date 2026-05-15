"use client";

import { useEffect, useRef } from "react";
import ChatBotMessageBubble from "./ChatBotMessage";
import { useChatBot } from "./ChatBotContext";

export default function ChatBotMessages() {
  const { messages, isStreaming } = useChatBot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>("");

  const lastMsg = messages[messages.length - 1];
  const lastContent = lastMsg?.content ?? "";

  // Scroll when a new message is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Scroll during streaming as content grows
  useEffect(() => {
    if (isStreaming && lastContent !== lastContentRef.current) {
      lastContentRef.current = lastContent;
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isStreaming, lastContent]);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto px-4 py-4 flex-1 min-h-0 scroll-smooth">
      {messages.map((msg) => (
        <ChatBotMessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} className="h-px shrink-0" aria-hidden="true" />
    </div>
  );
}
