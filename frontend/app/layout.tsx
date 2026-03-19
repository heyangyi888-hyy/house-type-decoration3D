import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "户型图 → 3D装修效果图 | AI装修设计",
  description: "上传户型图，AI 10秒生成装修效果图。支持现代简约、北欧、现代中式等多种装修风格。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
