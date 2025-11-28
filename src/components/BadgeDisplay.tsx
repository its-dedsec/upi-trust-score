import { getBadgeConfig } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface BadgeDisplayProps {
  badgeLevel: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

export const BadgeDisplay = ({ 
  badgeLevel, 
  size = "md", 
  showName = true,
  className 
}: BadgeDisplayProps) => {
  const badge = getBadgeConfig(badgeLevel);
  const Icon = badge.icon;

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-5 w-5",
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-full bg-gradient-to-br p-2 shadow-lg",
        `bg-gradient-to-br ${badge.gradient}`,
        sizeClasses[size]
      )}>
        <Icon className={cn("text-background", iconSizes[size])} />
      </div>
      {showName && (
        <span className={cn("font-semibold", badge.color)}>
          {badge.name}
        </span>
      )}
    </div>
  );
};
