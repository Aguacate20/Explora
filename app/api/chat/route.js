// app/api/chat/route.js
import { supabase } from "@/lib/supabase";
import { buildSystemPrompt } from "@/lib/systemPrompt";

export async function POST(request) {
  try {
    const { messages, userProfile, careerData, studentId, sessionNumber } = await request.json();

    if (!messages?.length) {
      return Response.json({ error: "messages requerido" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(careerData || "", userProfile || null);

    // Llamar a Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error("Groq error:", err);
      if (groqRes.status === 429) {
        return Response.json({ error: "Límite de uso alcanzado. Intenta en unos minutos." }, { status: 429 });
      }
      return Response.json({ error: "Error del servicio de IA." }, { status: 500 });
    }

    const data    = await groqRes.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Guardar el último mensaje del usuario + respuesta en Supabase
    if (studentId) {
      const lastUserMsg = messages[messages.length - 1];
      await supabase.from("messages").insert([
        { student_id: studentId, role: "user",      content: lastUserMsg.content, session_number: sessionNumber || 1 },
        { student_id: studentId, role: "assistant", content,                       session_number: sessionNumber || 1 },
      ]);
    }

    return Response.json({ content });

  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json({ error: "Error de conexión. Intenta de nuevo." }, { status: 500 });
  }
}
