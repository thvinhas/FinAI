import type { Metadata } from "next";
import "./globals.css";
import { Manrope, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import FloatingActionButton from "@/components/FloatingActionButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export const metadata: Metadata = {
  title: "FinApp - Controle Financeiro",
  description: "Aplicativo de controle financeiro pessoal",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      data-theme="dark"
      suppressHydrationWarning
      className={cn("font-sans", manrope.variable, inter.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="dark">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <FloatingActionButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
