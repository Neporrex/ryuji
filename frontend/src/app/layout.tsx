import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ryuji — Sharp mind. Calm presence.",
  description: "AI assistant created by neporrex. Optimized for coding, creative writing, and deep thinking.",
  keywords: ["AI", "assistant", "Ryuji", "coding", "creative writing"],
  openGraph: {
    title: "Ryuji",
    description: "Sharp mind. Calm presence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚔️</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
