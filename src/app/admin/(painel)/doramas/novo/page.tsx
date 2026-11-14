import type { Metadata } from "next";
import { DoramaEditor } from "@/components/admin/doramas/DoramaEditor";
import { getAdminCategories } from "@/lib/admin";

export const metadata: Metadata = { title: "Novo dorama" };

export default async function NewDoramaPage() {
  return <DoramaEditor categories={await getAdminCategories()} />;
}
