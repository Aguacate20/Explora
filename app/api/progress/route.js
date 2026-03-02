// app/api/progress/route.js
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { studentId, currentSession, completedSessions } = await request.json();

    if (!studentId) return Response.json({ error: "studentId requerido" }, { status: 400 });

    await supabase.from("progress").upsert({
      student_id:         studentId,
      current_session:    currentSession,
      completed_sessions: completedSessions,
      updated_at:         new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Progress error:", error);
    return Response.json({ error: "No se pudo guardar el progreso" }, { status: 500 });
  }
}
