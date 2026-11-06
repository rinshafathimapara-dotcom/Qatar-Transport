import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Smarter Qatar · A better way to get there",
  description:
    "Compare journeys, discover your city and move a little smarter. Qatar multimodal mobility prototype.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
