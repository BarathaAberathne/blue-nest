"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getPageContext } from "@/lib/chatbot-knowledge";
import type { ChatMessage, LeadFormData, PageContext } from "@/types/chat";

const SESSION_KEY = "bn-chat-session";

interface ChatBotContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  showLeadForm: boolean;
  leadSubmitted: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (content: string) => Promise<void>;
  openLeadForm: () => void;
  closeLeadForm: () => void;
  submitLead: (data: LeadFormData) => Promise<void>;
}

const ChatBotContext = createContext<ChatBotContextValue | null>(null);

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! 👋 I'm the Blue Nest assistant. Whether you're curious about our Montessori approach, fees, or ready to book a show-around — I'm here to help. What would you like to know?",
  status: "complete",
  timestamp: 0,
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSession(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSession(messages: ChatMessage[]) {
  try {
    // Only persist complete/error messages (not streaming placeholders)
    const toSave = messages.filter((m) => m.status !== "streaming");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded — ignore */ }
}

export function ChatBotProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs to avoid stale closures in async sendMessage
  const messagesRef = useRef<ChatMessage[]>([]);
  const isOpenRef = useRef(false);
  const isStreamingRef = useRef(false);
  const pageRef = useRef<PageContext>("general");

  // Keep refs in sync (in an effect — mutating refs during render is a
  // react-hooks/refs violation). These are read only inside the async
  // sendMessage, which always runs after mount + effect flush, so updating
  // them post-render is behaviorally equivalent.
  useEffect(() => {
    messagesRef.current = messages;
    isOpenRef.current = isOpen;
    isStreamingRef.current = isStreaming;
    pageRef.current = getPageContext(pathname);
  });

  // Load session on mount
  useEffect(() => {
    const saved = loadSession();
    setMessages(saved.length > 0 ? saved : [WELCOME]);
  }, []);

  // Persist on message changes
  useEffect(() => {
    if (messages.length > 0 && messages[0]?.id !== "welcome" || messages.length > 1) {
      saveSession(messages);
    }
  }, [messages]);

  const open = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const openLeadForm = useCallback(() => setShowLeadForm(true), []);
  const closeLeadForm = useCallback(() => setShowLeadForm(false), []);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isStreamingRef.current) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
      status: "complete",
      timestamp: Date.now(),
    };

    const botMsgId = generateId();

    // Build API payload before state mutations to avoid stale closure
    const apiMessages = [
      ...messagesRef.current
        .filter((m) => m.status !== "error" && m.id !== "welcome")
        .map((m) => ({ role: m.role as string, content: m.content })),
      { role: "user", content: trimmed },
    ];

    // If only welcome message exists, include it as context
    if (messagesRef.current.length === 1 && messagesRef.current[0]?.id === "welcome") {
      apiMessages.unshift({ role: "assistant", content: WELCOME.content });
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: botMsgId, role: "assistant", content: "", status: "streaming", timestamp: Date.now() },
    ]);
    setIsStreaming(true);
    isStreamingRef.current = true;

    let accumulated = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, page: pageRef.current }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const evt = JSON.parse(raw) as {
              type: string;
              delta?: { type: string; text: string };
            };
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              accumulated += evt.delta.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId ? { ...m, content: accumulated } : m
                )
              );
            }
          } catch { /* ignore malformed SSE line */ }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, status: "complete" } : m
        )
      );

      if (!isOpenRef.current) {
        setUnreadCount((n) => n + 1);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                content:
                  "I'm having a bit of trouble connecting right now. Please try again shortly, or reach us directly at **manager@bluenest.uk** or call **+44 20 8861 5574**. 😊",
                status: "error",
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  }, []);

  const submitLead = useCallback(async (data: LeadFormData) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const res = await fetch(`${apiUrl}/api/v1/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        branch: data.branch,
        child_age: data.childAge,
        enquiry_type: "Arrange a visit",
        message: `Enquiry submitted via Blue Nest Bot. Child age: ${data.childAge}. Preferred branch: ${data.branch}.`,
        consent: data.consent,
      }),
    });

    if (!res.ok) {
      throw new Error(`Submit failed: ${res.status}`);
    }

    setLeadSubmitted(true);
    setShowLeadForm(false);

    const confirmMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content:
        `Thank you, ${data.name}! 🌟 Our admissions team at **${data.branch}** will be in touch with you very soon to arrange your show-around. In the meantime, feel free to explore our website or ask me anything else!`,
      status: "complete",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, confirmMsg]);
  }, []);

  const value = useMemo<ChatBotContextValue>(
    () => ({
      isOpen,
      messages,
      isStreaming,
      showLeadForm,
      leadSubmitted,
      unreadCount,
      open,
      close,
      toggle,
      sendMessage,
      openLeadForm,
      closeLeadForm,
      submitLead,
    }),
    [
      isOpen,
      messages,
      isStreaming,
      showLeadForm,
      leadSubmitted,
      unreadCount,
      open,
      close,
      toggle,
      sendMessage,
      openLeadForm,
      closeLeadForm,
      submitLead,
    ]
  );

  return <ChatBotContext.Provider value={value}>{children}</ChatBotContext.Provider>;
}

export function useChatBot(): ChatBotContextValue {
  const ctx = useContext(ChatBotContext);
  if (!ctx) throw new Error("useChatBot must be used within ChatBotProvider");
  return ctx;
}
