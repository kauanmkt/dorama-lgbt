"use client";

/**
 * UPLOAD DE VÍDEO — direto do navegador para o Cloudflare R2.
 *
 *  1. O painel pede ao servidor uma autorização (iniciarEnvio).
 *  2. O servidor confere se você é admin e devolve links temporários do R2.
 *  3. O navegador envia o arquivo em partes de 50 MB, 3 de cada vez.
 *     Se uma parte falhar, só ela é reenviada (até 4 tentativas).
 *  4. No fim, o servidor registra o vídeo no banco e vincula ao episódio.
 *
 * Sem banco configurado (modo demonstração), o envio é apenas simulado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cancelarEnvio, iniciarEnvio } from "@/lib/video-actions";

export const PART_SIZE = 50 * 1024 * 1024;
const PARALLEL = 3;
const RETRIES = 4;

export type UploadState = {
  status: "idle" | "enviando" | "finalizando" | "concluido" | "cancelado" | "erro";
  percent: number;
  partsDone: number;
  partsTotal: number;
  /** bytes por segundo */
  speed: number;
  error?: string;
};

/** Dados do envio terminado, para vincular ao episódio. `null` = modo demonstração. */
export type FinishedUpload = {
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
  durationSec?: number;
} | null;

export type LinkResult = { ok: true; message?: string } | { ok: false; error: string };

const idle: UploadState = { status: "idle", percent: 0, partsDone: 0, partsTotal: 0, speed: 0 };

/** Lê a duração do vídeo sem enviar nada (usa o arquivo local). */
function probeDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (v?: number) => {
      URL.revokeObjectURL(url);
      resolve(v && Number.isFinite(v) ? v : undefined);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done();
    setTimeout(() => done(), 8000);
    video.src = url;
  });
}

function putPart(url: string, body: Blob, onProgress: (loaded: number) => void, register: (x: XMLHttpRequest) => void) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    register(xhr);
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      const etag = xhr.getResponseHeader("ETag");
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      else if (xhr.status >= 200 && xhr.status < 300)
        reject(new Error("O R2 não liberou a leitura da confirmação (ETag). Confira a regra de CORS."));
      else reject(new Error(`Falha ao enviar parte (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Conexão interrompida"));
    xhr.onabort = () => reject(new DOMException("cancelado", "AbortError"));
    xhr.send(body);
  });
}

export function useVideoUpload() {
  const [state, setState] = useState<UploadState>(idle);
  const xhrs = useRef(new Set<XMLHttpRequest>());
  const session = useRef<{ key: string; uploadId: string } | null>(null);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Avisa antes de fechar a aba no meio de um envio
  useEffect(() => {
    if (state.status !== "enviando" && state.status !== "finalizando") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.status]);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      xhrs.current.forEach((x) => x.abort());
    },
    [],
  );

  const simulate = (file: File, link: (u: FinishedUpload) => Promise<LinkResult>) => {
    const partsTotal = Math.max(1, Math.ceil(file.size / PART_SIZE));
    const speed = (25 + Math.random() * 20) * 1024 * 1024;
    const totalMs = Math.min(9000, Math.max(2500, (file.size / speed) * 1000));
    const startedAt = Date.now();
    setState({ status: "enviando", percent: 0, partsDone: 0, partsTotal, speed });
    timer.current = setInterval(async () => {
      const pct = Math.min(100, ((Date.now() - startedAt) / totalMs) * 100);
      setState({ status: "enviando", percent: pct, partsDone: Math.floor((pct / 100) * partsTotal), partsTotal, speed });
      if (pct >= 100) {
        clearInterval(timer.current);
        await link(null);
        setState((s) => ({ ...s, status: "concluido", percent: 100, partsDone: partsTotal }));
      }
    }, 120);
  };

  const start = useCallback(async (file: File, link: (u: FinishedUpload) => Promise<LinkResult>) => {
    cancelled.current = false;
    if (!isSupabaseConfigured) return simulate(file, link);

    const fail = (error: string) => setState((s) => ({ ...s, status: "erro", error }));
    setState({ ...idle, status: "enviando" });
    const durationPromise = probeDuration(file);

    const init = await iniciarEnvio({ fileName: file.name, size: file.size, contentType: file.type });
    if (!init.ok) return fail(init.error);
    if (cancelled.current) return;
    session.current = { key: init.key, uploadId: init.uploadId };

    const partsTotal = init.urls.length;
    const loaded = new Array<number>(partsTotal).fill(0);
    const etags = new Array<string>(partsTotal);
    const startedAt = Date.now();
    let done = 0;
    const report = () => {
      const sent = loaded.reduce((a, b) => a + b, 0);
      const secs = Math.max(0.5, (Date.now() - startedAt) / 1000);
      setState({
        status: "enviando",
        percent: Math.min(99.5, (sent / file.size) * 100),
        partsDone: done,
        partsTotal,
        speed: sent / secs,
      });
    };

    let next = 0;
    const worker = async () => {
      while (next < partsTotal && !cancelled.current) {
        const i = next++;
        const blob = file.slice(i * init.partSize, Math.min(file.size, (i + 1) * init.partSize));
        for (let attempt = 1; ; attempt++) {
          try {
            etags[i] = await putPart(
              init.urls[i],
              blob,
              (l) => {
                loaded[i] = l;
                report();
              },
              (x) => {
                xhrs.current.add(x);
                x.addEventListener("loadend", () => xhrs.current.delete(x));
              },
            );
            loaded[i] = blob.size;
            done++;
            report();
            break;
          } catch (e) {
            if (cancelled.current || (e instanceof DOMException && e.name === "AbortError")) throw e;
            if (attempt >= RETRIES || (e instanceof Error && e.message.includes("CORS"))) throw e;
            loaded[i] = 0;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(PARALLEL, partsTotal) }, worker));
    } catch (e) {
      if (cancelled.current) return;
      await cancelarEnvio({ key: init.key, uploadId: init.uploadId }).catch(() => {});
      return fail(e instanceof Error ? e.message : "Falha no envio");
    }
    if (cancelled.current) return;

    setState((s) => ({ ...s, status: "finalizando", percent: 99.5, partsDone: partsTotal }));
    const r = await link({
      key: init.key,
      uploadId: init.uploadId,
      parts: etags.map((etag, i) => ({ partNumber: i + 1, etag })),
      durationSec: await durationPromise,
    });
    session.current = null;
    if (!r.ok) return fail(r.error);
    setState((s) => ({ ...s, status: "concluido", percent: 100 }));
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    clearInterval(timer.current);
    xhrs.current.forEach((x) => x.abort());
    xhrs.current.clear();
    if (session.current) {
      const s = session.current;
      session.current = null;
      cancelarEnvio(s).catch(() => {});
    }
    setState((s) => ({ ...s, status: "cancelado" }));
  }, []);

  const reset = useCallback(() => {
    clearInterval(timer.current);
    setState(idle);
  }, []);

  return { state, start, cancel, reset };
}
