import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/commons/trpc/react";
import { AuthProvider } from "~/contexts/AuthContext";
import { MappingUserProvider } from "~/contexts/MappingUserProvider";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Hexframe",
  description: "A community for deliberate people",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isE2ETest = process.env.E2E_TEST === 'true';
  
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <head>
        <meta name="view-transition" content="same-origin" />
        {isE2ETest && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__E2E_TEST__ = true;`,
            }}
          />
        )}
      </head>
      <body className="min-h-screen bg-gradient-to-br from-background via-background to-muted font-sans antialiased">
        <Analytics/>
        <AuthProvider>
          <TRPCReactProvider>
            <MappingUserProvider>
              {children}
            </MappingUserProvider>
          </TRPCReactProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
