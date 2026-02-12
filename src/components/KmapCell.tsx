import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { useMemo } from "react";
import { GROUP_COLORS } from "../lib/kmap-utils";

type CellValue = 0 | 1 | 2; // 2 represents Don't Care (-)

interface KmapCellProps {
  value: CellValue;
  mintermIndex: number;
  onClick: () => void;
  groups?: number[][]; // Array of groups this cell belongs to (by index)
  className?: string;
  isHovered?: boolean;
}

export function KmapCell({ value, mintermIndex, onClick, groups = [], className }: KmapCellProps) {
  const displayValue = value === 2 ? "X" : value;
  
  // Find which groups encompass this cell
  const activeGroups = useMemo(() => {
    return groups.map((group, idx) => ({
      groupId: idx,
      contains: group.includes(mintermIndex),
      color: GROUP_COLORS[idx % GROUP_COLORS.length]
    })).filter(g => g.contains);
  }, [groups, mintermIndex]);

  // Determine borders based on group membership logic passed from parent? 
  // Actually, visual overlapping borders are tricky.
  // Instead, we will use an inset shadow or background blend for multiple groups.
  // But standard K-maps use rounded rectangles. 
  // Since we are implementing a grid, we'll use colored corners/borders to indicate membership.
  
  // A simpler approach for "Stunning" UI:
  // Use a generated background gradient if in multiple groups.
  
  const backgroundStyle = useMemo(() => {
    if (activeGroups.length === 0) return {};
    if (activeGroups.length === 1) return undefined; // Let Tailwind handle single class
    
    return {}; 
  }, [activeGroups]);

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
        activeGroups.length > 0 && "z-10", // Bring to front if grouped
        className
      )}
      style={backgroundStyle}
    >
      {/* Background for single group */}
      {activeGroups.length === 1 && (
        <div className={cn(
          "absolute inset-1 rounded-lg opacity-100 transition-colors",
          activeGroups[0].color.bg
        )} />
      )}
      
      {/* Visual indicators for multiple groups - dots at corners */}
      {activeGroups.length > 1 && (
        <div className="absolute inset-0 flex flex-wrap p-1 gap-0.5 justify-center content-center opacity-30">
           {activeGroups.map(g => (
             <div key={g.groupId} className={cn("w-full h-full absolute inset-0 opacity-20", g.color.bg)} />
           ))}
        </div>
      )}

      {/* Render the Group Borders - this would ideally be done by an SVG overlay in the parent, 
          but per-cell borders are a decent approximation if connected. */}
      {activeGroups.map((g, i) => (
         <div 
           key={g.groupId}
           className={cn(
             "absolute inset-0 border-2 rounded-lg pointer-events-none",
             g.color.border
           )}
           style={{ margin: `${i * 3}px` }} // Nest borders for multiple groups
         />
      ))}

      <span className="relative z-20">{displayValue}</span>
      
      <span className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/30 font-sans">
        {mintermIndex}
      </span>
    </motion.div>
  );
}