import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: {
    default: "PlaceFlow — Campus placements, in one clear flow",
    template: "%s · PlaceFlow",
  },
  description:
    "A private, explainable workspace for campus placement drives, applications, and outcomes.",
  applicationName: "PlaceFlow",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={bricolage.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
