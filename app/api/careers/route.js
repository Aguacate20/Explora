// app/api/careers/route.js
// Lee el archivo data/careers.md del repositorio y lo devuelve como texto.
// Así el orientador siempre usa la versión más actualizada del archivo en GitHub.

import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "careers.md");
    const content  = fs.readFileSync(filePath, "utf-8");
    return Response.json({ content });
  } catch (error) {
    console.error("Error reading careers.md:", error);
    return Response.json({ content: "" });
  }
}
