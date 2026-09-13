import "./globals.css";

export const metadata = {
  title: "HJB Gestión",
  description: "Sistema de gestión empresarial HJB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
