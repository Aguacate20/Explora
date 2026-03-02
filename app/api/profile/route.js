// app/api/profile/route.js
// Extrae el perfil vocacional del estudiante a partir del historial de chat.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // Solo los últimos 12 mensajes para no gastar tokens
    const recentMessages = messages.slice(-12);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: PROFILE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Historial de conversación:\n${recentMessages
            .map((m) => `${m.role === "user" ? "Estudiante" : "Orientador"}: ${m.content}`)
            .join("\n")}\n\nPerfil previo conocido: ${JSON.stringify(currentProfile || {})}`,
        },
      ],
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const profile = JSON.parse(text);
    return Response.json({ profile });

  } catch (error) {
    console.error("Profile extraction error:", error);
    return Response.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}
