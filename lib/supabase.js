// lib/supabase.js
// Cliente de Supabase para uso SERVER-SIDE únicamente (API routes).
// Usa la SERVICE ROLE KEY — nunca se expone al navegador.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
