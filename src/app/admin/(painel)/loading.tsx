/**
 * Esqueleto mostrado NA HORA ao trocar de tela no painel,
 * enquanto os dados da próxima tela chegam do servidor.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-8">
        <div className="h-8 w-56 rounded-lg bg-white/[0.06]" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-white/[0.04]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-line bg-ink-900/60" />
        ))}
      </div>
      <div className="mt-6 space-y-2 rounded-2xl border border-line bg-ink-900/60 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
