import { motion } from "framer-motion";
import { KmapCell } from "./KmapCell";
import { generateGrayCodes, getGridDimensions, getMintermIndex, getVariableLabels } from "../lib/kmap-utils";
import { cn } from "../lib/utils";
import { useEffect } from "react";

function MJ({ tex, className }: { tex: string; className?: string }) {
  useEffect(() => {
    // MathJax is loaded globally (e.g., via index.html). If not present, this is a no-op.
    // @ts-expect-error - MathJax is a global injected by a script tag
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

export function KmapGrid({ variables, minterms, dontCares, groups, onCellToggle }: KmapGridProps) {
  const { rowBits, colBits } = getGridDimensions(variables);
  const rowCodes = generateGrayCodes(rowBits);
  const colCodes = generateGrayCodes(colBits);
  const { rows: rowLabel, cols: colLabel, map: mapLabel } = getVariableLabels(variables);

  const renderGrid = (mapIndex: number = 0) => (
    <div className="relative inline-block bg-card rounded-xl shadow-lg border border-border p-4">
      {/* Map Label (A=0 / A=1 for 5 vars) */}
      {variables === 5 && (
        <div className="absolute -top-8 left-0 right-0 text-center font-bold text-lg text-foreground/80">
          <MJ tex={`${mapLabel} = ${mapIndex}`} />
        </div>
      )}

      <div className="grid" style={{ 
        gridTemplateColumns: `auto repeat(${colCodes.length}, min-content)` 
      }}>
        {/* Top-Left Corner Label */}
        <div className="relative border-r border-b border-border/50 min-w-[3rem] min-h-[3rem] bg-muted/10">
          {/* Diagonal: bottom-left → top-right */}
          <div
            className="absolute left-1/2 top-1/2 h-px w-[140%] bg-border/60"
            style={{ transform: "translate(-50%, -50%) rotate(45deg)" }}
          />

          {/* Column variables (upper diagonal half) */}
          <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%) rotate(45deg) translateX(-10px) translateY(-12px)" }}>
            <div className="text-[14px] font-bold text-muted-foreground tracking-tight whitespace-nowrap">
              <MJ tex={colLabel} />
            </div>
          </div>

          {/* Row variables (lower diagonal half) */}
          <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%) rotate(45deg) translateX(-10px) translateY(5px)" }}>
            <div className="text-[14px] font-bold text-muted-foreground tracking-tight whitespace-nowrap">
              <MJ tex={rowLabel} />
            </div>
          </div>
        </div>

        {/* Column Headers */}
        {colCodes.map((code) => (
          <div key={`col-${code}`} className="flex items-center justify-center font-mono text-sm text-muted-foreground font-medium py-2 border-b border-border/50 bg-muted/20">
            {code}
          </div>
        ))} 

        {/* Rows */}
        {rowCodes.map((rowCode) => (
          <>
            {/* Row Header */}
            <div key={`row-${rowCode}`} className="flex items-center justify-center font-mono text-sm text-muted-foreground font-medium px-3 border-r border-border/50 bg-muted/20">
              {rowCode}
            </div>

            {/* Cells */}
            {colCodes.map((colCode) => {
              const mintermIndex = getMintermIndex(rowCode, colCode, mapIndex);
              
              // Determine value
              let value: 0 | 1 | 2 = 0;
              if (minterms.includes(mintermIndex)) value = 1;
              if (dontCares.includes(mintermIndex)) value = 2;

              return (
                <KmapCell
                  key={mintermIndex}
                  mintermIndex={mintermIndex}
                  value={value}
                  onClick={() => onCellToggle(mintermIndex)}
                  groups={groups}
                  className="border-r border-b border-border/20"
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col xl:flex-row items-center justify-center gap-12 p-4",
      variables === 5 ? "mt-8" : ""
    )}>
      {variables === 5 ? (
        <>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            {renderGrid(0)}
          </motion.div>
          
          <div className="hidden xl:flex h-64 w-px bg-border/50" /> {/* Divider */}

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
