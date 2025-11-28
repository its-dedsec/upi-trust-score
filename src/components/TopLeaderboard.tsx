import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserStat {
  user_id: string;
  points: number;
  badge_level: string;
  total_reports: number;
  total_verifications: number;
  display_name: string | null;
}

export const TopLeaderboard = () => {
  const [topUsers, setTopUsers] = useState<UserStat[]>([]);

  useEffect(() => {
    fetchTopUsers();
  }, []);

  const fetchTopUsers = async () => {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .order("points", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching top users:", error);
      return;
    }

    setTopUsers(data || []);
  };

  if (topUsers.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            Top Contributors
          </h2>
          <p className="text-xl text-muted-foreground">
            Our community heroes protecting users from fraud
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {topUsers.map((user, index) => (
            <GlassCard
              key={user.user_id}
              className={cn(
                "p-6 text-center transition-all duration-300 hover:scale-105",
                index === 0 && "md:col-start-2 md:row-start-1 md:scale-110 border-primary shadow-glow",
                index === 1 && "md:col-start-1 md:row-start-2",
                index === 2 && "md:col-start-3 md:row-start-2"
              )}
            >
              <div className={cn(
                "text-5xl font-bold mb-4 w-16 h-16 mx-auto rounded-full flex items-center justify-center",
                index === 0 && "bg-gradient-to-br from-accent to-primary text-background shadow-glow",
                index === 1 && "bg-gradient-to-br from-muted-foreground to-muted text-background",
                index === 2 && "bg-gradient-to-br from-amber-700 to-amber-900 text-background"
              )}>
                {index + 1}
              </div>

              {user.display_name && (
                <div className="text-xl font-semibold mb-2">{user.display_name}</div>
              )}

              <BadgeDisplay badgeLevel={user.badge_level} size="lg" className="justify-center mb-4" animate />

              <div className="text-3xl font-bold text-primary mb-2">{user.points}</div>
              <div className="text-sm text-muted-foreground mb-4">points</div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div>{user.total_reports} reports submitted</div>
                <div>{user.total_verifications} verifications</div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="text-center">
          <Link to="/auth">
            <Button size="lg" className="shadow-glow">
              View Full Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
