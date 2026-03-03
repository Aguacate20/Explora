// app/api/admin/students/route.js
// Devuelve todos los estudiantes con su progreso y perfil vocacional.
// Solo accesible con la contraseña de orientadores.

import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { password } = await request.json();
    const correct = process.env.ADMIN_PASSWORD || "sabana2026";
    if (password !== correct) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    // Traer todos los estudiantes con su progreso y perfil en una sola consulta
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        id,
        nickname,
        created_at,
        progress (
          current_session,
          completed_sessions,
          updated_at
        ),
        profiles (
          data,
          updated_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Contar mensajes por estudiante
    const studentIds = students.map(s => s.id);
    const { data: messageCounts } = await supabase
      .from("messages")
      .select("student_id")
      .in("student_id", studentIds);

    // Agrupar conteo por estudiante
    const counts = {};
    (messageCounts || []).forEach(m => {
      counts[m.student_id] = (counts[m.student_id] || 0) + 1;
    });

    // Enriquecer datos
    const enriched = students.map(s => ({
      id:               s.id,
      nickname:         s.nickname,
      createdAt:        s.created_at,
      currentSession:   s.progress?.[0]?.current_session || 1,
      completedSessions: s.progress?.[0]?.completed_sessions || [],
      lastActivity:     s.progress?.[0]?.updated_at || s.created_at,
      profile:          s.profiles?.[0]?.data || null,
      messageCount:     counts[s.id] || 0,
    }));

    return Response.json({ students: enriched });

  } catch (error) {
    console.error("Students route error:", error);
    return Response.json({ error: "Error al cargar estudiantes" }, { status: 500 });
  }
}
