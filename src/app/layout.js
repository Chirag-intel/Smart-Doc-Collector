import "./globals.css";

export const metadata = {
  title: "Tartan DocCollect — Document Pendency Management",
  description: "Trigger document collection links to customers and DSAs with AI-powered OCR validation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
