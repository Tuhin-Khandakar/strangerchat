import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StrangerChat - Random Chat with Strangers",
  description: "Meet random people online instantly. Safe, fast & fun.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <style>{`
          .glass-header { backdrop-filter: blur(24px); }
          .ambient-shadow { box-shadow: 0 10px 40px -10px rgba(25, 28, 30, 0.04); }
          .primary-gradient { background: linear-gradient(135deg, #4648d4 0%, #6063ee 100%); }
          .ghost-border { border: 1px solid rgba(199, 196, 215, 0.2); }
          .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; }
        `}</style>
      </head>
      <body className="bg-surface text-on-surface antialiased overflow-x-hidden min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
