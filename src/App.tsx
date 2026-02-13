import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { KmapGrid } from "./components/KmapGrid";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Languages, HelpCircle } from "lucide-react";
import { solveCustom } from "./lib/solver";

import { TruthTableModal } from "./components/TruthTableModal";
import { HelpModal } from "./components/HelpModal";

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
    if (window.MathJax) {
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

function buildDecimalFormTex(
  variables: number,
  minterms: number[],
  dontCares: number[],
  isSop: boolean
): string {
  const total = Math.pow(2, variables);

  const fmtList = (xs: number[]) => xs.join(", ");

  const hasDC = dontCares.length > 0;

  if (isSop) {
    // SOP canonical decimal form: Σ_1(minterms) + Σ_d(dont cares)
    if (minterms.length === 0) return "0";
    if (minterms.length + dontCares.length === total) return "1";

    const base = `\\Sigma_{1}\\left(${fmtList(minterms)}\\right)`;
    const dc = hasDC ? ` + \\Sigma_{d}\\left(${fmtList(dontCares)}\\right)` : "";
    return base + dc;
  }

  // POS canonical decimal form: Π_0(maxterms) · Π_d(dont cares)
  // zeros are all indices not in minterms and not in dontCares
  const mtSet = new Set(minterms);
  const dcSet = new Set(dontCares);
  const zeros: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!mtSet.has(i) && !dcSet.has(i)) zeros.push(i);
  }

  if (zeros.length === 0) return "1";
  if (zeros.length + dontCares.length === total) return "0";

  const base = `\\Pi_{0}\\left(${fmtList(zeros)}\\right)`;
  const dc = hasDC ? `\\,\\cdot\\,\\Pi_{d}\\left(${fmtList(dontCares)}\\right)` : "";
  return base + dc;
}

export default function KMapApp() {
  const [lang, setLang] = useState<"it" | "en">(() =>
    navigator.language.startsWith("it") ? "it" : "en"
  );

  const [numVars, setNumVars] = useState(4);
  const [isSop, setIsSop] = useState(true);
  const [grid, setGrid] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SolveOutput | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [messageKey, setMessageKey] = useState<null | "solveFailed" | "modeChanged">(null);
  const [ttOpen, setTTOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
      ? "Forma minimale in FND"
      : "Minimal form in SOP"
    : lang === "it"
      ? "Forma minimale in FNC"
      : "Minimal form in POS  ";
  const solveLocal: SolveFn = ({ variables, minterms, dontCares, isSop }) =>
    solveCustom(variables, minterms, dontCares, isSop);

  const gridSets = useMemo(() => buildMintermsFromGrid(grid), [grid]);
  const decimalTex = useMemo(
    () => buildDecimalFormTex(numVars, gridSets.minterms, gridSets.dontCares, solvedIsSop),
    [numVars, gridSets.minterms, gridSets.dontCares, solvedIsSop]
  );

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
          {/* Header (mobile) */}
          <div className="md:hidden mb-6 border-b pb-4">
            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
                <span className="bg-gradient-to-r from-primary via-primary to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
                  {t.title}
                </span>
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHelpOpen(true)}
                  className="rounded-full hover:bg-accent"
                  aria-label={lang === "it" ? "Aiuto" : "Help"}
                >
                  <HelpCircle className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLang((l) => (l === "en" ? "it" : "en"))}
                  className="rounded-full hover:bg-accent"
                  aria-label={lang === "it" ? "Cambia lingua" : "Change language"}
                >
                  <Languages className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-4 grid grid-cols-1 gap-4">
              <div className="flex flex-col items-start gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {lang === "it" ? "Numero variabili" : "Variables"}
                </span>
                <ToggleGroup
                  type="single"
                  value={numVars.toString()}
                  onValueChange={(v: string) => v && setNumVars(parseInt(v, 10))}
                  className="flex flex-wrap"
                >
                  {[2, 3, 4, 5].map((v) => (
                    <ToggleGroupItem key={v} value={v.toString()} className="w-10">
                      {v}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col items-start gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {lang === "it" ? "Forma" : "Form"}
                </span>
                <ToggleGroup
                  type="single"
                  value={isSop ? "sop" : "pos"}
                  onValueChange={(v: string) => {
                    if (!v) return;
                    const nextIsSop = v === "sop";
                    if (result) {
                      setResult(null);
                      setMessageKey("modeChanged");
                    } else {
                      setMessageKey(null);
                    }
                    setIsSop(nextIsSop);
                  }}
                  className="flex"
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
          {/* Header (desktop) */}
          <div className="hidden md:flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">
              <span className="bg-gradient-to-r from-primary via-primary to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
                {t.title}
              </span>
            </h1>

            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold opacity-0 select-none">
                  {lang === "it" ? "Lingua" : "Language"}
                </span>
                <div className="flex h-10 items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHelpOpen(true)}
                    className="rounded-full hover:bg-accent"
                    aria-label={lang === "it" ? "Aiuto" : "Help"}
                  >
                    <HelpCircle className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLang((l) => (l === "en" ? "it" : "en"))}
                    className="rounded-full hover:bg-accent"
                    aria-label={lang === "it" ? "Cambia lingua" : "Change language"}
                  >
                    <Languages className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {lang === "it" ? "Numero variabili" : "Variables"}
                </span>
                <ToggleGroup
                  type="single"
                  value={numVars.toString()}
                  onValueChange={(v: string) => v && setNumVars(parseInt(v, 10))}
                  className="h-10"
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
                  className="h-10"
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
                  className="w-full bg-muted/30 p-4 md:p-6 rounded-xl border border-primary/5 overflow-x-auto"
                >
                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 font-bold">
                    {lang === "it" ? "Forma decimale (Σ/Π)" : "Decimal form (Σ/Π)"}
                  </p>
                  <div className="text-sm md:text-lg font-mono text-foreground flex items-start justify-start gap-3 mb-4 min-w-max">
                    <MathComponent tex={`f(\\mathbf{x}) = ${decimalTex}`} />
                  </div>

                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 font-bold">
                    {resultLabel}
                  </p>
                  <div className="text-sm md:text-lg font-mono text-foreground flex items-start justify-start gap-3 min-w-max">
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
      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        lang={lang}
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
              <a
                href="https://github.com/M4rulli/K-Map-Solver"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                GitHub repo
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}