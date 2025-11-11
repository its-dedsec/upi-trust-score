import { useEffect, useState } from "react";
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
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  const { isLoading: authLoading, isAuthorized } = useAuthGuard(true);
  const [reports, setReports] = useState<any[]>([]);
  const [upiIdentities, setUpiIdentities] = useState<any[]>([]);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [editingUpi, setEditingUpi] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [newUpi, setNewUpi] = useState("");
  const { toast } = useToast();

  if (authLoading || !isAuthorized) {
    return null;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [reportsRes, upiRes] = await Promise.all([
      supabase
        .from("fraud_reports")
        .select(`
          *,
          upi_identities (upi_id)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("upi_identities")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setReports(reportsRes.data || []);
    setUpiIdentities(upiRes.data || []);
    const counts = (reportsRes.data || []).reduce((acc: Record<string, number>, r: any) => {
      acc[r.upi_identity_id] = (acc[r.upi_identity_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    setReportCounts(counts);
  };

  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from("fraud_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Report resolved",
        description: "The report has been marked as resolved",
      });
      fetchData();
    }
  };

  const handleRejectReport = async (reportId: string) => {
    const { error } = await supabase
      .from("fraud_reports")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Report rejected",
        description: "The report has been marked as rejected",
      });
      fetchData();
    }
  };

  const handleUpdateReport = async () => {
    if (!editingReport) return;

    const { error } = await supabase
      .from("fraud_reports")
      .update({
        reason: editingReport.reason,
        status: editingReport.status,
      })
      .eq("id", editingReport.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Report updated",
        description: "The report has been updated successfully",
      });
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: `${deleteConfirm.type === "report" ? "Report" : "UPI Identity"} deleted successfully`,
      });
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const handleUpdateUpi = async () => {
    if (!editingUpi) return;

    const { error } = await supabase
      .from("upi_identities")
      .update({
        upi_id: editingUpi.upi_id,
      })
      .eq("id", editingUpi.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "UPI Identity updated",
        description: "The UPI identity has been updated successfully",
      });
      setEditingUpi(null);
      fetchData();
    }
  };

  const handleAddUpi = async () => {
    const upi = newUpi.trim();
    if (!upi) return;

    // Validate UPI ID format
    try {
      upiIdSchema.parse(upi);
    } catch (error) {
      if (error instanceof ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.from("upi_identities").insert({ upi_id: upi });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "UPI added", description: `${upi} added` });
      setNewUpi("");
      fetchData();
    }
  };

  const handleAddReports = async (identity: any) => {
    try {
      const countStr = window.prompt("How many reports to add?", "1");
      if (!countStr) return;
      const count = Number(countStr);
      
      // Validate count
      try {
        addReportsCountSchema.parse(count);
      } catch (error) {
        if (error instanceof ZodError) {
          toast({
            title: "Validation Error",
            description: error.errors[0].message,
            variant: "destructive",
          });
          return;
        }
      }
      
      const reason = window.prompt("Reason for these reports?", "Admin manual addition") || "Admin manual addition";
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Auth required", description: "Sign in as admin", variant: "destructive" });
        return;
      }
      type NewReport = { upi_identity_id: string; user_id: string; reason: string; status: 'open' | 'resolved' | 'rejected' };
      const payload: NewReport[] = Array.from({ length: count }).map(() => ({
        upi_identity_id: identity.id as string,
        user_id: user.id as string,
        reason,
        status: 'open',
      }));
      const { error } = await supabase.from("fraud_reports").insert(payload);
      if (error) throw error;
      toast({ title: "Reports added", description: `${count} report(s) added to ${identity.upi_id}` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add reports", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Admin Panel
        </h1>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="reports">Fraud Reports</TabsTrigger>
            <TabsTrigger value="identities">UPI Identities</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <GlassCard className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.upi_identities?.upi_id}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {report.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              report.status === "resolved"
                                ? "secondary"
                                : report.status === "rejected"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            {report.status === "open" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveReport(report.id)}
                                >
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectReport(report.id)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingReport(report)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirm({ type: "report", id: report.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="identities">
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Input
                  placeholder="Add UPI ID (e.g., user@bank)"
                  value={newUpi}
                  onChange={(e) => setNewUpi(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={handleAddUpi}>Add UPI</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upiIdentities.map((identity) => (
                      <TableRow key={identity.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{identity.upi_id}</span>
                            <Badge variant="outline">{reportCounts[identity.id] || 0} reports</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(identity.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(identity.last_seen_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddReports(identity)}
                            >
                              Add Reports
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUpi(identity)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirm({ type: "upi", id: identity.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                  onChange={(e) => setEditingReport({ ...editingReport, reason: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full px-3 py-2 bg-secondary/50 border border-white/10 rounded-md"
                  value={editingReport?.status || "open"}
                  onChange={(e) => setEditingReport({ ...editingReport, status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingReport(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateReport}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit UPI Dialog */}
        <Dialog open={!!editingUpi} onOpenChange={() => setEditingUpi(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit UPI Identity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">UPI ID</label>
                <Input
                  value={editingUpi?.upi_id || ""}
                  onChange={(e) => setEditingUpi({ ...editingUpi, upi_id: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUpi(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUpi}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete this {deleteConfirm?.type === "report" ? "report" : "UPI identity"}? 
              This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteItem}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
