import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { extractUpiId, createPaymentDeepLink, getRiskLevelBadge } from "@/lib/upi";
import { Upload, Shield, ShieldCheck, ShieldAlert, ShieldX, ThumbsUp, ThumbsDown, ExternalLink, AlertTriangle, Search, QrCode, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsQR from "jsqr";
import { upiIdSchema } from "@/lib/validation";
import { ZodError } from "zod";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface VerificationResult {
  upiId: string;
  score: number;
  level: string;
  reason: string;
  totalReports: number;
  lastSeen: string;
}

export default function VerifyUpi() {
  const { isLoading: authLoading, isAuthorized } = useAuthGuard();
  const [upiInput, setUpiInput] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState<"safe" | "unsafe" | null>(null);
  const { toast } = useToast();

  if (authLoading || !isAuthorized) {
    return null;
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const extracted = extractUpiId(code.data);
            if (extracted) {
              setUpiInput(extracted);
              toast({ title: "QR parsed", description: `UPI ID: ${extracted}` });
            } else {
              toast({ title: "No UPI found", description: "QR didn't contain a valid UPI 'pa' param", variant: "destructive" });
            }
          } else {
            toast({ title: "Decode failed", description: "Couldn't read a QR code from the image", variant: "destructive" });
          }
        };
        img.onerror = () => {
          toast({ title: "Invalid image", description: "Please upload a valid QR image", variant: "destructive" });
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        toast({ title: "Read error", description: "Failed to read the image file", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ title: "QR error", description: err.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleVerify = async () => {
    if (!upiInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a UPI ID or upload a QR code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setVoted(null);
    const extractedUpi = extractUpiId(upiInput);
    
    if (!extractedUpi) {
      toast({
        title: "Invalid UPI",
        description: "Could not extract UPI ID from input",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      upiIdSchema.parse(extractedUpi);
    } catch (error) {
      if (error instanceof ZodError) {
        toast({
          title: "Invalid UPI ID",
          description: error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      throw error;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to verify UPI IDs",
          variant: "destructive",
        });
        return;
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

      const [allReportsRes, reportsRes, verificationsRes, votesRes] = await Promise.all([
        supabase
          .from("fraud_reports")
          .select("id")
          .eq("upi_identity_id", upiIdentity.id),
        supabase
          .from("fraud_reports")
          .select("*")
          .eq("upi_identity_id", upiIdentity.id)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("verifications")
          .select("*")
          .eq("upi_identity_id", upiIdentity.id)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("verification_votes")
          .select("vote, verifications!inner(upi_identity_id)")
          .eq("verifications.upi_identity_id", upiIdentity.id)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const totalReports = allReportsRes.data?.length || 0;
      const reports30d = reportsRes.data?.length || 0;
      const verifications30d = verificationsRes.data?.length || 0;
      const unsafeVotes = votesRes.data?.filter(v => v.vote === "unsafe").length || 0;

      let score = 100;
      score -= Math.min(totalReports * 5, 70);
      score -= Math.min(reports30d * 3, 20);
      const unsafeRatio = verifications30d > 0 ? unsafeVotes / verifications30d : 0;
      score -= Math.round(unsafeRatio * 20);

      if (totalReports === 0 && verifications30d >= 3) {
        score = Math.min(score + 5, 100);
      }

      score = Math.max(0, Math.min(100, score));

      const level = score >= 76 ? "low" : score >= 40 ? "medium" : "high";
      const reason =
        totalReports === 0 && verifications30d >= 3
          ? "No reports, multiple verifications - low risk"
          : totalReports > 0
          ? `${totalReports} total reports (${reports30d} in last 30 days)`
          : "Insufficient data";

      await supabase.from("verifications").insert({
        upi_identity_id: upiIdentity.id,
        user_id: user.id,
        risk_score: score,
        risk_level: level,
        reason,
      });

      await supabase
        .from("upi_identities")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", upiIdentity.id);

      setResult({
        upiId: extractedUpi,
        score,
        level,
        reason,
        totalReports: totalReports,
        lastSeen: upiIdentity.last_seen_at,
      });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote: "safe" | "unsafe") => {
    if (!result) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: upiIdentity } = await supabase
        .from("upi_identities")
        .select("id")
        .eq("upi_id", result.upiId)
        .single();

      if (!upiIdentity) return;

      const { data: verification } = await supabase
        .from("verifications")
        .select("id")
        .eq("upi_identity_id", upiIdentity.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!verification) return;

      const { error } = await supabase
        .from("verification_votes")
        .insert({
          verification_id: verification.id,
          user_id: user.id,
          vote,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already voted",
            description: "You've already voted on this verification",
          });
        } else {
          throw error;
        }
      } else {
        setVoted(vote);
        toast({
          title: "Vote recorded",
          description: `Marked as ${vote}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 76) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreBarClass = (level: string) => {
    if (level === "low") return "bg-gradient-success shadow-glow-success";
    if (level === "medium") return "bg-gradient-warning shadow-glow-warning";
    return "bg-gradient-danger shadow-glow-danger";
  };

  const getRiskIcon = (level: string) => {
    if (level === "low") return <ShieldCheck className="h-8 w-8 text-success" />;
    if (level === "medium") return <ShieldAlert className="h-8 w-8 text-warning" />;
    return <ShieldX className="h-8 w-8 text-destructive" />;
  };

  const getRiskLabel = (level: string) => {
    if (level === "low") return "Low Risk — Likely Safe";
    if (level === "medium") return "Medium Risk — Use Caution";
    return "High Risk — Potentially Fraudulent";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Verify UPI ID
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Check any UPI ID or scan a QR code to get an instant safety score before you pay.
          </p>
        </div>

        {/* Input Card */}
        <GlassCard className="p-6 md:p-8 mb-8 animate-fade-in" hover>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="upiInput" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                UPI ID or Payment Link
              </Label>
              <div className="flex gap-3">
                <Input
                  id="upiInput"
                  placeholder="e.g. user@bank or upi://pay?pa=..."
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="bg-secondary/50 flex-1 h-12 text-base"
                />
                <Button
                  onClick={handleVerify}
                  disabled={loading}
                  size="lg"
                  className="h-12 px-6 gap-2"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {loading ? "Checking..." : "Verify"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div>
              <Label htmlFor="qrUpload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-secondary/20">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Upload a QR Code image to auto-extract UPI ID
                  </span>
                </div>
              </Label>
              <Input
                id="qrUpload"
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="hidden"
              />
            </div>
          </div>
        </GlassCard>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Score Hero */}
            <GlassCard className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Score Circle */}
                <div className="relative flex-shrink-0">
                  <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${
                    result.level === "low" ? "border-success/40 bg-success/5" :
                    result.level === "medium" ? "border-warning/40 bg-warning/5" :
                    "border-destructive/40 bg-destructive/5"
                  }`}>
                    <span className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                      {result.score}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="flex flex-col md:flex-row items-center gap-3">
                    {getRiskIcon(result.level)}
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{result.upiId}</h2>
                      <p className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                        {getRiskLabel(result.level)}
                      </p>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="w-full">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${getScoreBarClass(result.level)}`}
                        style={{ width: `${result.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Reports</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{result.totalReports}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.totalReports === 0 ? "No fraud reports filed" : "Fraud reports on record"}
                </p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Shield className="h-4 w-4 text-info" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Seen</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {new Date(result.lastSeen).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Last verification date</p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Analysis</span>
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed">{result.reason}</p>
              </GlassCard>
            </div>

            {/* Quick Pay */}
            {result.level === "low" && (
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-foreground">Quick Pay — This UPI ID looks safe</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "GPay", app: "gpay" as const },
                    { label: "PhonePe", app: "phonepe" as const },
                    { label: "Paytm", app: "paytm" as const },
                  ].map(({ label, app }) => (
                    <Button
                      key={app}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(createPaymentDeepLink(result.upiId, app))}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {label}
                    </Button>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Community Vote */}
            <GlassCard className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Community Feedback</h3>
              <p className="text-xs text-muted-foreground mb-4">Help others — did this UPI ID feel safe or suspicious to you?</p>
              <div className="flex gap-3">
                <Button
                  variant={voted === "safe" ? "default" : "outline"}
                  className={`flex-1 gap-2 ${voted === "safe" ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
                  onClick={() => handleVote("safe")}
                  disabled={voted !== null}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Safe
                </Button>
                <Button
                  variant={voted === "unsafe" ? "default" : "outline"}
                  className={`flex-1 gap-2 ${voted === "unsafe" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
                  onClick={() => handleVote("unsafe")}
                  disabled={voted !== null}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Unsafe
                </Button>
              </div>
              {voted && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Thanks for your feedback! Your vote helps keep the community safe.
                </p>
              )}
            </GlassCard>
          </div>
        )}

        {/* Empty state hint */}
        {!result && !loading && (
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/50 mb-4">
              <Shield className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              Enter a UPI ID above to check its safety score
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
