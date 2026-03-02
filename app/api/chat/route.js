// app/api/chat/route.js
// Usa Groq (GRATIS) con Llama 3.3 70B en lugar de Anthropic.
// Groq es compatible con el formato OpenAI — cambio mínimo de código.
// API key gratis en: https://console.groq.com (sin tarjeta de crédito)
// Límite gratis: 14,400 requests/día — más que suficiente para piloto.

import { buildSystemPrompt } from "@/lib/systemPrompt";

export async function POST(request) {
  try {
    const { messages, userProfile, careerData } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "messages array required" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(careerData || "", userProfile || null);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return Response.json(
          { error: "Se alcanzó el límite gratuito. Intenta de nuevo en unos minutos." },
          { status: 429 }
        );
      }
      return Response.json({ error: "Error del servicio de IA" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return Response.json({ content });

  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json(
      { error: "Error de conexión. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
