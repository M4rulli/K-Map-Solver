export type GateType = "AND" | "OR" | "NOT";

export type Literal = {
  variable: number;
  negated: boolean;
};

export type Clause = {
  literals: Literal[];
};

export type CircuitDefinition = {
  mode: "SOP" | "POS";
  clauses: Clause[];
  constant: "0" | "1" | null;
};

function parseLiteral(token: string): Literal | null {
  const match = token.trim().match(/^x_(\d+)('?)/);
  if (!match) return null;

  return {
    variable: Number(match[1]),
    negated: match[2] === "'",
  };
}

function parseSopExpression(expression: string): Clause[] {
  return expression
    .split(" + ")
    .map((term) => {
      const tokens = term.match(/x_\d+'?/g) ?? [];
      const literals = tokens
        .map(parseLiteral)
        .filter((item): item is Literal => item !== null);

      return { literals };
    })
    .filter((clause) => clause.literals.length > 0);
}

function parsePosExpression(expression: string): Clause[] {
  const factors = Array.from(expression.matchAll(/\(([^()]*)\)/g));

  return factors
    .map((factor) => {
      const raw = factor[1]
        .split("+")
        .map((v) => v.trim())
        .filter(Boolean);

      const literals = raw
        .map(parseLiteral)
        .filter((item): item is Literal => item !== null);

      return { literals };
    })
    .filter((clause) => clause.literals.length > 0);
}

export function buildCircuitDefinition(expression: string, isSop: boolean): CircuitDefinition {
  const normalized = expression.trim();

  if (normalized === "0" || normalized === "1") {
    return {
      mode: isSop ? "SOP" : "POS",
      clauses: [],
      constant: normalized,
    };
  }

  const clauses = isSop ? parseSopExpression(normalized) : parsePosExpression(normalized);

  return {
    mode: isSop ? "SOP" : "POS",
    clauses,
    constant: null,
  };
}
