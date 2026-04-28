import { MessageCircle, Send, Sparkles } from "lucide-react";

const quickActions = ["About Our Nurseries", "View Our Gallery", "Fees & Sessions", "Contact Us"];

export default function ChatBotCard() {
  return (
    <div className="w-full max-w-[22rem] rounded-[2rem] border border-white/70 bg-[rgba(255,253,249,0.95)] p-3 shadow-[0_18px_45px_rgba(90,74,66,0.18)] backdrop-blur">
      <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,#8ee2dc_0%,#72cec9_100%)] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-heading text-[1.7rem] leading-none">Blue Nest Bot</p>
              <p className="mt-1 text-sm text-white/90">We&apos;re here to help.</p>
            </div>
          </div>
          <Sparkles className="mt-1 h-5 w-5 text-[var(--butter)]" />
        </div>
      </div>

      <div className="space-y-3 px-2 pb-2 pt-4 text-[var(--ink)]">
        <div className="rounded-[1.5rem] bg-[#f3f0ec] p-4 text-sm leading-6">
          <p>Hi there! Welcome to Blue Nest Montessori.</p>
          <p className="mt-1">How can we help you today?</p>
        </div>

        <div className="space-y-2">
          {quickActions.map((label) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center justify-center rounded-full border border-[rgba(90,74,66,0.08)] bg-white px-4 py-3 text-sm font-bold text-[#4aa7a2] transition hover:bg-[#f8fffe]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-full bg-[#f3f0ec] px-4 py-3 text-sm text-[#9d9189]">
          <span className="flex-1">Type your message...</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#4aa7a2]">
            <Send className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
