"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass =
  "h-12 w-full rounded-xl border border-line bg-ink-850 px-4 text-[15px] text-fg outline-none transition placeholder:text-fg-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-600/20";

/** Campo de texto com rótulo. */
export function Field({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg-muted">
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
    </div>
  );
}

/** Campo de senha com botão de mostrar/ocultar. */
export function PasswordField({
  label = "Senha",
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg-muted">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className={cn(inputClass, "pr-12")} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-fg-subtle hover:text-fg"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </div>
  );
}

/**
 * Formulário que, por enquanto, só mostra um aviso ao enviar.
 * A autenticação real (Supabase) chega na Etapa 5.
 */
export function DemoForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [sent, setSent] = useState(false);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      {children}
      {sent && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-brand-600/15 px-4 py-3 text-sm text-brand-100 ring-1 ring-brand-500/30"
        >
          Tela pronta! A conexão com o sistema de contas será ativada na Etapa 5.
        </p>
      )}
    </form>
  );
}
