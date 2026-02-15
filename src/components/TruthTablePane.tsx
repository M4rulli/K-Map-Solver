import { useEffect, useMemo } from "react";
import type { TTValue } from "../lib/truthTableUtils";
import { buildTableFromSets, indexToBits, pow2 } from "../lib/truthTableUtils";

type Lang = "it" | "en";

type Props = {
  variables: number;
  minterms: number[];
  dontCares: number[];
  onToggle: (index: number) => void;
  lang: Lang;
};

function MJ({ tex, className }: { tex: string; className?: string }) {
  useEffect(() => {
    requestAnimationFrame(() => {
      window.MathJax?.typesetPromise?.();
    });
  }, [tex]);

  return <span className={className}>{`\\(${tex}\\)`}</span>;
}

export function TruthTablePane({ variables, minterms, dontCares, onToggle, lang }: Props) {
  const size = pow2(variables);

  const table = useMemo(
    () => buildTableFromSets(variables, minterms, dontCares),
    [variables, minterms, dontCares]
  );

  const t = {
    it: {
      subtitle: "Click su f per ciclare: 0 → 1 → x → 0",
      index: "#",
      f: "f",
      aria: "Valore funzione",
    },
    en: {
      subtitle: "Click f to cycle: 0 → 1 → x → 0",
      index: "#",
      f: "f",
      aria: "Function value",
    },
  }[lang];

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-border/60 bg-card/70 shadow-lg overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary/80 to-accent/80" />
      <div className="p-4 md:p-5">
        <p className="text-xs md:text-sm text-muted-foreground mb-3">{t.subtitle}</p>

        <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
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
                  const v = (table[i] ?? 0) as TTValue;

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
                      <td className="px-3 py-2 text-sm text-muted-foreground font-mono">{i}</td>

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
                          onClick={() => onToggle(i)}
                          aria-label={`${t.aria} ${i}`}
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
    </div>
  );
}
