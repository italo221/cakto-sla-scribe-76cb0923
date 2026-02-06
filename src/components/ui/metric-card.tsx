import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, subtitle, icon: Icon, onClick, className, children }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          "min-h-[160px] p-6 rounded-xl",
          "bg-gradient-to-br from-neutral-950 to-neutral-900",
          "border border-neutral-800/50",
          "hover:border-neutral-700 hover:shadow-lg shadow-sm shadow-black/20",
          "transition-all duration-300",
          onClick && "cursor-pointer",
          className
        )}
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div className="flex flex-col h-full justify-between">
          {/* Top: label + icon */}
          <div className="flex items-start justify-between mb-4">
            <span className="text-sm font-medium text-neutral-400">{label}</span>
            {Icon && (
              <div className="h-10 w-10 p-2.5 bg-neutral-900/50 rounded-lg flex items-center justify-center">
                <Icon className="h-5 w-5 text-neutral-600" />
              </div>
            )}
          </div>

          {/* Middle: main value */}
          <div className="mt-auto">
            <h3 className="text-5xl font-semibold text-white tracking-tight">
              {typeof value === "number" ? value.toLocaleString() : value}
            </h3>
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-2">{subtitle}</p>
            )}
            {children}
          </div>
        </div>
      </div>
    );
  }
);

MetricCard.displayName = "MetricCard";

export { MetricCard };
export type { MetricCardProps };
