// src/lib/truthTableUtils.ts

export type TTValue = 0 | 1 | 2; // 2 = don't care (X)

export function pow2(n: number): number {
  return 1 << n;
}

export function indexToBits(index: number, variables: number): number[] {
  // MSB -> LSB (x0 is MSB)
  const bits: number[] = [];
  for (let i = variables - 1; i >= 0; i--) {
    bits.push((index >> i) & 1);
  }
  return bits;
}

export function bitsToIndex(bits: number[]): number {
  let v = 0;
  for (let i = 0; i < bits.length; i++) {
    v = (v << 1) | (bits[i] & 1);
  }
  return v;
}

export function buildTableFromSets(
  variables: number,
  minterms: number[],
  dontCares: number[]
): TTValue[] {
  const size = pow2(variables);
  const table: TTValue[] = Array(size).fill(0);

  for (const m of minterms) {
    if (m >= 0 && m < size) table[m] = 1;
  }
  for (const d of dontCares) {
    if (d >= 0 && d < size) table[d] = 2;
  }
  return table;
}

export function setsFromTable(
  variables: number,
  table: TTValue[]
): { minterms: number[]; dontCares: number[]; maxterms: number[] } {
  const size = pow2(variables);
  const minterms: number[] = [];
  const dontCares: number[] = [];
  const maxterms: number[] = [];

  for (let i = 0; i < size; i++) {
    const v = table[i] ?? 0;
    if (v === 1) minterms.push(i);
    else if (v === 2) dontCares.push(i);
    else maxterms.push(i);
  }
  return { minterms, dontCares, maxterms };
}

function joinList(xs: number[]): string {
  return xs.length ? xs.join(",") : "\\varnothing";
}

/**
 * Returns TeX strings like:
 *  f(\\mathbf{x}) = \\Sigma m(1,3,7) \\quad d(2,5)
 *  f(\\mathbf{x}) = \\Pi M(0,2,4) \\quad d(1)
 */
export function formatSigmaPiTex(
  variables: number,
  table: TTValue[]
): { sigmaTex: string; piTex: string } {
  const { minterms, dontCares, maxterms } = setsFromTable(variables, table);

  const sigma = `f(\\\\mathbf{x}) = \\\\Sigma m(${joinList(minterms)})`;
  const pi = `f(\\\\mathbf{x}) = \\\\Pi M(${joinList(maxterms)})`;

  const dPart =
    dontCares.length > 0 ? `\\\\quad d(${joinList(dontCares)})` : "";

  return {
    sigmaTex: sigma + dPart,
    piTex: pi + dPart,
  };
}