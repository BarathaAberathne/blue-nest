import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <p className="font-heading text-xl font-bold text-white mb-1">🌿 Blue Nest</p>
        <p className="text-gray-400 text-sm mb-6">Admin access only</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" placeholder="admin@bluenestmontessori.co.uk"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" placeholder="••••••••"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button className="btn-primary w-full mt-2">Sign In</button>
        </div>
        <p className="text-center mt-4">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">← Back to site</Link>
        </p>
      </div>
    </div>
  );
}
