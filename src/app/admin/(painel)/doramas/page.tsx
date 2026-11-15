import type { Metadata } from "next";
import { DoramasTable } from "@/components/admin/doramas/DoramasTable";
import { getAdminCategories, getAdminDoramas } from "@/lib/admin";
import { NOW } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Doramas" };

export default async function AdminDoramasPage() {
  const [doramas, categories] = await Promise.all([getAdminDoramas(), getAdminCategories()]);
  const now = isSupabaseConfigured ? new Date() : NOW;
  return <DoramasTable initial={doramas} categories={categories} now={now.toISOString()} />;
}
