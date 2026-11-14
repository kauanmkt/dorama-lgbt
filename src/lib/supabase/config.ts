/**
 * Endereço e chave pública do Supabase (vêm do .env.local / Vercel).
 * Se não estiverem configurados, o app usa os dados fictícios — útil para
 * desenvolver o visual sem banco.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
