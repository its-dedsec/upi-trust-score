import { Trophy, Shield, Award, Star, Sparkles, Crown } from "lucide-react";

export interface BadgeConfig {
  level: string;
  name: string;
  icon: typeof Trophy;
  minPoints: number;
  color: string;
  gradient: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = [
  {
    level: "rookie",
    name: "Rookie",
    icon: Star,
    minPoints: 0,
    color: "text-muted-foreground",
    gradient: "from-muted to-muted-foreground"
  },
  {
    level: "helper",
    name: "Helper",
    icon: Shield,
    minPoints: 10,
    color: "text-blue-400",
    gradient: "from-blue-400 to-blue-600"
  },
  {
    level: "protector",
    name: "Protector",
    icon: Award,
    minPoints: 50,
    color: "text-green-400",
    gradient: "from-green-400 to-green-600"
  },
  {
    level: "guardian",
    name: "Guardian",
    icon: Trophy,
    minPoints: 100,
    color: "text-purple-400",
    gradient: "from-purple-400 to-purple-600"
  },
  {
    level: "expert",
    name: "Expert",
    icon: Sparkles,
    minPoints: 250,
    color: "text-primary",
    gradient: "from-primary to-accent"
  },
  {
    level: "legend",
    name: "Legend",
    icon: Crown,
    minPoints: 500,
    color: "text-primary",
    gradient: "from-accent via-primary to-accent"
  }
];

export const getBadgeConfig = (badgeLevel: string): BadgeConfig => {
  return BADGE_CONFIGS.find(b => b.level === badgeLevel) || BADGE_CONFIGS[0];
};

export const getNextBadge = (currentPoints: number): BadgeConfig | null => {
  return BADGE_CONFIGS.find(b => b.minPoints > currentPoints) || null;
};

export const getPointsToNextBadge = (currentPoints: number): number => {
  const nextBadge = getNextBadge(currentPoints);
  return nextBadge ? nextBadge.minPoints - currentPoints : 0;
};
