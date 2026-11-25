import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "CTFForge | Cybersecurity Learning Platform & AI Tutor",
  description: "Platform pembelajaran cyber security interaktif yang menggabungkan materi course, latihan Capture The Flag (CTF), validasi flag hash, jalur belajar, dan AI Tutor terbimbing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-cyber-bg text-gray-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
