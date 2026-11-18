import {
  Bell,
  Bookmark,
  Clapperboard,
  DownloadCloud,
  Film,
  FolderTree,
  Gauge,
  Home,
  Layers,
  MessageCircle,
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
  { label: "Doramas", href: "/doramas", icon: Film, ready: true },
  { label: "Categorias", href: "/categorias", icon: Layers, ready: true },
  { label: "Minha Lista", href: "/minha-lista", icon: Bookmark, ready: true },
];

/** Menu inferior (celular). */
export const clientBottomNav: NavItem[] = [
  { label: "Início", href: "/", icon: Home, ready: true },
  { label: "Buscar", href: "/buscar", icon: Search, ready: true },
  { label: "Minha Lista", href: "/minha-lista", icon: Bookmark, ready: true },
  { label: "Perfil", href: "/perfil", icon: User, ready: true },
];

/** Menu lateral do painel administrativo. */
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: Gauge, ready: true },
  { label: "Doramas", href: "/admin/doramas", icon: Clapperboard, ready: true },
  { label: "Categorias", href: "/admin/categorias", icon: FolderTree, ready: true },
  { label: "Vídeos", href: "/admin/videos", icon: UploadCloud, ready: true },
  { label: "Importação", href: "/admin/importacao", icon: DownloadCloud, ready: true },
  { label: "Usuários", href: "/admin/usuarios", icon: Users, ready: true },
  { label: "Suporte", href: "/admin/suporte", icon: MessageCircle, ready: true },
  { label: "Notificações", href: "/admin/notificacoes", icon: Bell, ready: true },
  { label: "Planos", href: "/admin/planos", icon: WalletCards, ready: true },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings, ready: true },
];
