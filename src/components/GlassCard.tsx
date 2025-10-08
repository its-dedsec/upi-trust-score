import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-card/50 backdrop-blur-glass shadow-glass transition-all duration-300",
        hover && "hover:shadow-glow hover:border-primary/30",
        className
      )}
    >
      {children}
    </div>
  );
}
