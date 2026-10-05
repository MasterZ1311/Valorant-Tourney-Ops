import { Navbar } from "@/components/navigation/navbar";
import { UserGuideModal } from "@/components/help/user-guide-modal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <UserGuideModal triggerVariant="floating" tournamentId="vto-tourney-1" />
    </div>
  );
}
