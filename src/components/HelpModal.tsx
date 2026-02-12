import { useEffect, useMemo } from "react";
import { X, Info } from "lucide-react";

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
  /** Current UI language (controlled by parent). */
  lang: "en" | "it";
};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: any[]) => Promise<void>;
    };
  }
}

export function HelpModal({ open, onClose, lang }: HelpModalProps) {
  const t = useMemo(() => {
    const en = {
      title: "Help & theory",
      subtitle: "Quick guide to using the Karnaugh map solver.",
      section1: "1) Fill the map",
      s1_p1_prefix: "Click a cell to cycle through values:",
      s1_p2: "You can also fill the map starting from the truth table: each cell corresponds to one input combination (in Gray order) and must be set to the corresponding output value.",
      s1_b1: "1 = minterm (function is true).",
      s1_b0: "0 = maxterm (function is false).",
      s1_bx: "X = don’t care (can be used to simplify groups).",
      section2: "2) Choose the target form",
      s2_p1: "You can simplify in either:",
      s2_sop_title: "SOP",
      s2_sop_desc: "Sum of Products. Group the cells with value ",
      s2_pos_title: "POS",
      s2_pos_desc: "Product of Sums. Group the cells with value ",
      s2_tip:
        "SOP (Sum of Products) is expressed as an OR of AND-terms; simplification is achieved by grouping the cells with value 1 (minterms). POS (Product of Sums) is expressed as an AND of OR-terms; simplification is achieved by grouping the cells with value 0 (maxterms). If the target form is changed after solving, the solution should be recomputed to ensure consistency of the groupings.",
      section3: "3) Gray code ordering",
      s3_p1:
        "Karnaugh maps use Gray code on rows/columns so that adjacent cells differ by only one bit. This enables grouping in powers of two.",
      s3_p2:
        "Adjacency also wraps around edges (toroidal adjacency): left-right and top-bottom edges are considered neighbors.",
      section5: "5) Grouping rules",
      s5_r1: "Groups must be rectangles with size \\(2^k\\) (1, 2, 4, 8, ... cells).",
      s5_r2: "Groups can overlap if it yields a simpler expression.",
      s5_r3: "Use don’t cares to enlarge groups when useful.",
      s5_r4: "Avoid singletons if you can build a larger valid group.",
      closeAria: "Close",
      backdropAria: "Close help",
      dialogAria: "Help",
      langLabel: "Language",
      en: "EN",
      it: "IT",
    };

    const it = {
      title: "Guida & teoria",
      subtitle: "Guida rapida all’uso del risolutore di mappe di Karnaugh.",
      section1: "1) Compila la mappa",
      s1_p1_prefix: "Clicca una cella per ciclare i valori:",
      s1_p2: "Puoi anche compilare la mappa a partire dalla tabella di verità: ogni cella corrisponde a una combinazione degli ingressi (in ordine Gray) e va impostata con il valore di uscita corrispondente.",
      s1_b1: "1 = minterm (la funzione è vera).",
      s1_b0: "0 = maxterm (la funzione è falsa).",
      s1_bx: "X = don’t care (può essere usato per semplificare i raggruppamenti).",
      section2: "2) Scegli la forma obiettivo",
      s2_p1: "Puoi semplificare in:",
      s2_sop_title: "SOP (FND)",
      s2_sop_desc:
        "Somma di Prodotti / Forma Normale Disgiuntiva. Raggruppa le celle con valore ",
      s2_pos_title: "POS (FNC)",
      s2_pos_desc:
        "Prodotto di Somme / Forma Normale Congiuntiva. Raggruppa le celle con valore ",
      s2_tip:
        "La FND (Forma Normale Disgiuntiva) si esprime come OR di termini in AND; l’ottimizzazione avviene mediante il raggruppamento delle celle a 1 (mintermini). La FNC (Forma Normale Congiuntiva) si esprime come AND di termini in OR; l’ottimizzazione avviene mediante il raggruppamento delle celle a 0 (maxtermini). Qualora si modifichi la forma obiettivo dopo la risoluzione, si raccomanda di ricalcolare la soluzione al fine di garantire la coerenza dei raggruppamenti.",
      section3: "3) Ordinamento in Gray code",
      s3_p1:
        "Le mappe di Karnaugh usano il Gray code su righe/colonne: celle adiacenti differiscono per un solo bit. Questo permette raggruppamenti in potenze di due.",
      s3_p2:
        "L’adiacenza è anche ‘a toro’: i bordi sinistra-destra e alto-basso sono considerati adiacenti.",
      section5: "5) Regole di raggruppamento",
      s5_r1:
        "I gruppi devono essere rettangoli di dimensione \\(2^k\\) (1, 2, 4, 8, ... celle).",
      s5_r2: "I gruppi possono sovrapporsi se porta a un’espressione più semplice.",
      s5_r3: "Usa i don’t care per ingrandire i gruppi quando conviene.",
      s5_r4: "Evita i singoli se puoi costruire un gruppo valido più grande.",
      closeAria: "Chiudi",
      backdropAria: "Chiudi guida",
      dialogAria: "Guida",
      langLabel: "Lingua",
      en: "EN",
      it: "IT",
    };

    return lang === "it" ? it : en;
  }, [lang]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Re-typeset MathJax when the modal opens or language changes
  useEffect(() => {
    if (!open) return;
    const mj = window.MathJax;
    if (mj?.typesetPromise) {
      // Defer to ensure DOM is painted
      setTimeout(() => {
        mj.typesetPromise?.();
      }, 0);
    }
  }, [open, lang]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.dialogAria}
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={t.backdropAria}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border/60 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/90">
        {/* Header gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/80 via-purple-500/70 to-primary/80" />

        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{t.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-foreground/80 hover:bg-background hover:text-foreground"
            aria-label={t.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="space-y-6 text-sm leading-relaxed text-foreground">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t.section1}</h3>
              <p className="text-muted-foreground">
                {t.s1_p1_prefix}
                <span className="ml-2 inline-flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 font-mono">0</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-primary">1</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded bg-orange-500/15 px-2 py-0.5 font-mono text-orange-700 dark:text-orange-300">
                    X
                  </span>
                </span>
              </p>
              <p className="text-muted-foreground">{t.s1_p2}</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li><span className="font-mono">1</span> = {t.s1_b1.slice(4)}</li>
                <li><span className="font-mono">0</span> = {t.s1_b0.slice(4)}</li>
                <li><span className="font-mono">X</span> = {t.s1_bx.slice(4)}</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t.section2}</h3>
              <p className="text-muted-foreground">
                {t.s2_p1}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="text-sm font-semibold">{t.s2_sop_title}</div>
                  <div className="mt-1 text-muted-foreground">
                    {t.s2_sop_desc}
                    <span className="font-mono">1</span>s.
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="text-sm font-semibold">{t.s2_pos_title}</div>
                  <div className="mt-1 text-muted-foreground">
                    {t.s2_pos_desc}
                    <span className="font-mono">0</span>s.
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                {t.s2_tip}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t.section3}</h3>
              <p className="text-muted-foreground">
                {t.s3_p1}
              </p>
              <p className="text-muted-foreground">
                {t.s3_p2}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t.section5}</h3>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>{t.s5_r1}</li>
                <li>{t.s5_r2}</li>
                <li>{t.s5_r3}</li>
                <li>{t.s5_r4}</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}