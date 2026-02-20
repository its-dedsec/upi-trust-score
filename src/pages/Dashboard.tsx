import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Shield,
  CheckCircle,
  TrendingUp,
  Activity,
  Eye,
  ScanLine,
  Flag,
  Trophy,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getBadgeConfig, getNextBadge, BADGE_CONFIGS } from "@/lib/badges";

interface Stats {
  totalReports: number;
  totalVerifications: number;
  resolvedCases: number;
  globalRiskPercent: number;
}

interface UserStats {
  points: number;
  badge_level: string;
  total_reports: number;
  total_verifications: number;
  total_votes: number;
  display_name: string | null;
}

export default function Dashboard() {
  const { isLoading: authLoading, isAuthorized } = useAuthGuard();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    totalVerifications: 0,
    resolvedCases: 0,
    globalRiskPercent: 0,
  });
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);

  const activityChartConfig = {
    reports: { label: "Reports", color: "hsl(var(--destructive))" },
    verifications: { label: "Verifications", color: "hsl(var(--primary))" },
  };

  useEffect(() => {
    if (isAuthorized) fetchDashboardData();
  }, [isAuthorized]);

  if (authLoading || !isAuthorized) return null;

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserEmail(user.email);

    const [reportsRes, verificationsRes, resolvedRes] = await Promise.all([
      supabase.from("fraud_reports").select("*", { count: "exact", head: true }),
      supabase.from("verifications").select("*", { count: "exact", head: true }),
      supabase.from("fraud_reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    ]);

    const { data: verifications } = await supabase.from("verifications").select("risk_level");
    const highRiskCount = verifications?.filter(v => v.risk_level === "high").length || 0;
    const totalCount = verifications?.length || 1;

    setStats({
      totalReports: reportsRes.count || 0,
      totalVerifications: verificationsRes.count || 0,
      resolvedCases: resolvedRes.count || 0,
      globalRiskPercent: Math.round((highRiskCount / totalCount) * 100),
    });

    // Fetch personal user stats
    if (user) {
      const { data: us } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setUserStats(us || null);
    }

    // Fetch alerts
    const { data: alertsData } = await supabase
      .from("alerts")
      .select(`*, upi_identities (upi_id)`)
      .order("created_at", { ascending: false })
      .limit(5);
    setAlerts(alertsData || []);

    // Fetch recent activity
    const { data: activityData } = await supabase
      .from("verifications")
      .select(`*, upi_identities (upi_id)`)
      .order("created_at", { ascending: false })
      .limit(8);
    setRecentActivity(activityData || []);

    // Chart data for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    const chartResults = await Promise.all(
      last7Days.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const [rp, vf] = await Promise.all([
          supabase.from("fraud_reports").select("*", { count: "exact", head: true })
            .gte("created_at", date).lt("created_at", nextDate.toISOString().split("T")[0]),
          supabase.from("verifications").select("*", { count: "exact", head: true })
            .gte("created_at", date).lt("created_at", nextDate.toISOString().split("T")[0]),
        ]);
        return {
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          reports: rp.count || 0,
          verifications: vf.count || 0,
        };
      })
    );
    setChartData(chartResults);

    const lowCount = verifications?.filter(v => v.risk_level === "low").length || 0;
    const mediumCount = verifications?.filter(v => v.risk_level === "medium").length || 0;
    const highCount = verifications?.filter(v => v.risk_level === "high").length || 0;
    setRiskDistribution([
      { name: "Low Risk", value: lowCount, color: "hsl(var(--success))" },
      { name: "Medium Risk", value: mediumCount, color: "hsl(var(--warning))" },
      { name: "High Risk", value: highCount, color: "hsl(var(--destructive))" },
    ]);
  };

  const displayName = userStats?.display_name || userEmail.split("@")[0] || "there";
  const badgeConfig = userStats ? getBadgeConfig(userStats.badge_level) : getBadgeConfig("rookie");
  const nextBadge = userStats ? getNextBadge(userStats.points) : getNextBadge(0);
  const currentPoints = userStats?.points || 0;
  const nextBadgeConfig = nextBadge;
  const progressPct = nextBadgeConfig
    ? Math.round(
        ((currentPoints - badgeConfig.minPoints) /
          (nextBadgeConfig.minPoints - badgeConfig.minPoints)) *
          100
      )
    : 100;

  const riskColor =
    stats.globalRiskPercent >= 40
      ? "text-destructive"
      : stats.globalRiskPercent >= 20
      ? "text-warning"
      : "text-success";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">

        {/* ── Hero Welcome Row ── */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Welcome + Quick Actions */}
          <GlassCard className="flex-1 p-6 space-y-4 animate-fade-in">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent capitalize">
                {displayName} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Here's what's happening in the VeriPay network today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => navigate("/verify-upi")}
              >
                <ScanLine className="h-4 w-4" />
                Verify UPI
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/report-fraud")}
              >
                <Flag className="h-4 w-4" />
                Report Fraud
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/leaderboard")}
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </div>
          </GlassCard>

          {/* Personal Badge Card */}
          <GlassCard className="w-full md:w-72 p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <p className="text-sm text-muted-foreground mb-3 font-medium">Your Badge</p>
            <div className="flex items-center gap-4 mb-4">
              <BadgeDisplay badgeLevel={userStats?.badge_level || "rookie"} size="lg" animate />
              <div>
                <p className="font-bold text-lg">{badgeConfig.name}</p>
                <p className="text-sm text-muted-foreground">{currentPoints} pts</p>
              </div>
            </div>
            {nextBadgeConfig ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to {nextBadgeConfig.name}</span>
                  <span>{nextBadgeConfig.minPoints - currentPoints} pts left</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            ) : (
              <p className="text-xs text-primary font-medium">🏆 Max badge achieved!</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-xs gap-1 text-muted-foreground"
              onClick={() => navigate("/leaderboard")}
            >
              View full progress <ArrowRight className="h-3 w-3" />
            </Button>
          </GlassCard>
        </div>

        {/* ── Global Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Reports",
              value: stats.totalReports,
              icon: AlertTriangle,
              gradient: "bg-gradient-danger",
              delay: "0s",
            },
            {
              label: "Verifications",
              value: stats.totalVerifications,
              icon: Shield,
              gradient: "bg-gradient-primary",
              delay: "0.05s",
            },
            {
              label: "Resolved Cases",
              value: stats.resolvedCases,
              icon: CheckCircle,
              gradient: "bg-gradient-success",
              delay: "0.1s",
            },
            {
              label: "Global Risk",
              value: `${stats.globalRiskPercent}%`,
              icon: TrendingUp,
              gradient: "bg-gradient-warning",
              delay: "0.15s",
              valueClass: riskColor,
            },
          ].map((card) => (
            <GlassCard
              key={card.label}
              className="p-5 animate-fade-in"
              style={{ animationDelay: card.delay }}
              hover
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${card.gradient} flex items-center justify-center shrink-0`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.valueClass || ""}`}>{card.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* ── My Contributions ── */}
        {userStats && (
          <GlassCard className="p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                My Contributions
              </h2>
              <Badge variant="outline" className="text-primary border-primary/40">
                {currentPoints} total pts
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Reports Filed", value: userStats.total_reports, pts: userStats.total_reports * 10, color: "text-destructive", bg: "bg-destructive/10" },
                { label: "UPI Verified", value: userStats.total_verifications, pts: userStats.total_verifications * 5, color: "text-primary", bg: "bg-primary/10" },
                { label: "Votes Cast", value: userStats.total_votes, pts: userStats.total_votes * 2, color: "text-info", bg: "bg-info/10" },
              ].map(item => (
                <div key={item.label} className={`rounded-xl ${item.bg} p-4 text-center`}>
                  <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                  <p className={`text-xs font-medium ${item.color} mt-1`}>+{item.pts} pts</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart — wider */}
          <GlassCard className="lg:col-span-2 p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              7-Day Activity
            </h2>
            <div className="h-56">
              <ChartContainer config={activityChartConfig}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="verifications" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorVerifications)" />
                  <Area type="monotone" dataKey="reports" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" />
                </AreaChart>
              </ChartContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                Verifications
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                Reports
              </div>
            </div>
          </GlassCard>

          {/* Pie Chart */}
          <GlassCard className="p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Risk Breakdown
            </h2>
            <div className="h-48">
              <ChartContainer config={{ value: { label: "Risk Level" } }}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-1.5 mt-1">
              {riskDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ── Alerts & Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <GlassCard className="p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Fraud Alerts
            </h2>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-60" />
                  <p className="text-sm">No active alerts — all clear!</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 rounded-xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.upi_identities?.upi_id}</p>
                    </div>
                    <Badge
                      variant={alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "outline" : "secondary"}
                      className="ml-2 shrink-0 capitalize"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Verifications
            </h2>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          activity.risk_level === "low"
                            ? "bg-success"
                            : activity.risk_level === "medium"
                            ? "bg-warning"
                            : "bg-destructive"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{activity.upi_identities?.upi_id}</p>
                        <p className="text-xs text-muted-foreground">Score: {activity.risk_score}/100</p>
                      </div>
                    </div>
                    <Badge
                      variant={activity.risk_level === "low" ? "secondary" : activity.risk_level === "medium" ? "outline" : "destructive"}
                      className="ml-2 shrink-0 capitalize"
                    >
                      {activity.risk_level}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
