export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-screen flex-1 overflow-hidden p-0 bg-background">
      {children}
    </main>
  );
}
