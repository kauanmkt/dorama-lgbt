import { cn } from "@/lib/utils";

/** Cabeçalho padrão das páginas internas (título + subtítulo). */
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-fade-up mb-8", className)}>
      {eyebrow && (
        <p className="text-xs font-bold tracking-[0.2em] text-brand-300 uppercase">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-fg-muted">{description}</p>}
      {children}
    </div>
  );
}

/** Container com as margens laterais padrão do app. */
export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10", className)}>
      {children}
    </div>
  );
}
