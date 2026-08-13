"use client";

// ProfilePhotoUploader — the detail-page avatar with upload/replace/remove.
// Uploads through the shared POST /admin/uploads/image, then persists the URL
// via the caller-supplied save (PATCH .../photo). Used on the child and staff
// profile headers.

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Avatar from "@/components/admin/ui/Avatar";

const MAX_BYTES = 5 * 1024 * 1024;

export default function ProfilePhotoUploader({
  name,
  photoUrl,
  onSave,
  size = "xl",
}: {
  name: string;
  photoUrl?: string;
  /** Persist the new URL ("" clears). Should throw on failure. */
  onSave: (token: string, url: string) => Promise<unknown>;
  size?: "lg" | "xl";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => fileRef.current?.click();

  const upload = async (file: File) => {
    const token = getAccessToken();
    if (!token) return;
    if (file.size > MAX_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.adminUploadImage(token, file);
      await onSave(token, url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(token, "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="group relative">
        <Avatar name={name} src={photoUrl} size={size} />
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          title={photoUrl ? "Change photo" : "Upload photo"}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white shadow-md transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </button>
      </div>
      {photoUrl && !busy && (
        <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-slate-400 hover:text-red-500">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      )}
      {error && <p className="max-w-[10rem] text-center text-[0.65rem] text-red-500">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </div>
  );
}
