"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { REPLY_TEMPLATES } from "@/lib/enquiry";
import type { Enquiry } from "@/types";

/**
 * Reply composer: pick a template, preview/edit the text, then open it in the
 * staff member's email client (mailto) and log the reply on the enquiry so it
 * counts toward response-time metrics. No server-side email sending — the
 * mailto keeps the existing lightweight flow.
 */
export default function ReplyModal({
  open,
  onClose,
  enquiry,
  onLogged,
}: {
  open: boolean;
  onClose: () => void;
  enquiry: Enquiry;
  onLogged?: (updated: Enquiry) => void;
}) {
  const [templateKey, setTemplateKey] = useState(REPLY_TEMPLATES[0].key);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Reset to the chosen template whenever it changes (or the modal opens).
  useEffect(() => {
    if (!open) return;
    const t = REPLY_TEMPLATES.find((x) => x.key === templateKey) ?? REPLY_TEMPLATES[0];
    setSubject(t.subject);
    setBody(t.body(enquiry));
  }, [templateKey, open, enquiry]);

  const send = () => {
    const token = getAccessToken();
    if (token) {
      api.adminLogEnquiryReply(token, enquiry.id).then((u) => onLogged?.(u)).catch(() => { /* non-blocking */ });
    }
    const href = `mailto:${enquiry.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reply to ${enquiry.name}`}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={send} className="btn-primary py-2 text-sm">
            <Mail className="h-4 w-4" /> Open in email client
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Template</span>
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {REPLY_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">To</span>
          <input
            value={enquiry.email}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Message</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </label>
        <p className="text-xs text-slate-400">
          This opens your email app with the message ready to send, and logs the reply on this enquiry.
        </p>
      </div>
    </Modal>
  );
}
