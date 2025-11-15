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
          colors={[
            "#260600", // deep red-brown
            "#4a1406", // dark ember
            "#7a1f00", // ember red
            "#a63a00", // red-orange
            "#d45100", // molten orange
            "#ff6a00", // bright orange
            "#ff9a1f", // naples yellow
            "#ffd34d"  // warm yellow glow
          ]}
          size={800}
          blur={320}
          speed={0.4}
          opacity={0.85}
          gradientBackgroundStart="#0b0302"
          gradientBackgroundEnd="#180904"
          blendingValue="screen"
          interactive={false}
          blobScale={1.6}
          vignetteOpacity={0.4}
          grainOpacity={0.1}
          containerClassName="fixed inset-0 -z-10 pointer-events-none"
        />
        {children}
      </body>
    </html>
  );
}

