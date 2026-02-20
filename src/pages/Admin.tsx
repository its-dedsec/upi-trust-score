import { useEffect, useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { upiIdSchema, addReportsCountSchema } from "@/lib/validation";
import { ZodError } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pencil,
  Trash2,
  FileText,
  AlertCircle,
  Wallet,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardManager } from "@/components/LeaderboardManager";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  upi_identity_id: string;
  upi_identities?: { upi_id: string };
}

interface UpiGroup {
  upi_id: string;
  upi_identity_id: string;
  total: number;
  open: number;
  resolved: number;
  rejected: number;
  reports: Report[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupReportsByUpi(reports: Report[]): UpiGroup[] {
  const map: Record<string, UpiGroup> = {};
  for (const r of reports) {
    const uid = r.upi_identity_id;
    if (!map[uid]) {
      map[uid] = {
        upi_id: r.upi_identities?.upi_id ?? uid,
        upi_identity_id: uid,
        total: 0,
        open: 0,
        resolved: 0,
        rejected: 0,
        reports: [],
      };
    }
    map[uid].total++;
    map[uid][r.status as "open" | "resolved" | "rejected"]++;
    map[uid].reports.push(r);
  }
  // sort by open reports desc
  return Object.values(map).sort((a, b) => b.open - a.open);
}

function statusBadge(status: string) {
  if (status === "resolved") return <Badge variant="secondary">Resolved</Badge>;
  if (status === "rejected") return <Badge variant="outline">Rejected</Badge>;
  return <Badge variant="destructive">Open</Badge>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Admin() {
  const { isLoading: authLoading, isAuthorized } = useAuthGuard(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [upiIdentities, setUpiIdentities] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editingUpi, setEditingUpi] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);
  const [newUpi, setNewUpi] = useState("");
  const [reportFilter, setReportFilter] = useState<"all" | "open" | "resolved" | "rejected">("open");
  const { toast } = useToast();

  const analytics = useMemo(() => {
    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === "open").length;
    const totalUpiIdentities = upiIdentities.length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = reports.filter(r => new Date(r.created_at) >= sevenDaysAgo).length;
    return { totalReports, pendingReports, totalUpiIdentities, recentActivity };
  }, [reports, upiIdentities]);

  const reportCounts = useMemo(
    () =>
      reports.reduce((acc: Record<string, number>, r) => {
        acc[r.upi_identity_id] = (acc[r.upi_identity_id] || 0) + 1;
        return acc;
      }, {}),
    [reports]
  );

  const filteredGroups = useMemo(() => {
    const groups = groupReportsByUpi(reports);
    if (reportFilter === "all") return groups;
    return groups
      .map(g => ({
        ...g,
        reports: g.reports.filter(r => r.status === reportFilter),
        open: reportFilter === "open" ? g.open : 0,
        resolved: reportFilter === "resolved" ? g.resolved : 0,
        rejected: reportFilter === "rejected" ? g.rejected : 0,
        total: g.reports.filter(r => r.status === reportFilter).length,
      }))
      .filter(g => g.total > 0);
  }, [reports, reportFilter]);

  useEffect(() => {
    if (!authLoading && isAuthorized) fetchData();
  }, [authLoading, isAuthorized]);

  if (authLoading || !isAuthorized) return null;

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    const [reportsRes, upiRes] = await Promise.all([
      supabase
        .from("fraud_reports")
        .select(`*, upi_identities (upi_id)`)
        .order("created_at", { ascending: false }),
      supabase.from("upi_identities").select("*").order("created_at", { ascending: false }),
    ]);
    setReports((reportsRes.data as Report[]) || []);
    setUpiIdentities(upiRes.data || []);
  };

  // ─── Bulk Actions ───────────────────────────────────────────────────────────
  const bulkUpdateStatus = async (upiIdentityId: string, status: "resolved" | "rejected") => {
    const openIds = reports
      .filter(r => r.upi_identity_id === upiIdentityId && r.status === "open")
      .map(r => r.id);
    if (openIds.length === 0) return;

    const { error } = await supabase
      .from("fraud_reports")
      .update({ status, resolved_at: new Date().toISOString() })
      .in("id", openIds);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: status === "resolved" ? "All resolved" : "All rejected",
        description: `${openIds.length} report(s) marked as ${status}`,
      });
      fetchData();
    }
  };

  // ─── Single Report Actions ──────────────────────────────────────────────────
  const handleSingleStatus = async (reportId: string, status: "resolved" | "rejected") => {
    const { error } = await supabase
      .from("fraud_reports")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", reportId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const handleUpdateReport = async () => {
    if (!editingReport) return;
    const { error } = await supabase
      .from("fraud_reports")
      .update({ reason: editingReport.reason, status: editingReport.status as "open" | "resolved" | "rejected" })
      .eq("id", editingReport.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Report updated" });
      setEditingReport(null);
      fetchData();
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase
      .from(deleteConfirm.type === "report" ? "fraud_reports" : "upi_identities")
      .delete()
      .eq("id", deleteConfirm.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted successfully" });
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const handleUpdateUpi = async () => {
    if (!editingUpi) return;
    const { error } = await supabase
      .from("upi_identities")
      .update({ upi_id: editingUpi.upi_id })
      .eq("id", editingUpi.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "UPI Identity updated" });
      setEditingUpi(null);
      fetchData();
    }
  };

  const handleAddUpi = async () => {
    const upi = newUpi.trim();
    if (!upi) return;
    try {
      upiIdSchema.parse(upi);
    } catch (error) {
      if (error instanceof ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }
    const { error } = await supabase.from("upi_identities").insert({ upi_id: upi });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "UPI added" });
      setNewUpi("");
      fetchData();
    }
  };

  const handleAddReports = async (identity: any) => {
    try {
      const countStr = window.prompt("How many reports to add?", "1");
      if (!countStr) return;
      const count = Number(countStr);
      try {
        addReportsCountSchema.parse(count);
      } catch (error) {
        if (error instanceof ZodError) {
          toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
          return;
        }
      }
      const reason = window.prompt("Reason?", "Admin manual addition") || "Admin manual addition";
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const payload = Array.from({ length: count }).map(() => ({
        upi_identity_id: identity.id,
        user_id: user.id,
        reason,
        status: "open" as const,
      }));
      const { error } = await supabase.from("fraud_reports").insert(payload);
      if (error) throw error;
      toast({ title: "Reports added", description: `${count} report(s) added` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Admin Panel
        </h1>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Reports", value: analytics.totalReports, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
            { label: "Pending", value: analytics.pendingReports, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "UPI IDs", value: analytics.totalUpiIdentities, icon: Wallet, color: "text-accent-foreground", bg: "bg-accent/10" },
            { label: "Last 7 Days", value: analytics.recentActivity, icon: TrendingUp, color: "text-secondary-foreground", bg: "bg-secondary/10" },
          ].map((card, i) => (
            <GlassCard key={card.label} className="p-5 animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-full ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="reports">Fraud Reports</TabsTrigger>
            <TabsTrigger value="identities">UPI Identities</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* ── Fraud Reports Tab ── */}
          <TabsContent value="reports" className="animate-fade-in space-y-4">
            {/* Filter bar */}
            <div className="flex gap-2 flex-wrap">
              {(["open", "all", "resolved", "rejected"] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={reportFilter === f ? "default" : "outline"}
                  onClick={() => setReportFilter(f)}
                  className="capitalize"
                >
                  {f === "open" ? `Open (${analytics.pendingReports})` : f}
                </Button>
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <GlassCard className="p-12 text-center text-muted-foreground">
                No {reportFilter !== "all" ? reportFilter : ""} reports found.
              </GlassCard>
            )}

            {filteredGroups.map(group => {
              const isExpanded = expandedGroups.has(group.upi_identity_id);
              return (
                <GlassCard key={group.upi_identity_id} className="overflow-hidden">
                  {/* Group Header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleGroup(group.upi_identity_id)}
                  >
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>

                    <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{group.upi_id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {group.total} report{group.total !== 1 ? "s" : ""} total
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {group.open > 0 && <Badge variant="destructive">{group.open} open</Badge>}
                      {group.resolved > 0 && <Badge variant="secondary">{group.resolved} resolved</Badge>}
                      {group.rejected > 0 && <Badge variant="outline">{group.rejected} rejected</Badge>}
                    </div>

                    {/* Bulk actions — only show when there are open reports */}
                    {group.open > 0 && (
                      <div
                        className="flex gap-2 ml-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => bulkUpdateStatus(group.upi_identity_id, "resolved")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve all
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-muted text-muted-foreground hover:bg-secondary/50"
                          onClick={() => bulkUpdateStatus(group.upi_identity_id, "rejected")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject all
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Individual Reports */}
                  {isExpanded && (
                    <div className="border-t border-white/10 divide-y divide-white/5">
                      {group.reports.map(report => (
                        <div key={report.id} className="px-6 py-3 flex items-start gap-4 text-sm hover:bg-white/[0.02] transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground leading-snug">{report.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {statusBadge(report.status)}
                            {report.status === "open" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                                  onClick={() => handleSingleStatus(report.id, "resolved")}
                                  title="Resolve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleSingleStatus(report.id, "rejected")}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingReport(report)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ type: "report", id: report.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </TabsContent>

          {/* ── UPI Identities Tab ── */}
          <TabsContent value="identities" className="animate-fade-in space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add UPI ID (e.g., user@bank)"
                  value={newUpi}
                  onChange={e => setNewUpi(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddUpi()}
                  className="max-w-sm"
                />
                <Button onClick={handleAddUpi}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </GlassCard>

            <div className="grid gap-3">
              {upiIdentities.map(identity => (
                <GlassCard key={identity.id} className="p-4 flex items-center gap-4">
                  <Wallet className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{identity.upi_id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Added {new Date(identity.created_at).toLocaleDateString()} · Last seen {new Date(identity.last_seen_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {reportCounts[identity.id] || 0} reports
                  </Badge>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => handleAddReports(identity)}>
                      <Plus className="h-3 w-3 mr-1" /> Reports
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingUpi(identity)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm({ type: "upi", id: identity.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </TabsContent>

          {/* ── Leaderboard Tab ── */}
          <TabsContent value="leaderboard" className="animate-fade-in">
            <GlassCard className="p-6">
              <LeaderboardManager />
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* Edit Report Dialog */}
        <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  value={editingReport?.reason || ""}
                  onChange={e => setEditingReport(editingReport ? { ...editingReport, reason: e.target.value } : null)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-white/10 rounded-md"
                  value={editingReport?.status || "open"}
                  onChange={e => setEditingReport(editingReport ? { ...editingReport, status: e.target.value } : null)}
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingReport(null)}>Cancel</Button>
              <Button onClick={handleUpdateReport}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit UPI Dialog */}
        <Dialog open={!!editingUpi} onOpenChange={() => setEditingUpi(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit UPI Identity</DialogTitle>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">UPI ID</label>
              <Input
                className="mt-1"
                value={editingUpi?.upi_id || ""}
                onChange={e => setEditingUpi({ ...editingUpi, upi_id: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUpi(null)}>Cancel</Button>
              <Button onClick={handleUpdateUpi}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete this {deleteConfirm?.type === "report" ? "report" : "UPI identity"}? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteItem}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
