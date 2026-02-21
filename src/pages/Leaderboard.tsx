import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Medal, Star, Shield, FileText, CheckCircle2, Vote } from "lucide-react";
import { getNextBadge, getPointsToNextBadge, BADGE_CONFIGS } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface UserStat {
  user_id: string;
  points: number;
  badge_level: string;
  total_reports: number;
  total_verifications: number;
  total_votes: number;
  display_name: string | null;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<UserStat[]>([]);
  const [userStats, setUserStats] = useState<UserStat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await Promise.all([
      fetchLeaderboard(),
      fetchUserStats(session.user.id)
    ]);
    setIsLoading(false);
  };

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .order("points", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Error fetching leaderboard:", error);
      return;
    }
    setLeaderboard(data || []);
  };

  const fetchUserStats = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Error fetching user stats:", error);
      return;
    }
    setUserStats(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/50 mb-4 animate-pulse">
            <Trophy className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const nextBadge = userStats ? getNextBadge(userStats.points) : null;
  const pointsToNext = userStats ? getPointsToNextBadge(userStats.points) : 0;
  const currentBadgeIndex = BADGE_CONFIGS.findIndex(b => b.level === userStats?.badge_level);
  const progressPercent = nextBadge
    ? ((userStats?.points || 0) - BADGE_CONFIGS[currentBadgeIndex]?.minPoints) /
      (nextBadge.minPoints - BADGE_CONFIGS[currentBadgeIndex]?.minPoints) * 100
    : 100;

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Reorder for podium: [2nd, 1st, 3rd]
  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3;
  const podiumHeights = ["h-28", "h-36", "h-24"];
  const podiumRanks = top3.length === 3 ? [2, 1, 3] : [1, 2, 3];
  const podiumColors = [
    "from-muted-foreground to-muted", // silver
    "from-accent to-primary",          // gold
    "from-amber-700 to-amber-900",     // bronze
  ];

  const userRank = leaderboard.findIndex(u => u.user_id === userStats?.user_id) + 1;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Top contributors protecting the community from UPI fraud
          </p>
        </div>

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 max-w-sm mx-auto">
            <TabsTrigger value="leaderboard" className="gap-2">
              <Medal className="h-4 w-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <Star className="h-4 w-4" />
              My Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-8 animate-fade-in">
            {/* Podium */}
            {top3.length >= 3 && (
              <div className="flex items-end justify-center gap-3 md:gap-6 mb-4">
                {podiumOrder.map((user, i) => (
                  <div key={user.user_id} className="flex flex-col items-center flex-1 max-w-[180px]">
                    <div className={cn(
                      "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl font-bold mb-2 shadow-lg bg-gradient-to-br",
                      podiumColors[i],
                      "text-background",
                      podiumRanks[i] === 1 && "ring-2 ring-primary/50 shadow-glow"
                    )}>
                      {podiumRanks[i]}
                    </div>
                    <BadgeDisplay badgeLevel={user.badge_level} size="sm" showName={false} animate />
                    <p className="text-sm font-semibold text-foreground mt-2 truncate max-w-full text-center">
                      {user.display_name || `User`}
                    </p>
                    <p className="text-lg font-bold text-primary">{user.points}</p>
                    <p className="text-xs text-muted-foreground mb-2">points</p>
                    <div className={cn(
                      "w-full rounded-t-xl bg-gradient-to-t transition-all duration-500",
                      podiumColors[i],
                      podiumHeights[i],
                      "opacity-20"
                    )} />
                  </div>
                ))}
              </div>
            )}

            {/* Your Rank Banner */}
            {userStats && userRank > 0 && (
              <GlassCard className="p-4 border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      #{userRank}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Your Rank</p>
                      <p className="text-xs text-muted-foreground">
                        {userStats.points} points · {userStats.badge_level}
                      </p>
                    </div>
                  </div>
                  <BadgeDisplay badgeLevel={userStats.badge_level} size="sm" animate />
                </div>
              </GlassCard>
            )}

            {/* Remaining List */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((user, index) => {
                  const rank = index + 4;
                  const isCurrentUser = user.user_id === userStats?.user_id;
                  return (
                    <GlassCard
                      key={user.user_id}
                      className={cn(
                        "px-5 py-4",
                        isCurrentUser && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-muted-foreground w-8 text-center">
                            {rank}
                          </span>
                          <BadgeDisplay badgeLevel={user.badge_level} size="sm" showName={false} animate />
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {user.display_name || `User ${rank}`}
                              {isCurrentUser && (
                                <span className="text-xs text-primary ml-2">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.total_reports} reports · {user.total_verifications} checks · {user.total_votes} votes
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{user.points}</p>
                          <p className="text-xs text-muted-foreground">pts</p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}

            {leaderboard.length === 0 && (
              <div className="text-center py-16">
                <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No contributors yet. Be the first!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6 animate-fade-in">
            {userStats ? (
              <>
                {/* Profile Card */}
                <GlassCard className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <BadgeDisplay badgeLevel={userStats.badge_level} size="lg" className="justify-center" animate />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      {userStats.display_name && (
                        <h2 className="text-2xl font-bold text-foreground mb-1">{userStats.display_name}</h2>
                      )}
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                        <span className="text-3xl font-bold text-primary">{userStats.points}</span>
                        <span className="text-muted-foreground">points</span>
                        {userRank > 0 && (
                          <span className="text-sm text-muted-foreground ml-2 px-2 py-0.5 rounded-full bg-secondary">
                            Rank #{userRank}
                          </span>
                        )}
                      </div>
                      {nextBadge && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5 text-primary" />
                              Next: {nextBadge.name}
                            </span>
                            <span className="text-muted-foreground">{pointsToNext} pts to go</span>
                          </div>
                          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-gradient-primary rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Activity Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: FileText, label: "Reports", value: userStats.total_reports, pts: "10 pts each", color: "text-destructive", bg: "bg-destructive/10" },
                    { icon: Shield, label: "Verifications", value: userStats.total_verifications, pts: "5 pts each", color: "text-info", bg: "bg-info/10" },
                    { icon: Vote, label: "Votes", value: userStats.total_votes, pts: "2 pts each", color: "text-primary", bg: "bg-primary/10" },
                  ].map(({ icon: Icon, label, value, pts, color, bg }) => (
                    <GlassCard key={label} className="p-5 text-center">
                      <div className={cn("w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center", bg)}>
                        <Icon className={cn("h-5 w-5", color)} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{value}</p>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{pts}</p>
                    </GlassCard>
                  ))}
                </div>

                {/* Badge Roadmap */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Badge Roadmap
                  </h3>
                  <div className="space-y-3">
                    {BADGE_CONFIGS.map((badge, i) => {
                      const isUnlocked = (userStats?.points || 0) >= badge.minPoints;
                      const isCurrent = badge.level === userStats?.badge_level;
                      return (
                        <div
                          key={badge.level}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                            isCurrent
                              ? "border-primary/40 bg-primary/10 shadow-glow"
                              : isUnlocked
                              ? "border-success/20 bg-success/5"
                              : "border-border/20 opacity-40"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {isUnlocked && (
                              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            )}
                            {!isUnlocked && (
                              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                            )}
                            <BadgeDisplay badgeLevel={badge.level} size="sm" animate={isUnlocked} />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{badge.minPoints} pts</p>
                            {isCurrent && (
                              <p className="text-xs text-primary font-medium">Current</p>
                            )}
                            {!isUnlocked && (
                              <p className="text-xs text-muted-foreground">
                                {badge.minPoints - (userStats?.points || 0)} to go
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </>
            ) : (
              <GlassCard className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/50 mb-4">
                  <Star className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Stats Yet</h3>
                <p className="text-muted-foreground text-sm">
                  Start verifying UPI IDs or reporting fraud to earn points and badges!
                </p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
