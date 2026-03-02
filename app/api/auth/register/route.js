// app/api/auth/register/route.js
import { supabase } from "@/lib/supabase";
import { generateSalt, hashPassword } from "@/lib/auth";

export async function POST(request) {
  try {
    const { studentId, nickname, password } = await request.json();

    // Validaciones básicas
    if (!/^\d{10}$/.test(studentId)) {
      return Response.json({ error: "El ID institucional debe tener exactamente 10 dígitos." }, { status: 400 });
    }
    if (!nickname?.trim()) {
      return Response.json({ error: "El nombre es requerido." }, { status: 400 });
    }
    if (password?.length < 6) {
      return Response.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .single();

    if (existing) {
      return Response.json({ error: "Ya existe una cuenta con ese ID. ¿Ya tienes proceso? Ingresa con tu contraseña." }, { status: 409 });
    }

    // Crear cuenta
    const salt         = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const { error } = await supabase.from("students").insert({
      id:            studentId,
      nickname:      nickname.trim(),
      password_hash: passwordHash,
      salt:          salt,
    });

    if (error) throw error;

    // Crear progreso inicial
    await supabase.from("progress").insert({
      student_id:         studentId,
      current_session:    1,
      completed_sessions: [],
    });

    return Response.json({ ok: true, nickname: nickname.trim(), studentId });

  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Error al crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }
}
