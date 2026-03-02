// app/api/admin/route.js
import { supabase } from "@/lib/supabase";

// GET — cargar datos de carreras actuales
export async function GET() {
  try {
    const { data } = await supabase.from("career_data").select("content").eq("id", 1).single();
    return Response.json({ content: data?.content || "" });
  } catch {
    return Response.json({ content: "" });
  }
}

// POST — verificar contraseña
export async function POST(request) {
  try {
    const { password } = await request.json();
    const correct = process.env.ADMIN_PASSWORD || "sabana2026";
    if (password === correct) return Response.json({ ok: true });
    return Response.json({ ok: false }, { status: 401 });
  } catch {
    return Response.json({ error: "Error" }, { status: 500 });
  }
}

// PUT — guardar datos de carreras
export async function PUT(request) {
  try {
    const { password, content } = await request.json();
    const correct = process.env.ADMIN_PASSWORD || "sabana2026";
    if (password !== correct) return Response.json({ error: "No autorizado" }, { status: 401 });

    await supabase.from("career_data").upsert({
      id:         1,
      content:    content,
      updated_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: "Error al guardar" }, { status: 500 });
  }
}
