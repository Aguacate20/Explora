// app/api/auth/login/route.js
import { supabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/auth";

export async function POST(request) {
  try {
    const { studentId, password } = await request.json();

    if (!/^\d{10}$/.test(studentId)) {
      return Response.json({ error: "El ID debe tener 10 dígitos." }, { status: 400 });
    }

    // Buscar cuenta
    const { data: student, error } = await supabase
      .from("students")
      .select("id, nickname, password_hash, salt")
      .eq("id", studentId)
      .single();

    if (error || !student) {
      return Response.json({ error: "No encontramos una cuenta con ese ID. ¿Es tu primera vez? Regístrate." }, { status: 404 });
    }

    // Verificar contraseña
    const valid = await verifyPassword(password, student.salt, student.password_hash);
    if (!valid) {
      return Response.json({ error: "Contraseña incorrecta. Inténtalo de nuevo." }, { status: 401 });
    }

    // Cargar datos del estudiante
    const [{ data: messages }, { data: profile }, { data: progress }, { data: careerRow }] = await Promise.all([
      supabase.from("messages").select("role, content, session_number").eq("student_id", studentId).order("created_at"),
      supabase.from("profiles").select("data").eq("student_id", studentId).single(),
      supabase.from("progress").select("current_session, completed_sessions").eq("student_id", studentId).single(),
      supabase.from("career_data").select("content").eq("id", 1).single(),
    ]);

    return Response.json({
      ok:               true,
      studentId:        student.id,
      nickname:         student.nickname,
      messages:         messages || [],
      profile:          profile?.data || null,
      currentSession:   progress?.current_session || 1,
      completedSessions: progress?.completed_sessions || [],
      careerData:       careerRow?.content || "",
    });

  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Error al iniciar sesión. Intenta de nuevo." }, { status: 500 });
  }
}
