import type { Metadata, Viewport } from "next";
import { Inter, Shantell_Sans } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { auth0 } from "@/lib/auth0";
import "./globals.css";

const draw = Shantell_Sans({
  subsets: ["latin"],
  variable: "--font-draw",
  weight: ["400", "500", "600", "700", "800"],
});

const ui = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["500", "600", "700", "800"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F1F0EC",
};

export const metadata: Metadata = {
  title: "INK TAG — live audience tag on a tldraw canvas",
  description:
    "Conference-ready multiplayer tag. Scan a QR, grab a power-up, survive the shrinking zone. Rendered on tldraw, simulated by Colyseus.",
  openGraph: {
    title: "INK TAG",
    description: "Live audience tag on a tldraw canvas.",
    images: [{ url: `${appUrl}/social-preview.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "INK TAG",
    description: "Live audience tag on a tldraw canvas.",
    images: [`${appUrl}/social-preview.jpg`],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = auth0 ? await auth0.getSession() : null;
  return (
    <html lang="en" className={`${draw.variable} ${ui.variable}`}>
      <body className={ui.className}>
        <Auth0Provider user={session?.user}>{children}</Auth0Provider>
      </body>
    </html>
  );
}
