import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import AccountLayout from "@/components/layout/AccountLayout";

export const metadata: Metadata = { title: "My Account" };

export default function AccountPage() {
  return (
    <PublicLayout>
      <AccountLayout>
        <h1 className="text-2xl font-heading font-bold text-gray-900 mb-6">My Account</h1>
        <div className="card p-6 max-w-md">
          <p className="text-sm text-gray-500 mb-4">Account details will be loaded after authentication is implemented.</p>
          <div className="space-y-3">
            {["First Name", "Last Name", "Email"].map((f) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{f}</label>
                <div className="h-9 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AccountLayout>
    </PublicLayout>
  );
}
