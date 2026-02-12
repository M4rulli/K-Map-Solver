// Utility functions for Karnaugh Map logic

// Generate Gray codes for n bits
export function generateGrayCodes(n: number): string[] {
  if (n <= 0) return [""];
  if (n === 1) return ["0", "1"];
  
  const prev = generateGrayCodes(n - 1);
  const result: string[] = [];
  
  // Mirror construction
  for (let i = 0; i < prev.length; i++) {
    result.push("0" + prev[i]);
  }
  for (let i = prev.length - 1; i >= 0; i--) {
    result.push("1" + prev[i]);
  }
  
  return result;
}

// Get row and column bit counts based on total variables
export function getGridDimensions(vars: number) {
  // 2 vars: 1 row bit (A), 1 col bit (B) -> 2x2
  // 3 vars: 1 row bit (A), 2 col bits (BC) -> 2x4
  // 4 vars: 2 row bits (AB), 2 col bits (CD) -> 4x4
  // 5 vars: 2 row bits (AB), 2 col bits (CD) -> 4x4 (Two grids)
  
  if (vars === 2) return { rowBits: 1, colBits: 1 };
  if (vars === 3) return { rowBits: 1, colBits: 2 };
  if (vars === 4) return { rowBits: 2, colBits: 2 };
  if (vars === 5) return { rowBits: 2, colBits: 2 }; // Handled specially as 2 maps
  return { rowBits: 2, colBits: 2 };
}

// Calculate the minterm index from grid coordinates
export function getMintermIndex(
  rowGray: string, 
  colGray: string, 
  mapIndex: number = 0 // For 5 vars, mapIndex 0 = E' (0), mapIndex 1 = E (1)
): number {
  // Combine bits: Row + Col (Standard standard convention varies, but usually inputs are A,B,C,D...)
  // We assume: 
  // 2 vars (A, B): Row=A, Col=B
  // 3 vars (A, B, C): Row=A, Col=BC
  // 4 vars (A, B, C, D): Row=AB, Col=CD
  // 5 vars (A, B, C, D, E): Row=AB, Col=CD, Map=E
  
  return parseInt(
    (arguments.length > 2 && mapIndex !== undefined ? (mapIndex === 1 ? "1" : "0") : "") + rowGray + colGray, 
    2
  );
}

// Convert minterm index back to coordinates (reverse lookup)
// Useful for checking group membership
export function getCoordinates(minterm: number, vars: number) {
  const bin = minterm.toString(2).padStart(vars, "0");
  
  if (vars === 2) { // A, B
    return { rowBin: bin[0], colBin: bin[1], map: 0 };
  }
  if (vars === 3) { // A, BC
    return { rowBin: bin[0], colBin: bin.slice(1), map: 0 };
  }
  if (vars === 4) { // AB, CD
    return { rowBin: bin.slice(0, 2), colBin: bin.slice(2), map: 0 };
  }
  if (vars === 5) { // A, BC, DE
    return { map: parseInt(bin[0]), rowBin: bin.slice(1, 3), colBin: bin.slice(3) };
  }
  return { rowBin: "0", colBin: "0", map: 0 };
}

export function getVariableLabels(vars: number) {
  // UI convention (fixed):
  // - Columns (top): x_0, x_1
  // - Rows (left):   x_2, x_3
  // - Map selector (5 vars): x_4
  // For 2/3 variables we keep the convention as much as possible.

  if (vars === 2) return { rows: "x_1", cols: "x_0", map: "" };
  if (vars === 3) return { rows: "x_2", cols: "x_0, x_1", map: "" };
  if (vars === 4) return { rows: "x_2, x_3", cols: "x_0, x_1", map: "" };
  if (vars === 5) return { rows: "x_2, x_3", cols: "x_0, x_1", map: "x_4" };
  return { rows: "", cols: "", map: "" };
}

// Colors for grouping
export const GROUP_COLORS = [
  { border: "border-red-500", bg: "bg-red-500/20", text: "text-red-700" },
  { border: "border-blue-500", bg: "bg-blue-500/20", text: "text-blue-700" },
  { border: "border-green-500", bg: "bg-green-500/20", text: "text-green-700" },
  { border: "border-purple-500", bg: "bg-purple-500/20", text: "text-purple-700" },
  { border: "border-orange-500", bg: "bg-orange-500/20", text: "text-orange-700" },
  { border: "border-pink-500", bg: "bg-pink-500/20", text: "text-pink-700" },
  { border: "border-cyan-500", bg: "bg-cyan-500/20", text: "text-cyan-700" },
  { border: "border-yellow-500", bg: "bg-yellow-500/20", text: "text-yellow-700" },
];
