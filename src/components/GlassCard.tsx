import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}

export function GlassCard({ children, className, hover = false, style }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/30 bg-card backdrop-blur-glass shadow-glass transition-all duration-300",
        hover && "hover:shadow-glow hover:border-primary/50",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
