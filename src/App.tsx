import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { KmapGrid } from "./components/KmapGrid";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Download, Languages } from "lucide-react";
import { saveAs } from "file-saver";
import { solveCustom } from "./lib/solver";

import { TruthTableModal } from "./components/TruthTableModal";

// --- Types for local solver ---
export type SolveInput = {
  variables: number;
  minterms: number[];
  dontCares: number[];
  isSop: boolean;
};

export type SolveOutput = {
  expression: string;
  essentials: number[][];
  meta: {
    isSop: boolean;
    variables: number;
    timestamp: string;
  };
};

export type SolveFn = (input: SolveInput) => Promise<Omit<SolveOutput, "meta">> | Omit<SolveOutput, "meta">;

// --- Localization ---
const translations = {
  en: {
    title: "Karnaugh Map Solver",
    solve: "Solve",
    clear: "Clear",
    export: "Export JSON",
    expression: "Simplified Expression",
    one: "1",
    zero: "0",
    dontCare: "Don't Care (-)",
    mapX4_0: "Map (x₄ = 0)",
    mapX4_1: "Map (x₄ = 1)",
    solving: "Solving...",
    solveFailed: "Solve failed",
  },
  it: {
    title: "Risolutore Mappe di Karnaugh",
    solve: "Risolvi",
    clear: "Pulisci",
    export: "Esporta JSON",
    expression: "Espressione Semplificata",
    one: "1",
    zero: "0",
    dontCare: "Indifferente (-)",
    mapX4_0: "Mappa (x₄ = 0)",
    mapX4_1: "Mappa (x₄ = 1)",
    solving: "Sto risolvendo...",
    solveFailed: "Errore durante la risoluzione",
  },
} as const;

// --- MathJax Wrapper ---
const MathComponent = ({ tex }: { tex: string }) => {
  useEffect(() => {
    // expects MathJax loaded globally (optional)
    // @ts-expect-error - window.MathJax may be injected globally
    if (window.MathJax) {
      // @ts-expect-error
      window.MathJax.typesetPromise?.();
    }
  }, [tex]);

  return <span className="math-jax">{"\\(" + tex + "\\)"}</span>;
};

function formatExpressionForMathJax(expr: string): string {
  const s = (expr || "").trim();
  if (s === "" || s === "0" || s === "1") return s;

  // We currently emit SOP strings like: x_0'x_1 + x_3
  // Tokenize per term and render products with thin spaces.
  const terms = s.split(" + ");

  const toVar = (tok: string) => {
    // tok: x_12 or x_12'
    const m = tok.match(/^x_(\d+)(')?$/);
    if (!m) return tok;
    const idx = m[1];
    const neg = !!m[2];
    const base = `x_{${idx}}`;
    return neg ? `\\overline{${base}}` : base;
  };

  const texTerms = terms.map((term) => {
    // Extract literals in a product term
    const lits = term.match(/x_\d+'?/g) || [];
    if (lits.length === 0) return term;
    return lits.map(toVar).join("\\, ");
  });

  return texTerms.join(" \\; + \\; ");
}

function buildMintermsFromGrid(grid: Record<number, string>) {
  const minterms: number[] = [];
  const dontCares: number[] = [];

  for (const [idxStr, val] of Object.entries(grid)) {
    const idx = Number(idxStr);
    if (val === "1") minterms.push(idx);
    else if (val === "-") dontCares.push(idx);
  }
  minterms.sort((a, b) => a - b);
  dontCares.sort((a, b) => a - b);

  return { minterms, dontCares };
}

export default function KMapApp() {
  const [lang, setLang] = useState<"it" | "en">(() =>
    navigator.language.startsWith("it") ? "it" : "en"
  );
  const githubUrl = (import.meta as any).env?.VITE_GITHUB_URL as string | undefined;

  const [numVars, setNumVars] = useState(4);
  const [isSop, setIsSop] = useState(true);
  const [grid, setGrid] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SolveOutput | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [messageKey, setMessageKey] = useState<null | "solveFailed" | "modeChanged">(null);
  const [ttOpen, setTTOpen] = useState(false);

  const t = translations[lang];
  const messageText = messageKey
    ? messageKey === "solveFailed"
      ? t.solveFailed
      : lang === "it"
        ? "Modalità cambiata: il risultato precedente non è più valido. Premi ‘Risolvi’ per ricalcolare."
        : "Mode changed: the previous result is no longer valid. Press ‘Solve’ to recompute."
    : null;

  const solvedIsSop = result?.meta.isSop ?? isSop;
  const resultLabel = solvedIsSop
    ? lang === "it"
      ? "Forma minimale in forma normale disgiuntiva (FND)"
      : "Minimal form in Sum of Products (SOP)"
    : lang === "it"
      ? "Forma minimale in forma normale congiuntiva (FNC)"
      : "Minimal form in Product of Sums (POS)";
  const solveLocal: SolveFn = ({ variables, minterms, dontCares, isSop }) =>
    solveCustom(variables, minterms, dontCares, isSop);

  const gridSets = useMemo(() => buildMintermsFromGrid(grid), [grid]);

  // toggle 0 -> 1 -> - -> 0
  const toggleCell = (idx: number) => {
    setGrid((prev) => {
      const current = prev[idx] || "0";
      const next = current === "0" ? "1" : current === "1" ? "-" : "0";
      return { ...prev, [idx]: next };
    });
  };

  const clearGrid = () => {
    setGrid({});
    setResult(null);
    setMessageKey(null);
  };

  const exportJson = () => {
    const data = {
      variables: numVars,
      grid,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, `kmap-${numVars}vars.json`);
  };

  const solve = async () => {
    setIsSolving(true);
    setMessageKey(null);

    try {
      const { minterms, dontCares } = buildMintermsFromGrid(grid);

      const out = await solveLocal({
        variables: numVars,
        minterms,
        dontCares,
        isSop,
      });

      setResult({
        ...out,
        meta: {
          isSop,
          variables: numVars,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      setResult(null);
      setMessageKey("solveFailed");
      console.error(e);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden select-none">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 p-4 md:p-8 flex flex-col items-center">
        <Card className="w-full max-w-5xl glass-panel overflow-hidden border border-border/50 shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-primary to-accent" />
          <CardContent className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t.title}
            </h1>

            <div className="flex items-start gap-4">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {lang === "it" ? "Lingua" : "Language"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLang((l) => (l === "en" ? "it" : "en"))}
                  className="rounded-full hover:bg-accent"
                >
                  <Languages className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {lang === "it" ? "Numero variabili" : "Variables"}
                </span>
                <ToggleGroup
                  type="single"
                  value={numVars.toString()}
                  onValueChange={(v: string) => v && setNumVars(parseInt(v, 10))}
                >
                  {[2, 3, 4, 5].map((v) => (
                    <ToggleGroupItem key={v} value={v.toString()} className="w-10">
                      {v}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {lang === "it" ? "Forma" : "Form"}
                </span>
                <ToggleGroup
                  type="single"
                  value={isSop ? "sop" : "pos"}
                  onValueChange={(v: string) => {
                    if (!v) return;
                    const nextIsSop = v === "sop";
                    // If a result is currently shown, invalidate it to avoid mismatched labeling.
                    if (result) {
                      setResult(null);
                      setMessageKey("modeChanged");
                    } else {
                      setMessageKey(null);
                    }
                    setIsSop(nextIsSop);
                  }}
                >
                  <ToggleGroupItem value="sop" className="px-3">
                    {lang === "it" ? "FND" : "SOP"}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="pos" className="px-3">
                    {lang === "it" ? "FNC" : "POS"}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          {/* Map Area */}
          <div className="flex flex-col items-center justify-center min-h-[400px] mb-8">
            <KmapGrid
              variables={numVars}
              minterms={gridSets.minterms}
              dontCares={gridSets.dontCares}
              groups={result?.essentials}
              onCellToggle={(index) => toggleCell(index)}
            />
          </div>

          <div className="flex justify-center gap-8 text-xs text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary/20 rounded-sm" /> {t.one}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted rounded-sm" /> {t.zero}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent/20 rounded-sm" /> {t.dontCare}
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col items-center gap-6 border-t pt-8">
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              onClick={solve}
              disabled={isSolving}
              className="min-w-[120px] font-bold shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              {isSolving ? t.solving : t.solve}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={clearGrid}
              className="min-w-[120px] transition-all duration-200 hover:bg-muted/60 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.clear}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setTTOpen(true)}
              className="min-w-[180px] transition-all duration-200 hover:bg-muted/60 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              {lang === "it" ? "Tabella di verità" : "Truth table"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={exportJson}
              className="min-w-[120px] transition-all duration-200 hover:bg-muted/60 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-4 h-4 mr-2" />
              {t.export}
            </Button>
          </div>

            {messageText && (
              <div className="text-sm text-red-400">{messageText}</div>
            )}

            {/* Result Display */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-muted/30 p-6 rounded-xl border border-primary/5 text-center"
                >
                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 font-bold">
                    {resultLabel}
                  </p>
                  <div className="text-base md:text-lg font-mono text-foreground flex items-center justify-center gap-3">
                    <MathComponent
                      tex={`f(\\mathbf{x}) = ${formatExpressionForMathJax(result.expression)}`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
        </Card>
      </div>
      <TruthTableModal
        open={ttOpen}
        onClose={() => setTTOpen(false)}
        variables={numVars}
        minterms={gridSets.minterms}
        dontCares={gridSets.dontCares}
        lang={lang}
        onApply={({ minterms, dontCares }) => {
          // Rebuild the sparse grid map from truth table selections
          const nextGrid: Record<number, string> = {};
          for (const m of minterms) nextGrid[m] = "1";
          for (const d of dontCares) nextGrid[d] = "-";
          setGrid(nextGrid);
          setResult(null);
          setMessageKey(null);
        }}
      />

      <footer className="relative z-10 w-full mt-6 px-4 md:px-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="h-px w-full bg-border/70" />

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground/80">K-Map Solver</span>
              <span className="opacity-60">•</span>
              <span>
                © {new Date().getFullYear()} {lang === "it" ? "Tutti i diritti riservati" : "All rights reserved"}
              </span>
              <span className="opacity-60">•</span>
              {githubUrl ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  GitHub repo
                </a>
              ) : (
                <span className="opacity-70">
                  {lang === "it" ? "GitHub repo: <inserisci-link>" : "GitHub repo: <insert-link>"}
                </span>
              )}
            </div>

            <div className="opacity-80">
              {lang === "it"
                ? "Consiglio: usa la Tabella di verità per compilare velocemente."
                : "Tip: use the Truth table for quick entry."}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}