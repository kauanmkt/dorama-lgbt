import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { getAdminCategories } from "@/lib/admin";

export const metadata: Metadata = { title: "Categorias" };

export default async function AdminCategoriesPage() {
  return <CategoriesManager initial={await getAdminCategories()} />;
}
