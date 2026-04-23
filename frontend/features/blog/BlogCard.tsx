import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/types";

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="card block hover:shadow-md transition-shadow group">
      {post.cover_image && (
        <div className="aspect-video relative bg-gray-100">
          <Image src={post.cover_image} alt={post.title} fill className="object-cover" />
        </div>
      )}
      <div className="p-5">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h3 className="font-heading font-semibold text-gray-900 group-hover:text-brand-700 transition-colors leading-snug">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 mt-2 line-clamp-3">{post.excerpt}</p>
        {post.published_at && (
          <p className="text-xs text-gray-400 mt-3">
            {new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </Link>
  );
}
