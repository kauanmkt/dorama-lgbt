"use client";

/**
 * UPLOAD DE VÍDEO — simulação visual (Etapa 3).
 *
 * Como vai funcionar de verdade (Etapa 7):
 *  1. O painel pede ao nosso servidor uma "autorização" de envio.
 *  2. O servidor confere se você é admin e devolve links temporários do R2.
 *  3. O navegador envia o arquivo DIRETO para o R2, em partes de ~50 MB
 *     (multipart). Se uma parte falhar, só ela é reenviada.
 *  4. Ao terminar, o servidor registra o vídeo no Supabase e vincula ao episódio.
 *
 * Aqui simulamos as partes e o progresso para validar a experiência.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const PART_SIZE = 50 * 1024 * 1024;

export type UploadState = {
  status: "idle" | "enviando" | "concluido" | "cancelado";
  percent: number;
  partsDone: number;
  partsTotal: number;
  /** bytes por segundo (simulado) */
  speed: number;
};

const idle: UploadState = { status: "idle", percent: 0, partsDone: 0, partsTotal: 0, speed: 0 };

export function useSimulatedUpload() {
  const [state, setState] = useState<UploadState>(idle);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stop = () => clearInterval(timer.current);
  useEffect(() => stop, []);

  const start = useCallback((sizeBytes: number, onDone?: () => void) => {
    stop();
    const partsTotal = Math.max(1, Math.ceil(sizeBytes / PART_SIZE));
    // Velocidade simulada (~25–45 MB/s), com tempo mínimo para dar para ver
    const speed = (25 + Math.random() * 20) * 1024 * 1024;
    const totalMs = Math.min(9000, Math.max(2500, (sizeBytes / speed) * 1000));
    const startedAt = Date.now();
    setState({ status: "enviando", percent: 0, partsDone: 0, partsTotal, speed });
    timer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / totalMs) * 100);
      setState({
        status: pct >= 100 ? "concluido" : "enviando",
        percent: pct,
        partsDone: Math.floor((pct / 100) * partsTotal),
        partsTotal,
        speed,
      });
      if (pct >= 100) {
        stop();
        onDone?.();
      }
    }, 120);
  }, []);

  const cancel = useCallback(() => {
    stop();
    setState((s) => ({ ...s, status: "cancelado" }));
  }, []);

  const reset = useCallback(() => {
    stop();
    setState(idle);
  }, []);

  return { state, start, cancel, reset };
}
