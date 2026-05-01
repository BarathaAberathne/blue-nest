"use client";

import { FormEvent, useEffect, useRef, useState, useMemo } from "react";
import { marked } from "marked";
import { Trash2, Upload, Eye, Edit2, Plus, X, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser } from "@/lib/auth";
import type { BlogPost } from "@/types";

marked.use({ breaks: true, gfm: true });

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Types ─────────────────────────────────────────────────────────────────────
type BlogForm = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image: string;
  gallery_images: string[];
  tags: string;
  published: boolean;
};

function toForm(post: BlogPost): BlogForm {
  return {
    slug:           post.slug,
    title:          post.title,
    excerpt:        post.excerpt,
    body:           post.body,
    cover_image:    post.cover_image ?? "",
    gallery_images: post.gallery_images ?? [],
    tags:           (post.tags ?? []).join(", "),
    published:      Boolean(post.published),
  };
}

const BLANK_FORM: BlogForm = {
  slug: "", title: "", excerpt: "", body: "",
  cover_image: "", gallery_images: [], tags: "", published: false,
};

// ── Image upload helper ───────────────────────────────────────────────────────
function useImageUploader(token: string) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    setUploadErr(null);
    try {
      const res = await api.adminUploadImage(token, file) as { url: string };
      return res.url;
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, uploadErr, clearErr: () => setUploadErr(null) };
}

// ── Cover image field ─────────────────────────────────────────────────────────
function CoverImageField({
  value, onChange, token,
}: { value: string; onChange: (url: string) => void; token: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, uploadErr } = useImageUploader(token);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
    e.target.value = "";
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Cover Image</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload →"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
      {value && (
        <div className="relative mt-1 h-32 w-full overflow-hidden rounded-lg bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover preview" className="h-full w-full object-cover" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Gallery images field ──────────────────────────────────────────────────────
function GalleryField({
  images, onChange, token,
}: { images: string[]; onChange: (imgs: string[]) => void; token: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const { upload, uploading, uploadErr } = useImageUploader(token);

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlInput("");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) onChange([...images, url]);
    e.target.value = "";
  };

  const remove = (i: number) => {
    onChange(images.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Gallery Images <span className="normal-case font-normal text-gray-400">({images.length})</span>
      </label>

      {/* Add image row */}
      <div className="flex gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
          placeholder="Image URL then press Enter"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!urlInput.trim()}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "…" : "Upload"}
        </button>
      </div>
      {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}

      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Body editor with preview ──────────────────────────────────────────────────
function BodyEditor({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  const html = useMemo(() => {
    if (!value) return "<p class='text-gray-400 text-sm'>Nothing to preview yet.</p>";
    return String(marked.parse(value));
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Body <span className="normal-case font-normal text-gray-400">(Markdown supported)</span>
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`flex items-center gap-1 px-3 py-1.5 transition ${tab === "write" ? "bg-gray-100 text-gray-800 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Edit2 className="h-3 w-3" /> Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1 px-3 py-1.5 transition ${tab === "preview" ? "bg-gray-100 text-gray-800 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"Write your post in Markdown…\n\n## Example heading\n**Bold**, *italic*, - lists, > blockquotes"}
          required
          rows={12}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono leading-relaxed resize-y"
        />
      ) : (
        <div
          className="blog-prose min-h-[200px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminBlogClient() {
  const [posts,   setPosts]   = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form,    setForm]    = useState<BlogForm>(BLANK_FORM);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const token = typeof window !== "undefined" ? getAccessToken() ?? "" : "";

  const set = <K extends keyof BlogForm>(k: K, v: BlogForm[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const loadPosts = async () => {
    if (!token) { setError("Please sign in as admin first."); setLoading(false); return; }
    try {
      setError(null);
      const data = await api.adminGetBlogPosts(token) as BlogPost[];
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPosts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const resetForm = () => { setEditing(null); setForm(BLANK_FORM); };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    const authUser = getAuthUser();
    const payload = {
      ...form,
      tags:         form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      author_name:  authUser ? `${authUser.first_name} ${authUser.last_name}` : "Admin",
      published_at: form.published ? new Date().toISOString() : undefined,
    };
    try {
      if (editing) {
        await api.adminUpdateBlogPost(token, editing.id, payload);
      } else {
        await api.adminCreateBlogPost(token, payload);
      }
      await loadPosts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blog post");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token || !confirm("Delete this post?")) return;
    try {
      await api.adminDeleteBlogPost(token, id);
      await loadPosts();
      if (editing?.id === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Blog Posts</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <form className="card p-5 mb-6 space-y-4" onSubmit={onSubmit}>
        <h2 className="font-heading font-semibold text-gray-800">
          {editing ? "Edit Post" : "New Post"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  title,
                  // auto-fill slug only while creating a new post and slug hasn't been manually changed
                  slug: !editing && prev.slug === autoSlug(prev.title) ? autoSlug(title) : prev.slug,
                }));
              }}
              placeholder="Post title"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Slug
              <span className="ml-1 normal-case font-normal text-gray-400">(a–z, 0–9, hyphens only)</span>
            </label>
            <input
              value={form.slug}
              onChange={(e) => set("slug", autoSlug(e.target.value.replace(/\s/g, "-")))}
              placeholder="url-friendly-slug"
              required
              pattern="[a-z0-9][a-z0-9-]*"
              title="Only lowercase letters, numbers, and hyphens are allowed"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags <span className="normal-case font-normal text-gray-400">(comma separated)</span></label>
          <input
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="Montessori, Advice, Branch News"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="Short summary shown in the blog listing"
            required
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
          />
        </div>

        <CoverImageField value={form.cover_image} onChange={(url) => set("cover_image", url)} token={token} />

        <GalleryField images={form.gallery_images} onChange={(imgs) => set("gallery_images", imgs)} token={token} />

        <BodyEditor value={form.body} onChange={(v) => set("body", v)} />

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
            className="rounded"
          />
          Publish immediately
        </label>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary text-sm py-2" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update Post" : "Create Post"}
          </button>
          {editing && (
            <button type="button" className="btn-outline text-sm py-2" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ── Post list ─────────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Published</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Likes</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td className="px-4 py-6 text-gray-400" colSpan={5}>Loading…</td></tr>
            ) : posts.length === 0 ? (
              <tr><td className="px-4 py-6 text-gray-400" colSpan={5}>No blog posts yet.</td></tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {post.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.cover_image} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 shrink-0">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <span className="truncate max-w-[160px]">{post.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${post.published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {post.like_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-[#5fc8c7] hover:underline text-xs font-medium"
                        onClick={() => { setEditing(post); setForm(toForm(post)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 transition"
                        onClick={() => onDelete(post.id)}
                        aria-label="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
