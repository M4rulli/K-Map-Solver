// src/components/TruthTableModal.tsx

import { useEffect, useState } from "react";
import type { TTValue } from "../lib/truthTableUtils";
import {
  buildTableFromSets,
  indexToBits,
  pow2,
  setsFromTable,
} from "../lib/truthTableUtils";

function MJ({ tex, className }: { tex: string; className?: string }) {
  useEffect(() => {
    // @ts-expect-error MathJax injected globally
    const mj = window.MathJax;
    if (!mj?.typesetPromise) return;
    // Defer typeset to the next frame so newly-mounted DOM is present
    requestAnimationFrame(() => {
      mj.typesetPromise();
    });
  }, [tex]);
  return <span className={className}>{`\\(${tex}\\)`}</span>;
}

type Lang = "it" | "en";

export interface TruthTableModalProps {
  open: boolean;
  onClose: () => void;

  variables: number;
  minterms: number[];
  dontCares: number[];

  onApply: (next: { minterms: number[]; dontCares: number[] }) => void;

  lang?: Lang;
  title?: string;
}

export function TruthTableModal({
  open,
  onClose,
  variables,
  minterms,
  dontCares,
  onApply,
  lang = "it",
  title,
}: TruthTableModalProps) {
  const size = pow2(variables);

  // Draft state inside modal
  const [table, setTable] = useState<TTValue[]>(() =>
    buildTableFromSets(variables, minterms, dontCares)
  );

  // When modal opens (or inputs change), sync draft from current map
  useEffect(() => {
    if (!open) return;
    setTable(buildTableFromSets(variables, minterms, dontCares));
  }, [open, variables, minterms, dontCares]);

  // Ensure MathJax typesets when the modal is opened
  useEffect(() => {
    if (!open) return;
    // @ts-expect-error MathJax injected globally
    const mj = window.MathJax;
    if (!mj?.typesetPromise) return;
    requestAnimationFrame(() => {
      mj.typesetPromise();
    });
  }, [open]);

  const t = {
    it: {
      heading: title ?? "Tabella di verità",
      subtitle: "Clicca la colonna f per ciclare: 0 → 1 → x → 0",
      clear: "Pulisci",
      cancel: "Annulla",
      ok: "OK",
      index: "#",
      f: "f",
      sigma: "Forma decimale (mintermini)",
      pi: "Forma decimale (maxtermini)",
    },
    en: {
      heading: title ?? "Truth table",
      subtitle: "Click the f column to cycle: 0 → 1 → x → 0",
      clear: "Clear",
      cancel: "Cancel",
      ok: "OK",
      index: "#",
      f: "f",
      sigma: "Decimal form (minterms)",
      pi: "Decimal form (maxterms)",
    },
  }[lang];

  const toggle = (i: number) => {
    setTable((prev) => {
      const next = prev.slice();
      const cur = next[i] ?? 0;
      next[i] = cur === 0 ? 1 : cur === 1 ? 2 : 0;
      return next;
    });
  };

  const clear = () => setTable(Array(size).fill(0) as TTValue[]);

  const handleOk = () => {
    const { minterms: ms, dontCares: ds } = setsFromTable(variables, table);
    onApply({ minterms: ms, dontCares: ds });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
        <div
          className="w-full max-w-6xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-primary/80 to-purple-500/80" />

          {/* Header */}
          <div className="p-6 border-b border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-foreground">
                  {t.heading}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-hidden flex flex-col gap-6">
            {/* Table */}
            <div className="rounded-xl border border-border bg-background/40 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border/60">
                      <th className="px-3 py-2 text-xs tracking-widest text-muted-foreground text-left">
                        {t.index}
                      </th>
                      {Array.from({ length: variables }, (_, k) => (
                        <th
                          key={k}
                          className="px-3 py-2 text-xs tracking-widest text-muted-foreground text-center"
                        >
                          <MJ tex={`x_{${k}}`} />
                        </th>
                      ))}
                      <th className="px-3 py-2 text-xs tracking-widest text-muted-foreground text-center">
                        <MJ tex={t.f} />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.from({ length: size }, (_, i) => {
                      const bits = indexToBits(i, variables);
                      const v = table[i] ?? 0;

                      const pill =
                        v === 1
                          ? "bg-primary/15 text-foreground border-primary/20"
                          : v === 2
                          ? "bg-orange-500/15 text-foreground border-orange-500/20"
                          : "bg-muted/40 text-foreground border-border/60";

                      return (
                        <tr
                          key={i}
                          className="border-b border-border/40 hover:bg-muted/20 transition"
                        >
                          <td className="px-3 py-2 text-sm text-muted-foreground font-mono">
                            {i}
                          </td>

                          {bits.map((b, bi) => (
                            <td
                              key={bi}
                              className="px-3 py-2 text-center text-sm font-mono text-foreground"
                            >
                              {b}
                            </td>
                          ))}

                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(i)}
                              className={[
                                "inline-flex items-center justify-center",
                                "h-9 min-w-[3.2rem] px-3 rounded-lg border",
                                "font-mono font-bold text-sm",
                                "transition active:scale-[0.98]",
                                pill,
                              ].join(" ")}
                              title="0 → 1 → x → 0"
                            >
                              {v === 2 ? "x" : v}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border/60 flex flex-row flex-wrap items-center justify-between gap-3">
            <button
              onClick={clear}
              className="h-10 px-3 text-sm rounded-lg border border-border bg-background/50 hover:bg-muted transition shrink-0"
            >
              {t.clear}
            </button>

            <div className="flex gap-3 justify-end shrink-0">
              <button
                onClick={onClose}
                className="h-10 px-4 rounded-lg border border-border bg-background/50 hover:bg-muted transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleOk}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition font-semibold"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}