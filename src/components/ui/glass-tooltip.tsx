import { TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

interface GlassTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  className?: string;
}

export const GlassTooltip = ({ active, payload, label, className }: GlassTooltipProps) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      className={cn(
        // Glass effect base styles
        "glass-tooltip backdrop-blur-md bg-white/10 dark:bg-black/20",
        "border border-white/20 dark:border-white/10",
        "rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20",
        "p-3 max-w-64",
        // Smooth animations
        "animate-in fade-in-0 zoom-in-95 duration-200",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {label && (
        <p className="text-sm font-medium text-foreground/90 mb-2 border-b border-white/10 pb-2">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/80 font-medium">
              {entry.name}:
            </span>
            <span className="text-foreground font-semibold">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom Chart cell with hover animations
export const AnimatedCell = ({ fill, payload, ...props }: any) => {
  return (
    <g
      className="transition-all duration-300 ease-out hover:scale-105 hover:drop-shadow-lg cursor-pointer"
      style={{
        transformOrigin: "center",
      }}
      {...props}
    >
      <path
        fill={fill}
        className="transition-all duration-300 ease-out"
        {...props}
      />
    </g>
  );
};