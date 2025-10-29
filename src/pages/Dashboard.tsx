import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Shield, CheckCircle, TrendingUp, Activity, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

interface Stats {
  totalReports: number;
  totalVerifications: number;
  resolvedCases: number;
  globalRiskPercent: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    totalVerifications: 0,
    resolvedCases: 0,
    globalRiskPercent: 0,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Fetch stats
    const [reportsRes, verificationsRes, resolvedRes] = await Promise.all([
      supabase.from("fraud_reports").select("*", { count: "exact", head: true }),
      supabase.from("verifications").select("*", { count: "exact", head: true }),
      supabase.from("fraud_reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    ]);

    // Calculate global risk
    const { data: verifications } = await supabase
      .from("verifications")
      .select("risk_level");

    const highRiskCount = verifications?.filter(v => v.risk_level === "high").length || 0;
    const totalCount = verifications?.length || 1;

    setStats({
      totalReports: reportsRes.count || 0,
      totalVerifications: verificationsRes.count || 0,
      resolvedCases: resolvedRes.count || 0,
      globalRiskPercent: Math.round((highRiskCount / totalCount) * 100),
    });

    // Fetch alerts
    const { data: alertsData } = await supabase
      .from("alerts")
      .select(`
        *,
        upi_identities (upi_id)
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    setAlerts(alertsData || []);

    // Fetch recent activity
    const { data: activityData } = await supabase
      .from("verifications")
      .select(`
        *,
        upi_identities (upi_id)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    setRecentActivity(activityData || []);

    // Generate chart data for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const chartDataPromises = last7Days.map(async (date) => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const [reports, verifs] = await Promise.all([
        supabase
          .from("fraud_reports")
          .select("*", { count: "exact", head: true })
          .gte("created_at", date)
          .lt("created_at", nextDate.toISOString().split('T')[0]),
        supabase
          .from("verifications")
          .select("*", { count: "exact", head: true })
          .gte("created_at", date)
          .lt("created_at", nextDate.toISOString().split('T')[0]),
      ]);

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reports: reports.count || 0,
        verifications: verifs.count || 0,
      };
    });

    const chartResults = await Promise.all(chartDataPromises);
    setChartData(chartResults);

    // Calculate risk distribution
    const lowCount = verifications?.filter(v => v.risk_level === "low").length || 0;
    const mediumCount = verifications?.filter(v => v.risk_level === "medium").length || 0;
    const highCount = verifications?.filter(v => v.risk_level === "high").length || 0;

    setRiskDistribution([
      { name: "Low Risk", value: lowCount, color: "hsl(var(--success))" },
      { name: "Medium Risk", value: mediumCount, color: "hsl(var(--warning))" },
      { name: "High Risk", value: highCount, color: "hsl(var(--destructive))" },
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Dashboard
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlassCard className="p-6" hover>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-danger flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-3xl font-bold">{stats.totalReports}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verifications</p>
                <p className="text-3xl font-bold">{stats.totalVerifications}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-success flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved Cases</p>
                <p className="text-3xl font-bold">{stats.resolvedCases}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-warning flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Global Risk %</p>
                <p className="text-3xl font-bold">{stats.globalRiskPercent}%</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Activity Trends (7 Days)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="verifications" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVerifications)" />
                  <Area type="monotone" dataKey="reports" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorReports)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Risk Distribution
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Alerts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4">Fraud Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl bg-secondary/30 border border-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.upi_identities?.upi_id}
                      </p>
                    </div>
                    <Badge
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : alert.severity === "warning"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No alerts at this time
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 rounded-xl bg-secondary/30 border border-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {activity.upi_identities?.upi_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Score: {activity.risk_score}
                      </p>
                    </div>
                    <Badge variant={
                      activity.risk_level === "low"
                        ? "secondary"
                        : activity.risk_level === "medium"
                        ? "outline"
                        : "destructive"
                    }>
                      {activity.risk_level}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
