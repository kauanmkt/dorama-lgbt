"use client";

/**
 * KIT DE COMPONENTES DO PAINEL
 * Campos, cartões, janelas (modal), gaveta lateral, área de upload e avisos (toast).
 */
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Search, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ Estrutura da página ============

export function AdminHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Voltar",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-ink-900/70", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-300 [&_svg]:size-6">
          {icon}
        </span>
      )}
      <p className="font-display font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ============ Campos ============

const control =
  "w-full rounded-xl border border-line bg-ink-850 px-3.5 text-[15px] text-fg outline-none transition placeholder:text-fg-subtle hover:border-ink-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-600/20 disabled:opacity-60";

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-fg-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p>
      )}
    </div>
  );
}

type WithLabel = { label: string; hint?: React.ReactNode; error?: string; wrapperClassName?: string };

export function TextInput({ label, hint, error, wrapperClassName, className, ...props }: ComponentProps<"input"> & WithLabel) {
  const id = useId();
  return (
    <FormField label={label} hint={hint} error={error} htmlFor={id} className={wrapperClassName}>
      <input id={id} className={cn(control, "h-11", error && "border-danger", className)} {...props} />
    </FormField>
  );
}

export function TextArea({ label, hint, error, wrapperClassName, className, ...props }: ComponentProps<"textarea"> & WithLabel) {
  const id = useId();
  return (
    <FormField label={label} hint={hint} error={error} htmlFor={id} className={wrapperClassName}>
      <textarea id={id} className={cn(control, "min-h-28 resize-y py-2.5 leading-relaxed", className)} {...props} />
    </FormField>
  );
}

export function SelectInput({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  children,
  ...props
}: ComponentProps<"select"> & WithLabel) {
  const id = useId();
  return (
    <FormField label={label} hint={hint} error={error} htmlFor={id} className={wrapperClassName}>
      <select id={id} className={cn(control, "h-11 cursor-pointer", className)} {...props}>
        {children}
      </select>
    </FormField>
  );
}

/** Interruptor liga/desliga com título e descrição. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-fg-subtle">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-brand-600" : "bg-ink-600",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-subtle" />
      <input type="search" className={cn(control, "h-10 pl-10 text-sm")} {...props} />
    </div>
  );
}

/** Abas simples de filtro (ex.: Todos | Publicados | Rascunhos). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-line bg-ink-850 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors",
            value === o.value ? "bg-ink-600 text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="rounded-md bg-white/10 px-1.5 text-[11px] text-fg-muted">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// ============ Upload de imagem (capa / banner) ============

export function ImageDrop({
  label,
  hint,
  aspect = "poster",
  preview,
  onFile,
  busy = false,
}: {
  label: string;
  hint?: string;
  aspect?: "poster" | "banner";
  /** Arte atual (quando já existe) */
  preview?: React.ReactNode;
  /** Chamado com o arquivo escolhido (para enviar ao servidor) */
  onFile?: (file: File) => void;
  /** Mostra "Enviando…" por cima da imagem */
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(
    () => () => {
      if (file?.url) URL.revokeObjectURL(file.url);
    },
    [file],
  );

  const pick = (f?: File) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile({ url: URL.createObjectURL(f), name: f.name });
    onFile?.(f);
  };

  return (
    <FormField label={label} hint={hint}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          aspect === "poster" ? "aspect-[2/3]" : "aspect-video",
          over ? "border-brand-400 bg-brand-600/10" : "border-line hover:border-brand-500/60",
        )}
      >
        {file ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local do arquivo
          <img src={file.url} alt={file.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          preview && <div className="absolute inset-0">{preview}</div>
        )}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center transition",
            file || preview
              ? "bg-black/60 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              : "text-fg-muted",
          )}
        >
          <ImagePlus className="size-7" />
          <span className="text-sm font-semibold">{file || preview ? "Trocar imagem" : "Arraste ou clique"}</span>
          <span className="text-xs text-fg-subtle">JPG, PNG ou WebP</span>
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/70 text-sm font-semibold">
            <Loader2 className="size-4 animate-spin" /> Enviando…
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
    </FormField>
  );
}

// ============ Janela (modal) e gaveta lateral ============

function useLockScroll(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useLockScroll(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Fechar" onClick={onClose} className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-fade-up pb-safe relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-ink-900 shadow-2xl sm:rounded-3xl",
          size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useLockScroll(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button type="button" aria-label="Fechar" onClick={onClose} className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-[drawer-in_0.35s_cubic-bezier(0.22,1,0.36,1)_both] pt-safe pb-safe absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-ink-900 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="truncate text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap gap-2 border-t border-line px-5 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}

// ============ Avisos (toast) ============

type Toast = { id: number; message: string; tone: "success" | "error" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:right-6 sm:left-auto sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-up pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-ink-800/95 px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" />
            ) : (
              <XCircle className="size-5 shrink-0 text-danger" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
