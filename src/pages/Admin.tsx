import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  const [reports, setReports] = useState<any[]>([]);
  const [upiIdentities, setUpiIdentities] = useState<any[]>([]);
  const { toast } = useToast();

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
                      <TableHead>Actions</TableHead>
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
                          {report.status === "open" && (
                            <div className="flex gap-2">
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
                            </div>
                          )}
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upiIdentities.map((identity) => (
                      <TableRow key={identity.id}>
                        <TableCell className="font-medium">
                          {identity.upi_id}
                        </TableCell>
                        <TableCell>
                          {new Date(identity.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(identity.last_seen_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
