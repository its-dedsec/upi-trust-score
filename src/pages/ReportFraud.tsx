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
import { CheckCircle, AlertTriangle, FileText, Link2, Send, ShieldAlert, ArrowRight, Info } from "lucide-react";
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
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <GlassCard className="p-10 text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Report Submitted</h1>
            <p className="text-muted-foreground mb-2 text-sm">
              Your fraud report has been received and will be reviewed by our team.
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              You earned <span className="text-primary font-semibold">+10 points</span> for this contribution!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate(`/verify-upi?upi=${extractUpiId(upiId)}`)}
                className="gap-2"
              >
                View UPI Details
                <ArrowRight className="h-4 w-4" />
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
    );
  }

  const filledSteps = [upiId.trim(), reason.trim(), details.trim()].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Report Fraud
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Help protect the community by reporting suspicious UPI IDs. Every report counts.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                filledSteps >= step
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
                  filledSteps > step ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>

        <GlassCard className="p-6 md:p-8 animate-fade-in" hover>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* UPI ID */}
            <div className="space-y-2">
              <Label htmlFor="upiId" className="text-sm font-medium flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">1</span>
                </div>
                UPI ID
              </Label>
              <Input
                id="upiId"
                placeholder="e.g. scammer@bank or upi://pay?pa=..."
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                className="bg-secondary/50 h-12"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">2</span>
                </div>
                Reason
              </Label>
              <Input
                id="reason"
                placeholder="e.g. Phishing attempt, fake merchant, money not received..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="bg-secondary/50 h-12"
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {["Phishing", "Fake merchant", "Money not received", "Impersonation"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setReason(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      reason === tag
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <Label htmlFor="details" className="text-sm font-medium flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">3</span>
                </div>
                Details
              </Label>
              <Textarea
                id="details"
                placeholder="Describe the fraudulent activity in detail — when it happened, how much was involved, what communication you received..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                required
                rows={5}
                className="bg-secondary/50 resize-none"
              />
            </div>

            {/* Evidence */}
            <div className="space-y-2">
              <Label htmlFor="evidenceUrl" className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Evidence URL
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="evidenceUrl"
                type="url"
                placeholder="https://example.com/screenshot.jpg"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-info/5 border border-info/20">
              <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your report is anonymous to other users. Our team reviews every report to ensure fairness. False reports may result in account penalties.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !upiId.trim() || !reason.trim() || !details.trim()}
              className="w-full h-12 gap-2 text-base"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
