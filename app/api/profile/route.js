// app/api/profile/route.js
// Extrae el perfil vocacional del estudiante a partir del historial de chat.
// Usa Groq (GRATIS) — llama-3.1-8b-instant es rápido y suficiente para extracción de JSON.

const PROFILE_SYSTEM = `Eres un extractor de información especializado en orientación vocacional.
Dado un historial de conversación, extrae un perfil JSON del estudiante.

Responde SOLO con JSON válido, sin markdown ni texto adicional.

Estructura exacta:
{
  "nombre": "string",
  "intereses": ["array de intereses mencionados"],
  "aptitudes": ["array de aptitudes y habilidades"],
  "dificultades": ["array de dificultades u oportunidades de mejora"],
  "carrerasInteres": ["array de carreras que ha mencionado"],
  "proyeccionFuturo": "descripción de cómo se ve en 10 años",
  "entornoFamiliar": "qué mencionó sobre su familia",
  "huellaVocacional": "qué quería ser de pequeño/a",
  "sesionActual": 1,
  "notas": "observaciones relevantes para el orientador"
}

Si no hay información para un campo, deja el array vacío o el string vacío.`;

export async function POST(request) {
  try {
    const { messages, currentProfile } = await request.json();

    const recentMessages = messages.slice(-12);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",  // Modelo más ligero para tareas de extracción
        max_tokens: 600,
        messages: [
          { role: "system", content: PROFILE_SYSTEM },
          {
            role: "user",
            content: `Historial:\n${recentMessages
              .map((m) => `${m.role === "user" ? "Estudiante" : "Orientador"}: ${m.content}`)
              .join("\n")}\n\nPerfil previo: ${JSON.stringify(currentProfile || {})}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || "{}")
      .replace(/```json|```/g, "")
      .trim();

    const profile = JSON.parse(text);
    return Response.json({ profile });

  } catch (error) {
    console.error("Profile extraction error:", error);
    return Response.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}
