import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = { title: "Loomark · 个人导航", description: "A calm home for your bookmarks" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body><ThemeProvider>{children}</ThemeProvider></body></html>; }
