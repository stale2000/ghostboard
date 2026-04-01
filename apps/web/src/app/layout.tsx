import type { Metadata } from "next";

import "./globals.css";

type RootLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "GhostBoard",
  description: "GhostBoard is an image-based collaborative tabletop overlay for haunting real tables with digital pieces."
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
