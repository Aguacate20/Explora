// app/api/profile/route.js
import { supabase } from "@/lib/supabase";

const PROFILE_SYSTEM = `Eres un extractor de información especializado en orientación vocacional.
Analiza el historial de conversación y extrae un perfil JSON del estudiante.
Responde SOLO con JSON válido, sin markdown ni texto adicional.

Estructura exacta:
{
  "nombre": "",
  "intereses": [],
  "aptitudes": [],
  "dificultades": [],
  "carrerasInteres": [],
  "proyeccionFuturo": "",
  "entornoFamiliar": "",
  "huellaVocacional": "",
  "sesionActual": 1,
  "notas": ""
}`;

export async function POST(request) {
  try {
    const { messages, currentProfile, studentId } = await request.json();

    const recentMessages = messages.slice(-12);

    const groqRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        max_tokens: 600,
        messages: [
          { role: "system", content: PROFILE_SYSTEM },
          {
            role: "user",
            content: `Historial:\n${recentMessages
              .map(m => `${m.role === "user" ? "Estudiante" : "Orientador"}: ${m.content}`)
              .join("\n")}\n\nPerfil previo: ${JSON.stringify(currentProfile || {})}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      if (groqRes.status === 429) {
        for (let i = 1; i <= 3; i++) {
          await new Promise(r => setTimeout(r, i * 2000));
          const retry = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gemini-2.5-flash-lite",
              max_tokens: 600,
              messages: [
                { role: "system", content: PROFILE_SYSTEM },
                {
                  role: "user",
                  content: `Historial:\n${recentMessages
                    .map(m => `${m.role === "user" ? "Estudiante" : "Orientador"}: ${m.content}`)
                    .join("\n")}\n\nPerfil previo: ${JSON.stringify(currentProfile || {})}`,
                },
              ],
            }),
          });
          if (retry.ok) {
            const retryData = await retry.json();
            const text = (retryData.choices?.[0]?.message?.content || "{}").replace(/```json|```/g, "").trim();
            const profile = JSON.parse(text);
            if (studentId) {
              await supabase.from("profiles").upsert({
                student_id: studentId,
                data: profile,
                updated_at: new Date().toISOString(),
              });
            }
            return Response.json({ profile });
          }
        }
        return Response.json({ error: "No se pudo actualizar el perfil" }, { status: 429 });
      }
      return Response.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }

    const data   = await groqRes.json();
    const text   = (data.choices?.[0]?.message?.content || "{}").replace(/```json|```/g, "").trim();
    const profile = JSON.parse(text);

    // Guardar en Supabase
    if (studentId) {
      await supabase.from("profiles").upsert({
        student_id: studentId,
        data:       profile,
        updated_at: new Date().toISOString(),
      });
    }

    return Response.json({ profile });

  } catch (error) {
    console.error("Profile error:", error);
    return Response.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}
