import {
  Bookmark,
  Clapperboard,
  Film,
  FolderTree,
  Gauge,
  Home,
  Layers,
  Search,
  Settings,
  UploadCloud,
  User,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** false = tela ainda não construída (aparece como "em breve") */
  ready?: boolean;
};

/** Menu superior (computador e tablet). */
export const clientTopNav: NavItem[] = [
  { label: "Início", href: "/", icon: Home, ready: true },
  { label: "Doramas", href: "/doramas", icon: Film },
  { label: "Categorias", href: "/categorias", icon: Layers },
  { label: "Minha Lista", href: "/minha-lista", icon: Bookmark },
];

/** Menu inferior (celular). */
export const clientBottomNav: NavItem[] = [
  { label: "Início", href: "/", icon: Home, ready: true },
  { label: "Buscar", href: "/buscar", icon: Search },
  { label: "Minha Lista", href: "/minha-lista", icon: Bookmark },
  { label: "Perfil", href: "/perfil", icon: User },
];

/** Menu lateral do painel administrativo. */
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: Gauge, ready: true },
  { label: "Doramas", href: "/admin/doramas", icon: Clapperboard },
  { label: "Categorias", href: "/admin/categorias", icon: FolderTree },
  { label: "Vídeos", href: "/admin/videos", icon: UploadCloud },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "Planos", href: "/admin/planos", icon: WalletCards },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];
