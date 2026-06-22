import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ocean Flow",
  description: "Plataforma open source de Kanban e fluxos de trabalho — self-hosted.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
