import { useEffect, useMemo, useState } from "react";
import { buildCircuitDefinition, type CircuitDefinition, type GateType } from "../lib/logic-circuit";

type Lang = "it" | "en";

type Props = {
  expression: string;
  variables: number;
  isSop: boolean;
  lang: Lang;
};

type GateLayout = {
  id: string;
  type: GateType;
  x: number;
  y: number;
  width: number;
  height: number;
  inputYs: number[];
  outputY: number;
};

type ClauseLayout = {
  id: string;
  y: number;
  gate: GateLayout | null;
};

const STROKE = "hsl(var(--foreground))";
const WIRE = "hsl(var(--primary))";
const BG = "hsl(var(--background))";
const GATE_FILL = "hsl(var(--muted))";
const BUBBLE_R = 5;
const OR_WIRE_GAP = 6;

function MathText({ tex }: { tex: string }) {
  useEffect(() => {
    if (window.MathJax) {
      window.MathJax.typesetPromise?.();
    }
  }, [tex]);

  return <span className="math-jax">{"\\(" + tex + "\\)"}</span>;
}

function andPath(width: number, height: number): string {
  const r = height / 2;
  const body = width - r;
  return [
    "M 0 0",
    `L ${body} 0`,
    `A ${r} ${r} 0 0 1 ${body} ${height}`,
    `L 0 ${height}`,
    "Z",
  ].join(" ");
}

function orPath(width: number, height: number): string {
  const m = height / 2;
  const right = width;
  return [
    `M ${width * 0.08} 0`,
    `C ${width * 0.43} 0 ${width * 0.68} ${height * 0.16} ${right} ${m}`,
    `C ${width * 0.68} ${height * 0.84} ${width * 0.43} ${height} ${width * 0.08} ${height}`,
    `C ${width * 0.26} ${height * 0.74} ${width * 0.26} ${height * 0.26} ${width * 0.08} 0`,
    "Z",
  ].join(" ");
}

function gateHeight(inputs: number, isMobile: boolean): number {
  return Math.max(isMobile ? 50 : 62, inputs * (isMobile ? 22 : 28));
}

function buildGate(
  id: string,
  type: GateType,
  x: number,
  centerY: number,
  inputs: number,
  isMobile: boolean
): GateLayout {
  const width = type === "OR" ? (isMobile ? 72 : 110) : (isMobile ? 64 : 98);
  const height = gateHeight(inputs, isMobile);
  const y = centerY - height / 2;
  const inputCount = Math.max(inputs, 2);

  const inputYs = Array.from({ length: inputCount }, (_, idx) => {
    const step = height / (inputCount + 1);
    return y + step * (idx + 1);
  });

  return {
    id,
    type,
    x,
    y,
    width,
    height,
    inputYs,
    outputY: y + height / 2,
  };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function gateInputXAtY(gate: GateLayout, y: number): number {
  if (gate.type !== "OR") return gate.x;

  const t = clamp01((y - gate.y) / gate.height);
  const parabola = 1 - Math.pow((t - 0.5) / 0.5, 2);
  const normalized = 0.08 + 0.18 * parabola; // Matches OR left contour: ~8% at ends, ~26% at middle.
  return gate.x + gate.width * normalized - OR_WIRE_GAP;
}

function gateOutputX(gate: GateLayout): number {
  return gate.x + gate.width;
}

function GateShape({ gate }: { gate: GateLayout }) {
  const bodyPath = gate.type === "AND" ? andPath(gate.width, gate.height) : orPath(gate.width, gate.height);

  return (
    <g>
      <path
        d={bodyPath}
        fill={GATE_FILL}
        stroke={STROKE}
        strokeWidth={2.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={gate.width * 0.48}
        y={gate.height * 0.56}
        textAnchor="middle"
        fontSize={Math.max(10, Math.round(gate.height * 0.2))}
        fill={STROKE}
        className="font-semibold"
      >
        {gate.type}
      </text>
    </g>
  );
}

function bubbleCenterX(gate: GateLayout, y: number): number {
  return gateInputXAtY(gate, y) - BUBBLE_R - 1;
}

function buildLayout(definition: CircuitDefinition, variables: number, isMobile: boolean) {
  const busSpacing = isMobile ? 30 : 52;
  const maxClauseGateHeight = definition.clauses.reduce((maxHeight, clause) => {
    if (clause.literals.length <= 1) return maxHeight;
    return Math.max(maxHeight, gateHeight(clause.literals.length, isMobile));
  }, isMobile ? 44 : 62);
  const rowSpacing = Math.max(isMobile ? 62 : 92, maxClauseGateHeight + (isMobile ? 14 : 20));
  const leftMargin = isMobile ? 18 : 44;
  const topMargin = isMobile ? 66 : 92;
  const busStartX = leftMargin;
  const busYTop = isMobile ? 34 : 46;

  const clauseYs = definition.clauses.map((_, idx) => topMargin + idx * rowSpacing);
  const minClauseY = clauseYs[0] ?? 120;
  const maxClauseY = clauseYs[clauseYs.length - 1] ?? 120;
  const busYBottom = Math.max(maxClauseY + (isMobile ? 48 : 80), isMobile ? 164 : 240);

  const clauseGateX = busStartX + Math.max(variables - 1, 0) * busSpacing + (isMobile ? 60 : 130);
  const outputGateX = clauseGateX + (isMobile ? 128 : 220);
  const outputX = outputGateX + (isMobile ? 104 : 130);

  const clauseGateType: GateType = definition.mode === "SOP" ? "AND" : "OR";
  const outputGateType: GateType = definition.mode === "SOP" ? "OR" : "AND";

  const clauseLayouts: ClauseLayout[] = definition.clauses.map((clause, idx) => {
    const y = clauseYs[idx] ?? minClauseY;
    const gate = clause.literals.length > 1
      ? buildGate(`clause-${idx}`, clauseGateType, clauseGateX, y, clause.literals.length, isMobile)
      : null;

    return { id: `clause-${idx}`, y, gate };
  });

  const clauseOutputs = clauseLayouts.map((clause) => clause.gate?.outputY ?? clause.y);
  const outputGate = clauseOutputs.length > 1
    ? buildGate("output", outputGateType, outputGateX, (minClauseY + maxClauseY) / 2, clauseOutputs.length, isMobile)
    : null;

  const width = outputX + (isMobile ? 44 : 82);
  const height = Math.max(
    busYBottom + (isMobile ? 28 : 40),
    (outputGate?.y ?? 0) + (outputGate?.height ?? 0) + (isMobile ? 24 : 30)
  );

  return {
    busStartX,
    busYTop,
    busYBottom,
    busSpacing,
    clauseLayouts,
    outputGate,
    outputX,
    width,
    height,
  };
}

function drawWire(points: Array<{ x: number; y: number }>) {
  const wire = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <polyline
      points={wire}
      fill="none"
      stroke={WIRE}
      strokeWidth={2.3}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

export function LogicCircuitDiagram({ expression, variables, isSop, lang }: Props) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setIsMobile(window.innerWidth <= 820);
    onChange();
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  const definition = useMemo(() => buildCircuitDefinition(expression, isSop), [expression, isSop]);
  const layout = useMemo(() => buildLayout(definition, variables, isMobile), [definition, variables, isMobile]);
  const desktopScale = 0.82;
  const renderWidth = isMobile ? layout.width : Math.round(layout.width * desktopScale);
  const outputInputYByClause = useMemo(() => {
    if (!layout.outputGate) return new Map<number, number>();

    const targets = [...layout.outputGate.inputYs].sort((a, b) => a - b);
    const sources = layout.clauseLayouts
      .map((clauseLayout, idx) => ({
        idx,
        sourceY: clauseLayout.gate ? clauseLayout.gate.outputY : clauseLayout.y,
      }))
      .sort((a, b) => a.sourceY - b.sourceY);

    const m = new Map<number, number>();
    sources.forEach((s, pos) => {
      const y = targets[pos] ?? targets[targets.length - 1];
      m.set(s.idx, y);
    });

    return m;
  }, [layout]);
  const secondLayerRoutes = useMemo(() => {
    if (!layout.outputGate) return [];

    const targetPrePad = isMobile ? 10 : 14;
    const rawRoutes = layout.clauseLayouts
      .map((clauseLayout, idx) => {
        if (!clauseLayout.gate) return null;
        const sourceX = gateOutputX(clauseLayout.gate);
        const sourceY = clauseLayout.gate.outputY;
        const targetY = outputInputYByClause.get(idx) ?? layout.outputGate!.inputYs[idx];
        const targetX = gateInputXAtY(layout.outputGate!, targetY);
        return { id: clauseLayout.id, sourceX, sourceY, targetY, targetX, idx };
      })
      .filter((v): v is { id: string; sourceX: number; sourceY: number; targetY: number; targetX: number; idx: number } => v !== null);

    if (rawRoutes.length === 0) return [];
    const orderedBySource = [...rawRoutes].sort((a, b) => a.sourceY - b.sourceY);

    // Uniform second-layer lanes: keep each signal in its own vertical channel.
    const maxSourceX = Math.max(...rawRoutes.map((r) => r.sourceX));
    const minTargetX = Math.min(...orderedBySource.map((r) => r.targetX));
    const laneStartX = maxSourceX + (isMobile ? 16 : 24);
    const laneEndX = minTargetX - targetPrePad - (isMobile ? 10 : 14);
    const usableWidth = Math.max(0, laneEndX - laneStartX);
    const laneStep = orderedBySource.length > 1 ? usableWidth / (orderedBySource.length - 1) : 0;

    return orderedBySource.map((route, position) => {
      // Inverted lane assignment prevents upper wires from crossing lower trunks near the final gate.
      const laneX = laneStartX + laneStep * (orderedBySource.length - 1 - position);
      const targetPreX = route.targetX - targetPrePad;
      return { ...route, laneX, targetPreX };
    });
  }, [layout, isMobile, outputInputYByClause]);

  if (definition.constant) {
    return (
      <div className="mt-6 border rounded-xl bg-background/70 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
          {lang === "it" ? "Circuito logico equivalente" : "Equivalent logic circuit"}
        </p>
        <div className="font-mono text-sm text-foreground">
          <MathText tex={`f(\\mathbf{x}) = ${definition.constant}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border rounded-xl bg-background/70 p-4 overflow-x-auto">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
        {lang === "it" ? "Circuito logico equivalente" : "Equivalent logic circuit"}
      </p>

      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block h-auto mx-auto"
        style={{ width: `${renderWidth}px` }}
      >
        {Array.from({ length: variables }, (_, idx) => {
          const x = layout.busStartX + idx * layout.busSpacing;
          return (
            <g key={`bus-${idx}`}>
              <foreignObject
                x={x - (isMobile ? 20 : 30)}
                y={isMobile ? 10 : 18}
                width={isMobile ? 40 : 60}
                height={isMobile ? 24 : 30}
              >
                <div className={isMobile ? "text-[13px] text-center leading-none font-semibold" : "text-[17px] text-center leading-none font-semibold"}>
                  <MathText tex={`x_{${idx}}`} />
                </div>
              </foreignObject>
              <line
                x1={x}
                y1={layout.busYTop}
                x2={x}
                y2={layout.busYBottom}
                stroke={WIRE}
                strokeWidth={isMobile ? 2.4 : 2.8}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {definition.clauses.map((clause, clauseIndex) => {
          const clauseLayout = layout.clauseLayouts[clauseIndex];
          if (!clauseLayout) return null;

          return (
            <g key={clauseLayout.id}>
              {clauseLayout.gate && (
                <g transform={`translate(${clauseLayout.gate.x}, ${clauseLayout.gate.y})`}>
                  <GateShape gate={{ ...clauseLayout.gate, x: 0, y: 0 }} />
                </g>
              )}

              {clause.literals.map((literal, literalIndex) => {
                const busX = layout.busStartX + literal.variable * layout.busSpacing;
                const directOutputY = !clauseLayout.gate && layout.outputGate
                  ? (outputInputYByClause.get(clauseIndex) ?? layout.outputGate.inputYs[clauseIndex])
                  : null;
                const targetY = clauseLayout.gate
                  ? clauseLayout.gate.inputYs[literalIndex]
                  : (directOutputY ?? clauseLayout.y);
                const receiverGate = clauseLayout.gate ?? layout.outputGate ?? null;
                const targetX = receiverGate ? gateInputXAtY(receiverGate, targetY) : layout.outputX - 40;
                const tapY = layout.busYTop + 12 + literal.variable * 4;
                const branchX = targetX - (literal.negated ? (isMobile ? 34 : 54) : (isMobile ? 20 : 36));
                const hasIntermediateGates = layout.clauseLayouts.some((c) => c.gate !== null);
                const isDirectToFinalGate = !clauseLayout.gate && !!layout.outputGate && hasIntermediateGates;

                const wireEndX = literal.negated && receiverGate ? bubbleCenterX(receiverGate, targetY) - BUBBLE_R : targetX;
                const clauseGateYs = layout.clauseLayouts
                  .map((c) => c.gate?.y)
                  .filter((y): y is number => y !== undefined);
                const topBypassY = clauseGateYs.length > 0
                  ? Math.max(layout.busYTop + 8, Math.min(...clauseGateYs) - (isMobile ? 14 : 20))
                  : layout.busYTop + 8;
                const preGateX = targetX - (isMobile ? 18 : 26);

                return (
                  <g key={`${clauseLayout.id}-${literal.variable}-${literalIndex}`}>
                    {isDirectToFinalGate
                      ? drawWire([
                        { x: busX, y: tapY },
                        { x: busX, y: topBypassY },
                        { x: preGateX, y: topBypassY },
                        { x: preGateX, y: targetY },
                        { x: wireEndX, y: targetY },
                      ])
                      : drawWire([
                        { x: busX, y: tapY },
                        { x: busX, y: targetY },
                        { x: branchX, y: targetY },
                        { x: wireEndX, y: targetY },
                      ])}

                    {literal.negated && receiverGate && (
                      <g>
                        <circle
                          cx={bubbleCenterX(receiverGate, targetY)}
                          cy={targetY}
                          r={BUBBLE_R}
                          fill={BG}
                          stroke={STROKE}
                          strokeWidth={2}
                        />
                        {drawWire([
                          { x: bubbleCenterX(receiverGate, targetY) + BUBBLE_R, y: targetY },
                          { x: targetX, y: targetY },
                        ])}
                      </g>
                    )}

                    {!receiverGate && (
                      <text x={targetX + 8} y={targetY + 4} fontSize={11} fill={STROKE}>
                        {literal.negated ? `x${literal.variable}'` : `x${literal.variable}`}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {layout.outputGate && (
          <g>
            <g transform={`translate(${layout.outputGate.x}, ${layout.outputGate.y})`}>
              <GateShape gate={{ ...layout.outputGate, x: 0, y: 0 }} />
            </g>

            {secondLayerRoutes.map((route) => {
              return (
                <g key={`out-wire-${route.id}`}>
                  {drawWire([
                    { x: route.sourceX, y: route.sourceY },
                    { x: route.laneX, y: route.sourceY },
                    { x: route.laneX, y: route.targetY },
                    { x: route.targetPreX, y: route.targetY },
                    { x: route.targetX, y: route.targetY },
                  ])}
                </g>
              );
            })}

            {drawWire([
              { x: gateOutputX(layout.outputGate) + (isMobile ? 2 : 0), y: layout.outputGate.outputY },
              { x: layout.outputX, y: layout.outputGate.outputY },
            ])}

            <foreignObject
              x={layout.outputX + (isMobile ? 6 : 8)}
              y={layout.outputGate.outputY - (isMobile ? 10 : 12)}
              width={isMobile ? 98 : 86}
              height={isMobile ? 28 : 34}
            >
              <div className={isMobile ? "text-[15px] leading-none font-semibold" : "text-[20px] leading-none font-semibold"}>
                <MathText tex={"f(\\mathbf{x})"} />
              </div>
            </foreignObject>
          </g>
        )}

        {!layout.outputGate && layout.clauseLayouts[0] && (() => {
          const onlyClause = layout.clauseLayouts[0];
          const sourceX = onlyClause.gate
            ? gateOutputX(onlyClause.gate) + (isMobile ? 2 : 0)
            : layout.busStartX + layout.busSpacing * Math.min(variables - 1, 1) + 220;
          const sourceY = onlyClause.gate ? onlyClause.gate.outputY : onlyClause.y;
          const singleOutputX = isMobile ? sourceX + 30 : layout.outputX;

          return (
            <g>
              {drawWire([
                { x: sourceX, y: sourceY },
                { x: singleOutputX, y: sourceY },
              ])}
              <foreignObject
                x={singleOutputX + (isMobile ? 6 : 8)}
                y={sourceY - (isMobile ? 10 : 12)}
                width={isMobile ? 98 : 86}
                height={isMobile ? 28 : 34}
              >
                <div className={isMobile ? "text-[15px] leading-none font-semibold" : "text-[20px] leading-none font-semibold"}>
                  <MathText tex={"f(\\mathbf{x})"} />
                </div>
              </foreignObject>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
