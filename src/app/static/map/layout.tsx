import { StaticIndicator } from "./_components/static-indicator";

export default function StaticMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-900">
      {children}
      <StaticIndicator />
    </div>
  );
}