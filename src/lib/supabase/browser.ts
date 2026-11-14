"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

/** Cliente do Supabase para o navegador (login, Minha Lista, progresso...). */
export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
