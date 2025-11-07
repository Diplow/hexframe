export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-screen w-full p-0 bg-background">
      {children}
    </main>
  );
}
