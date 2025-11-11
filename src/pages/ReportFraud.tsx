import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractUpiId } from "@/lib/upi";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fraudReportSchema } from "@/lib/validation";
import { ZodError } from "zod";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ReportFraud() {
  const { isLoading: authLoading, isAuthorized } = useAuthGuard();
  const [upiId, setUpiId] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (authLoading || !isAuthorized) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to report fraud",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const extractedUpi = extractUpiId(upiId);

      // Validate inputs
      try {
        fraudReportSchema.parse({
          upiId: extractedUpi,
          reason,
          details,
          evidenceUrl: evidenceUrl || ''
        });
      } catch (error) {
        if (error instanceof ZodError) {
          toast({
            title: "Validation Error",
            description: error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw error;
      }

      // Get or create UPI identity
      let { data: upiIdentity, error: upiError } = await supabase
        .from("upi_identities")
        .select("*")
        .eq("upi_id", extractedUpi)
        .single();

      if (upiError && upiError.code === "PGRST116") {
        const { data: newIdentity, error: insertError } = await supabase
          .from("upi_identities")
          .insert({ upi_id: extractedUpi })
          .select()
          .single();

        if (insertError) throw insertError;
        upiIdentity = newIdentity;
      } else if (upiError) {
        throw upiError;
      }

      // Create fraud report
      const { error: reportError } = await supabase
        .from("fraud_reports")
        .insert({
          upi_identity_id: upiIdentity.id,
          user_id: user.id,
          reason: `${reason}: ${details}`,
          evidence_url: evidenceUrl || null,
        });

      if (reportError) throw reportError;

      setSubmitted(true);
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep the community safe",
      });
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <GlassCard className="p-12 text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-success flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Report Submitted</h1>
              <p className="text-muted-foreground mb-8">
                Your fraud report has been received and will be reviewed by our team.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate(`/verify-upi?upi=${extractUpiId(upiId)}`)}
                >
                  View UPI Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setUpiId("");
                    setReason("");
                    setDetails("");
                    setEvidenceUrl("");
                  }}
                >
                  Report Another
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Report Fraud
        </h1>

        <div className="max-w-2xl">
          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID *</Label>
                <Input
                  id="upiId"
                  placeholder="user@bank or upi://pay?pa=..."
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Input
                  id="reason"
                  placeholder="E.g., Phishing attempt, fake merchant, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Details *</Label>
                <Textarea
                  id="details"
                  placeholder="Please provide as much detail as possible about the fraudulent activity..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                  rows={6}
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidenceUrl">Evidence URL (Optional)</Label>
                <Input
                  id="evidenceUrl"
                  type="url"
                  placeholder="https://example.com/screenshot.jpg"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="bg-secondary/50"
                />
                <p className="text-xs text-muted-foreground">
                  Upload your evidence to a file hosting service and paste the link here
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
