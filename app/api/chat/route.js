// app/api/chat/route.js
import { supabase } from "@/lib/supabase";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import fs from "fs";
import path from "path";

function getCareersData() {
  try {
    const filePath = path.join(process.cwd(), "data", "careers.md");
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export async function POST(request) {
  try {
    const { messages, userProfile, studentId, sessionNumber } = await request.json();

    if (!messages?.length) {
      return Response.json({ error: "messages requerido" }, { status: 400 });
    }

    const careerData   = getCareersData();
    const systemPrompt = buildSystemPrompt(careerData, userProfile || null);

    const groqRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!groqRes.ok) {
      if (groqRes.status === 429) {
        // Retry automático hasta 3 veces con espera progresiva
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
              max_tokens: 1024,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
            }),
          });
          if (retry.ok) {
            const retryData = await retry.json();
            const content = retryData.choices?.[0]?.message?.content || "";
            if (studentId) {
              const lastUserMsg = messages[messages.length - 1];
              await supabase.from("messages").insert([
                { student_id: studentId, role: "user", content: lastUserMsg.content, session_number: sessionNumber || 1 },
                { student_id: studentId, role: "assistant", content, session_number: sessionNumber || 1 },
              ]);
            }
            return Response.json({ content });
          }
        }
        return Response.json({ error: "Servicio ocupado. Espera unos segundos e intenta de nuevo." }, { status: 429 });
      }
      return Response.json({ error: "Error del servicio de IA." }, { status: 500 });
    }

    const data    = await groqRes.json();
    const content = data.choices?.[0]?.message?.content || "";

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
    return Response.json({ error: "Error de conexion. Intenta de nuevo." }, { status: 500 });
  }
}
