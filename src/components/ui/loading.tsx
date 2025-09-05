import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function Loading({ size = "md", className, text }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <Loading size="lg" text="Carregando..." />
    </div>
  );
}

export function LoadingOverlay({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return <>{children}</>;
  
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
        <Loading size="lg" text="Carregando..." />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 border rounded-lg">
      <div className="space-y-3">
        <div className="skeleton h-4 w-3/4 rounded"></div>
        <div className="skeleton h-4 w-1/2 rounded"></div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-full rounded"></div>
          <div className="skeleton h-3 w-5/6 rounded"></div>
        </div>
      </div>
    </div>
  );
}