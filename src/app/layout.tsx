import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderClient } from "@/components/HeaderClient";
import { NavLinks } from "@/components/NavLinks";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#f59e0b",
};

export const metadata: Metadata = {
  title: {
    default: "egg",
    template: "%s | egg",
  },
  description: "Connect brands with UGC creators in Tunisia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-stone-900">
        <header className="sticky top-0 z-50 border-b border-stone-900/10 bg-surface-elevated/85 shadow-sm shadow-stone-900/5 backdrop-blur-md supports-[backdrop-filter]:bg-surface-elevated/75">
          <div className="mx-auto flex min-h-[3.5rem] w-full max-w-[1920px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-2 sm:flex-nowrap sm:px-6 lg:px-10 xl:px-12">
            <div className="flex min-w-0 flex-1 items-center justify-start">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 text-stone-900 transition hover:opacity-90"
                aria-label="Home"
              >
                <Image
                  src="/images/logo.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                  priority
                />
              </Link>
            </div>

            <div className="order-last flex w-full justify-center sm:order-none sm:w-auto sm:flex-1">
              <NavLinks />
            </div>

            <div className="flex flex-1 items-center justify-end">
              <HeaderClient />
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
