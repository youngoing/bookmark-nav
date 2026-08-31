import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = { title: "bookmark-nav · 书签导航", description: "集中整理和访问你的书签", icons: { icon: "/icon.svg", apple: "/icon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN" data-theme="light"><body><ThemeProvider>{children}</ThemeProvider></body></html>; }
