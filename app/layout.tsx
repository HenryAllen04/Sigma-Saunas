import type { Metadata } from "next";
import "./globals.css";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SigmaSaunas",
  description: "Next.js app with shadcn/ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <BackgroundGradientAnimation
          gradientBackgroundStart="#1b0e07"
          gradientBackgroundEnd="#120a05"
          colors={["#ff6a00", "#ffd34d", "#ff9a1f", "#ff6a00", "#ffd34d"]}
          blur={40}
          opacity={0.75}
          speed={1}
          interactive={false}
          extraBlobs={12}
          blobScale={1.2}
          containerClassName="fixed inset-0 z-0 pointer-events-none"
        />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}

