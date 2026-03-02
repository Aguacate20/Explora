// app/api/chat/route.js
// Este endpoint actúa como proxy seguro hacia Anthropic.
// La API key NUNCA llega al navegador del estudiante.

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/systemPrompt";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { messages, userProfile, careerData } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "messages array required" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(careerData || "", userProfile || null);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const content = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return Response.json({ content });

  } catch (error) {
    console.error("Anthropic API error:", error);
    return Response.json(
      { error: "Error al conectar con el servicio de IA. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
