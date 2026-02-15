import { Fragment, useEffect } from "react";
import { motion } from "framer-motion";
import { KmapCell } from "./KmapCell";
import { generateGrayCodes, getGridDimensions, getMintermIndex, getVariableLabels } from "../lib/kmap-utils";
import { cn } from "../lib/utils";

function MJ({ tex, className }: { tex: string; className?: string }) {
  useEffect(() => {
    window.MathJax?.typesetPromise?.();
  }, [tex]);

  return <span className={className}>{`\\(${tex}\\)`}</span>;
}

interface KmapGridProps {
  variables: number;
  minterms: number[];
  dontCares: number[];
  groups?: number[][];
  onCellToggle: (index: number) => void;
}

type GroupRect = {
  groupId: number;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  tileId: string;
};

const GROUP_OVERLAY_COLORS = [
  { stroke: "#ef4444", fill: "rgba(239,68,68,0.16)" },
  { stroke: "#3b82f6", fill: "rgba(59,130,246,0.16)" },
  { stroke: "#22c55e", fill: "rgba(34,197,94,0.16)" },
  { stroke: "#f59e0b", fill: "rgba(245,158,11,0.16)" },
  { stroke: "#ec4899", fill: "rgba(236,72,153,0.16)" },
  { stroke: "#06b6d4", fill: "rgba(6,182,212,0.16)" },
  { stroke: "#a855f7", fill: "rgba(168,85,247,0.16)" },
  { stroke: "#84cc16", fill: "rgba(132,204,22,0.16)" },
];

function uniqueSorted(xs: number[]): number[] {
  return Array.from(new Set(xs)).sort((a, b) => a - b);
}

function isInCyclicInterval(value: number, start: number, len: number, size: number): boolean {
  return ((value - start + size) % size) < len;
}

function minimalCyclicInterval(indices: number[], size: number): { start: number; len: number } {
  if (indices.length === 0) return { start: 0, len: 0 };

  const uniq = uniqueSorted(indices);
  if (uniq.length === size) return { start: 0, len: size };

  let bestStart = 0;
  let bestLen = size + 1;

  for (let len = 1; len <= size; len++) {
    for (let start = 0; start < size; start++) {
      const ok = uniq.every((v) => isInCyclicInterval(v, start, len, size));
      if (ok) {
        if (len < bestLen) {
          bestLen = len;
          bestStart = start;
        }
        break;
      }
    }
    if (bestLen !== size + 1) break;
  }

  return { start: bestStart, len: Math.min(bestLen, size) };
}

function matrixColsClass(colCount: number): string {
  return colCount === 2 ? "grid-cols-2" : "grid-cols-4";
}

export function KmapGrid({ variables, minterms, dontCares, groups, onCellToggle }: KmapGridProps) {
  const { rowBits, colBits } = getGridDimensions(variables);
  const rowCodes = generateGrayCodes(rowBits);
  const colCodes = generateGrayCodes(colBits);
  const { rows: rowLabel, cols: colLabel, map: mapLabel } = getVariableLabels(variables);

  const buildGroupOverlays = (mapIndex: number): GroupRect[] => {
    if (!groups || groups.length === 0) return [];

    const coordByMinterm = new Map<number, { r: number; c: number }>();

    for (let r = 0; r < rowCodes.length; r++) {
      for (let c = 0; c < colCodes.length; c++) {
        const m = getMintermIndex(rowCodes[r], colCodes[c], mapIndex);
        coordByMinterm.set(m, { r, c });
      }
    }

    const rects: GroupRect[] = [];

    groups.forEach((group, groupId) => {
      const coords = group
        .map((m) => coordByMinterm.get(m))
        .filter((v): v is { r: number; c: number } => !!v);

      if (coords.length === 0) return;

      const rows = coords.map((p) => p.r);
      const cols = coords.map((p) => p.c);

      const rowInterval = minimalCyclicInterval(rows, rowCodes.length);
      const colInterval = minimalCyclicInterval(cols, colCodes.length);

      const rowWraps = rowInterval.start + rowInterval.len > rowCodes.length;
      const colWraps = colInterval.start + colInterval.len > colCodes.length;

      const yOffsets = rowWraps ? [0, -rowCodes.length] : [0];
      const xOffsets = colWraps ? [0, -colCodes.length] : [0];

      yOffsets.forEach((dy) => {
        xOffsets.forEach((dx) => {
          rects.push({
            groupId,
            x: colInterval.start + dx,
            y: rowInterval.start + dy,
            w: colInterval.len,
            h: rowInterval.len,
            area: colInterval.len * rowInterval.len,
            tileId: `${groupId}:${dx}:${dy}`,
          });
        });
      });
    });

    return rects.sort((a, b) => b.area - a.area || a.groupId - b.groupId);
  };

  const renderGrid = (mapIndex: number = 0) => {
    const groupRects = buildGroupOverlays(mapIndex);

    return (
      <div className="relative inline-block bg-card rounded-xl shadow-lg border border-border p-4">
        {variables === 5 && (
          <div className="absolute -top-8 left-0 right-0 text-center font-bold text-lg text-foreground/80">
            <MJ tex={`${mapLabel} = ${mapIndex}`} />
          </div>
        )}

        <div className="flex">
          <div className="relative border-r border-b border-border/50 h-16 w-16 md:h-20 md:w-20 bg-muted/10 shrink-0">
            <div
              className="absolute left-1/2 top-1/2 h-px w-[140%] bg-border/60"
              style={{ transform: "translate(-50%, -50%) rotate(45deg)" }}
            />

            <div
              className="absolute left-1/2 top-1/2"
              style={{ transform: "translate(-50%, -50%) rotate(45deg) translateX(-10px) translateY(-12px)" }}
            >
              <div className="text-[14px] font-bold text-muted-foreground tracking-tight whitespace-nowrap">
                <MJ tex={colLabel} />
              </div>
            </div>

            <div
              className="absolute left-1/2 top-1/2"
              style={{ transform: "translate(-50%, -50%) rotate(45deg) translateX(-10px) translateY(5px)" }}
            >
              <div className="text-[14px] font-bold text-muted-foreground tracking-tight whitespace-nowrap">
                <MJ tex={rowLabel} />
              </div>
            </div>
          </div>

          <div className={cn("grid", matrixColsClass(colCodes.length))}>
            {colCodes.map((code) => (
              <div
                key={`col-${mapIndex}-${code}`}
                className="flex items-center justify-center h-16 w-16 md:h-20 md:w-20 font-mono text-sm text-muted-foreground font-medium border-b border-border/50 bg-muted/20"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex">
          <div className="flex flex-col shrink-0">
            {rowCodes.map((rowCode) => (
              <div
                key={`row-${mapIndex}-${rowCode}`}
                className="flex items-center justify-center h-16 w-16 md:h-20 md:w-20 font-mono text-sm text-muted-foreground font-medium border-r border-border/50 bg-muted/20"
              >
                {rowCode}
              </div>
            ))}
          </div>

          <div className="relative">
            <div className={cn("grid", matrixColsClass(colCodes.length))}>
              {rowCodes.map((rowCode) => (
                <Fragment key={`row-wrap-${mapIndex}-${rowCode}`}>
                  {colCodes.map((colCode) => {
                    const mintermIndex = getMintermIndex(rowCode, colCode, mapIndex);

                    let value: 0 | 1 | 2 = 0;
                    if (minterms.includes(mintermIndex)) value = 1;
                    if (dontCares.includes(mintermIndex)) value = 2;

                    return (
                      <KmapCell
                        key={mintermIndex}
                        mintermIndex={mintermIndex}
                        value={value}
                        onClick={() => onCellToggle(mintermIndex)}
                        className="border-r border-b border-border/20"
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>

            {groupRects.length > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                viewBox={`0 0 ${colCodes.length} ${rowCodes.length}`}
                preserveAspectRatio="none"
              >
                {groupRects.map((rect, idx) => {
                  const color = GROUP_OVERLAY_COLORS[rect.groupId % GROUP_OVERLAY_COLORS.length];
                  const inset = 0.06 + (rect.groupId % 3) * 0.035;
                  const x = rect.x + inset;
                  const y = rect.y + inset;
                  const w = Math.max(0.12, rect.w - inset * 2);
                  const h = Math.max(0.12, rect.h - inset * 2);

                  return (
                    <rect
                      key={`overlay-${mapIndex}-${rect.tileId}-${idx}`}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={0.22}
                      fill={color.fill}
                      stroke={color.stroke}
                      strokeWidth={0.045}
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col xl:flex-row items-center justify-center gap-12 p-4",
        variables === 5 ? "mt-8" : ""
      )}
    >
      {variables === 5 ? (
        <>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            {renderGrid(0)}
          </motion.div>

          <div className="hidden xl:flex h-64 w-px bg-border/50" />

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {renderGrid(1)}
          </motion.div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          {renderGrid(0)}
        </motion.div>
      )}
    </div>
  );
}
