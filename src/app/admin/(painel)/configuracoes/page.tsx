import type { Metadata } from "next";
import { SettingsManager, type SettingsValues } from "@/components/admin/SettingsManager";
import { getAdminDoramas, getAdminSettings } from "@/lib/admin";

export const metadata: Metadata = { title: "Configurações" };

export default async function AdminSettingsPage() {
  const [all, s] = await Promise.all([getAdminDoramas(), getAdminSettings()]);
  const doramas = all.filter((d) => d.visibility === "publicado");
  const pick = ({ id, slug, title, artSeed, posterUrl }: (typeof doramas)[number]) => ({
    id,
    slug,
    title,
    artSeed,
    posterUrl,
  });

  const str = (k: string, fallback = "") => (typeof s[k] === "string" ? (s[k] as string) : fallback);
  const bool = (k: string, fallback: boolean) => (typeof s[k] === "boolean" ? (s[k] as boolean) : fallback);
  const values: SettingsValues = {
    platformName: str("platform_name", "Amora Dramas"),
    supportEmail: str("support_email", "suporte@doramalgbt.com"),
    announcement: str("announcement"),
    purchaseUrl: str("purchase_url"),
    upgradeUrl: str("upgrade_url"),
    maintenance: bool("maintenance", false),
    autoplayNext: bool("autoplay_next", true),
    heroRotation: typeof s.hero_rotation_s === "number" ? s.hero_rotation_s : 8,
    extraScreenIds: Array.isArray(s.extra_screen_product_ids) ? (s.extra_screen_product_ids as unknown[]).map(String) : [],
    tvProductIds: Array.isArray(s.tv_product_ids) ? (s.tv_product_ids as unknown[]).map(String) : [],
    tvUpgradeUrl: str("tv_upgrade_url"),
  };

  return (
    <SettingsManager
      values={values}
      featured={doramas
        .filter((d) => d.isFeatured)
        .sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0))
        .map(pick)}
      candidates={doramas.map(pick)}
    />
  );
}
