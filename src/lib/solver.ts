// Client-side Quine-McCluskey Solver

export interface Implicant {
  term: string;
  minterms: number[];
  isPrime: boolean;
}

export interface SolverResult {
  expression: string;
  essentials: number[][];
}

export function solveCustom(
  variables: number,
  minterms: number[],
  dontCares: number[],
  isSop: boolean = true
): SolverResult {
  if (!isSop) {
    const allIndices = new Set<number>();
    const total = Math.pow(2, variables);
    for (let i = 0; i < total; i++) allIndices.add(i);

    minterms.forEach(m => allIndices.delete(m));
    dontCares.forEach(d => allIndices.delete(d));

    const zeros = Array.from(allIndices).sort((a, b) => a - b);

    // If there are no zeros, the function is identically 1 (even in POS mode).
    if (zeros.length === 0) {
      return { expression: "1", essentials: [] };
    }

    const solution = runQM(variables, zeros, dontCares);

    return {
      expression: formatPosFromTerms(solution.terms, variables),
      essentials: solution.groups
    };
  } else {
    const solution = runQM(variables, minterms, dontCares);
    return {
      expression: solution.expression,
      essentials: solution.groups
    };
  }
}

function runQM(
  variables: number,
  minterms: number[],
  dontCares: number[]
): { expression: string; groups: number[][]; terms: string[] } {
  if (minterms.length === 0) return { expression: "0", groups: [], terms: [] };
  const total = Math.pow(2, variables);
  if (minterms.length + dontCares.length === total)
    return { expression: "1", groups: [[...minterms, ...dontCares]], terms: ["-".repeat(variables)] };

  let groups: Implicant[][] = Array.from({ length: variables + 1 }, () => []);

  [...minterms, ...dontCares].forEach(m => {
    const bin = m.toString(2).padStart(variables, "0");
    const ones = bin.split("1").length - 1;
    groups[ones].push({ term: bin, minterms: [m], isPrime: true });
  });

  const primeImplicants: Implicant[] = [];
  let currentGroups = groups;

  while (currentGroups.some(g => g.length > 0)) {
    const nextGroups: Implicant[][] = Array.from({ length: variables + 1 }, () => []);

    for (let i = 0; i < currentGroups.length - 1; i++) {
      const g1 = currentGroups[i];
      const g2 = currentGroups[i + 1];

      for (const t1 of g1) {
        for (const t2 of g2) {
          const diff = diffIndex(t1.term, t2.term);
          if (diff !== -1) {
            const newTerm =
              t1.term.substring(0, diff) +
              "-" +
              t1.term.substring(diff + 1);

            const existing = nextGroups[i].find(t => t.term === newTerm);
            if (!existing) {
              nextGroups[i].push({
                term: newTerm,
                minterms: [...t1.minterms, ...t2.minterms].sort((a, b) => a - b),
                isPrime: true
              });
            }

            t1.isPrime = false;
            t2.isPrime = false;
          }
        }
      }
    }

    currentGroups.flat().forEach(t => {
      if (t.isPrime) primeImplicants.push(t);
    });

    if (nextGroups.every(g => g.length === 0)) break;
    currentGroups = nextGroups;
  }

  const uniquePIs: Implicant[] = [];
  const seenTerms = new Set<string>();

  primeImplicants.forEach(pi => {
    if (!seenTerms.has(pi.term)) {
      seenTerms.add(pi.term);
      uniquePIs.push(pi);
    }
  });

  let remainingMinterms = [...minterms];
  const finalPIs: Implicant[] = [];

  const coverage: { [m: number]: Implicant[] } = {};
  remainingMinterms.forEach(m => (coverage[m] = []));

  uniquePIs.forEach(pi => {
    pi.minterms.forEach(m => {
      if (remainingMinterms.includes(m)) {
        coverage[m].push(pi);
      }
    });
  });

  let changed = true;
  while (changed && remainingMinterms.length > 0) {
    changed = false;

    const essentials = remainingMinterms.filter(
      m => coverage[m] && coverage[m].length === 1
    );

    const newEssentials = new Set<Implicant>();

    essentials.forEach(m => {
      const pi = coverage[m][0];
      newEssentials.add(pi);
    });

    if (newEssentials.size > 0) {
      changed = true;
      newEssentials.forEach(pi => {
        finalPIs.push(pi);
        remainingMinterms = remainingMinterms.filter(
          m => !pi.minterms.includes(m)
        );
      });
    }
  }

  while (remainingMinterms.length > 0) {
    let bestPI: Implicant | null = null;
    let maxCover = -1;

    uniquePIs.forEach(pi => {
      if (finalPIs.includes(pi)) return;

      const count = pi.minterms.filter(m =>
        remainingMinterms.includes(m)
      ).length;

      if (count > maxCover) {
        maxCover = count;
        bestPI = pi;
      }
    });

    if (bestPI && maxCover > 0) {
      finalPIs.push(bestPI);
      remainingMinterms = remainingMinterms.filter(
        m => !bestPI!.minterms.includes(m)
      );
    } else break;
  }

  const varNames = Array.from(
    { length: variables },
    (_, i) => `x_${i}`
  );

  const expression = finalPIs
    .map(pi => formatTerm(pi.term, varNames))
    .join(" + ");

  return {
    expression: expression || "0",
    groups: finalPIs.map(pi => pi.minterms),
    terms: finalPIs.map(pi => pi.term)
  };
}

function diffIndex(t1: string, t2: string): number {
  let diff = -1;
  for (let i = 0; i < t1.length; i++) {
    if (t1[i] !== t2[i]) {
      if (diff !== -1) return -1;
      diff = i;
    }
  }
  return diff;
}

function formatTerm(term: string, vars: string[]): string {
  let res = "";
  let isAllDashes = true;

  for (let i = 0; i < term.length; i++) {
    if (term[i] !== "-") {
      isAllDashes = false;
      res += vars[i];
      if (term[i] === "0") res += "'";
    }
  }

  return isAllDashes ? "1" : res;
}

function formatPosFromTerms(terms: string[], variables: number): string {
  // terms represent implicants of f' (i.e., groups of zeros of f).
  // If f' contains the all-dash implicant, then f' = 1 and f = 0.
  if (terms.some(t => /^-+$/.test(t))) return "0";

  const vars = Array.from({ length: variables }, (_, i) => `x_${i}`);

  const factors = terms.map(term => {
    const lits: string[] = [];

    for (let i = 0; i < term.length; i++) {
      const b = term[i];
      if (b === "-") continue;

      // POS (maxterm) mapping for a zero-cube:
      // 0 -> x_i
      // 1 -> x_i'
      if (b === "0") lits.push(vars[i]);
      else if (b === "1") lits.push(vars[i] + "'");
    }

    // Avoid producing empty parentheses
    if (lits.length === 0) return "(0)";

    return `(${lits.join(" + ")})`;
  });

  // Product of sums: concatenate factors
  return factors.join("");
}
