import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans-face" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif-face" });

export const metadata: Metadata = {
  title: {
    default: "Koshys Nursing Academic Intelligence",
    template: "%s · Koshys Nursing Academic Intelligence",
  },
  description:
    "Source-grounded study materials, previous-year question analysis and exam preparation for Post Basic B.Sc. Nursing students at Koshys College of Nursing, Bangalore.",
  applicationName: "Koshys Nursing Academic Intelligence",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
