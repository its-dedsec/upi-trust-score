import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp } from "lucide-react";
import { getNextBadge, getPointsToNextBadge, BADGE_CONFIGS } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface UserStat {
  user_id: string;
  points: number;
  badge_level: string;
  total_reports: number;
  total_verifications: number;
  total_votes: number;
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
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <Trophy className="inline-block h-8 w-8 text-primary mr-2" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground">Top contributors in our community</p>
          </div>

          <Tabs defaultValue="leaderboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="leaderboard">Top Contributors</TabsTrigger>
              <TabsTrigger value="progress">My Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="space-y-4">
              {leaderboard.map((user, index) => (
                <GlassCard key={user.user_id} className={cn(
                  "p-6",
                  index < 3 && "border-primary/50 bg-primary/5"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center",
                        index === 0 && "bg-gradient-to-br from-accent to-primary text-background",
                        index === 1 && "bg-gradient-to-br from-muted-foreground to-muted text-background",
                        index === 2 && "bg-gradient-to-br from-amber-700 to-amber-900 text-background",
                        index > 2 && "bg-secondary text-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <BadgeDisplay badgeLevel={user.badge_level} size="sm" />
                        <div className="text-sm text-muted-foreground mt-1">
                          {user.total_reports} reports · {user.total_verifications} verifications
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{user.points}</div>
                      <div className="text-sm text-muted-foreground">points</div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              {userStats ? (
                <>
                  <GlassCard className="p-6">
                    <div className="text-center space-y-4">
                      <BadgeDisplay badgeLevel={userStats.badge_level} size="lg" className="justify-center" />
                      <div>
                        <div className="text-3xl font-bold text-primary">{userStats.points}</div>
                        <div className="text-muted-foreground">Total Points</div>
                      </div>
                    </div>
                  </GlassCard>

                  {nextBadge && (
                    <GlassCard className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Next Badge: {nextBadge.name}
                          </h3>
                          <span className="text-muted-foreground">{pointsToNext} points needed</span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                      </div>
                    </GlassCard>
                  )}

                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Your Activity</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{userStats.total_reports}</div>
                        <div className="text-sm text-muted-foreground">Reports</div>
                        <div className="text-xs text-muted-foreground">10 pts each</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{userStats.total_verifications}</div>
                        <div className="text-sm text-muted-foreground">Verifications</div>
                        <div className="text-xs text-muted-foreground">5 pts each</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{userStats.total_votes}</div>
                        <div className="text-sm text-muted-foreground">Votes</div>
                        <div className="text-xs text-muted-foreground">2 pts each</div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">All Badges</h3>
                    <div className="space-y-3">
                      {BADGE_CONFIGS.map((badge) => {
                        const isUnlocked = (userStats?.points || 0) >= badge.minPoints;
                        return (
                          <div
                            key={badge.level}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              isUnlocked ? "border-primary/30 bg-primary/5" : "border-border/30 opacity-50"
                            )}
                          >
                            <BadgeDisplay badgeLevel={badge.level} size="sm" />
                            <div className="text-right">
                              <div className="text-sm font-semibold">{badge.minPoints} pts</div>
                              {isUnlocked ? (
                                <div className="text-xs text-primary">Unlocked!</div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  {badge.minPoints - (userStats?.points || 0)} pts to go
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </>
              ) : (
                <GlassCard className="p-8 text-center">
                  <p className="text-muted-foreground">Start contributing to earn badges and points!</p>
                </GlassCard>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
