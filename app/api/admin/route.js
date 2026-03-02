// app/api/admin/route.js
// Verifica la contraseña del panel de orientadores.
// La contraseña real vive en el servidor, nunca en el navegador.

export async function POST(request) {
  try {
    const { password } = await request.json();
    const correct = process.env.ADMIN_PASSWORD || "sabana2026";

    if (password === correct) {
      return Response.json({ ok: true });
    } else {
      return Response.json({ ok: false }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Error de servidor" }, { status: 500 });
  }
}
