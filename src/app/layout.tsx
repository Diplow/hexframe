import "~/styles/globals.css";
import "~/app/globals-drag.css";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/commons/trpc/react";
import { UnifiedAuthProvider } from "~/contexts/UnifiedAuthContext";
import { ThemeProvider } from "~/contexts/ThemeContext";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Hexframe",
  description: "A community for deliberate people",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`} suppressHydrationWarning>
      <head>
        <meta name="view-transition" content="same-origin" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme-preference') || 'dark';
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-background via-background to-muted font-sans antialiased">
        <Analytics/>
        <ThemeProvider>
          <UnifiedAuthProvider>
            <TRPCReactProvider>
              {children}
            </TRPCReactProvider>
          </UnifiedAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
