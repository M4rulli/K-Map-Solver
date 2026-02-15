import { motion } from "framer-motion";
import { cn } from "../lib/utils";

type CellValue = 0 | 1 | 2; // 2 represents Don't Care (-)

interface KmapCellProps {
  value: CellValue;
  mintermIndex: number;
  onClick: () => void;
  className?: string;
}

export function KmapCell({ value, mintermIndex, onClick, className }: KmapCellProps) {
  const displayValue = value === 2 ? "X" : value;

  return (
    <motion.div
      whileHover={{ scale: 0.95 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center h-16 w-16 md:h-20 md:w-20 text-2xl font-mono font-bold cursor-pointer transition-all duration-200 select-none",
        "border border-border/50",
        value === 1 && "text-primary bg-primary/5",
        value === 0 && "text-muted-foreground/40",
        value === 2 && "text-orange-500 bg-orange-500/5",
        className
      )}
    >
      <span className="relative z-20">{displayValue}</span>
      
      <span className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/30 font-sans">
        {mintermIndex}
      </span>
    </motion.div>
  );
}
