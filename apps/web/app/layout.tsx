import type { Metadata, Viewport } from "next";
import { Libre_Franklin } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "arnius",
  description: "Noticias de agenda: seguí tus palabras clave en los portales argentinos.",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "arnius",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f6" },
    { media: "(prefers-color-scheme: dark)", color: "#131a21" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // El tema explícito viaja en cookie para que el SSR lo pinte sin flash;
  // sin cookie (o "system") no se setea data-theme y decide el SO vía CSS.
  const theme = (await cookies()).get("arnius-theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html
      lang="es"
      data-theme={dataTheme}
      className={`${libreFranklin.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
