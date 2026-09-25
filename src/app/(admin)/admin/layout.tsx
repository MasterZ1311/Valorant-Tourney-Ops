import { Navbar } from "@/components/navigation/navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f1923]">
      <Navbar />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
