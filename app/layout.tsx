import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import FloatingActionButton from "@/components/FloatingActionButton";
import ErrorBoundary from "@/components/ErrorBoundary";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="pt-BR" className={cn("dark font-sans", geist.variable)}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <FloatingActionButton />
      </body>
    </html>
  );
}
