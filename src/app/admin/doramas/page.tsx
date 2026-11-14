import type { Metadata } from "next";
import { DoramasTable } from "@/components/admin/doramas/DoramasTable";
import { getAdminCategories, getAdminDoramas } from "@/lib/admin";

export const metadata: Metadata = { title: "Doramas" };

export default async function AdminDoramasPage() {
  const [doramas, categories] = await Promise.all([getAdminDoramas(), getAdminCategories()]);
  return <DoramasTable initial={doramas} categories={categories} />;
}
