import type { Metadata } from "next";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { getAdminDoramas } from "@/lib/admin";

export const metadata: Metadata = { title: "Configurações" };

export default async function AdminSettingsPage() {
  const doramas = (await getAdminDoramas()).filter((d) => d.visibility === "publicado");
  const pick = ({ slug, title, artSeed, posterUrl }: (typeof doramas)[number]) => ({ slug, title, artSeed, posterUrl });
  return (
    <SettingsManager
      featured={doramas.filter((d) => d.isFeatured).map(pick)}
      candidates={doramas.map(pick)}
    />
  );
}
