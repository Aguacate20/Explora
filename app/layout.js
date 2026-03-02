export const metadata = {
  title: "Explora Tu Carrera | Universidad de La Sabana",
  description: "Sistema de orientación vocacional de la Universidad de La Sabana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "#0a1a0f" }}>{children}</body>
    </html>
  );
}
