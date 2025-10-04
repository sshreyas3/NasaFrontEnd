// src/app/layout.tsx
import "./globals.scss";
import "leaflet/dist/leaflet.css"; // 👈 Add this

export const metadata = {
  title: "Embiggen Your Eyes!",
  description: "NASA planetary explorer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
