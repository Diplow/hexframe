'use client';

import { ChatProvider } from '~/app/map/Chat';

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <main className="h-screen w-full p-0 bg-background">
        {children}
      </main>
    </ChatProvider>
  );
}
