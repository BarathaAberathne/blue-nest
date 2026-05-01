import Header from "./Header";
import Footer from "./Footer";
import ChatBotFAB from "@/components/ui/ChatBotFAB";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <ChatBotFAB />
    </>
  );
}
