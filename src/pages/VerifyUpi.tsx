import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { extractUpiId, createPaymentDeepLink, getRiskLevelBadge } from "@/lib/upi";
import { Upload, Shield, ThumbsUp, ThumbsDown, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import jsQR from "jsqr";

interface VerificationResult {
  upiId: string;
  score: number;
  level: string;
  reason: string;
  totalReports: number;
  lastSeen: string;
}

export default function VerifyUpi() {
  const [upiInput, setUpiInput] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to verify UPI IDs",
          variant: "destructive",
        });
        return;
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

      // Fetch reports and verifications for scoring
      const [reportsRes, verificationsRes, votesRes] = await Promise.all([
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

      const reports30d = reportsRes.data?.length || 0;
      const verifications30d = verificationsRes.data?.length || 0;
      const unsafeVotes = votesRes.data?.filter(v => v.vote === "unsafe").length || 0;

      // Compute score
      let score = 100;
      score -= Math.min(reports30d * 10, 60);
      const unsafeRatio = verifications30d > 0 ? unsafeVotes / verifications30d : 0;
      score -= Math.round(unsafeRatio * 30);

      if (reports30d === 0 && verifications30d >= 3) {
        score = Math.min(score + 5, 100);
      }

      score = Math.max(0, Math.min(100, score));

      const level = score >= 76 ? "low" : score >= 40 ? "medium" : "high";
      const reason =
        reports30d === 0 && verifications30d >= 3
          ? "No reports, multiple verifications - low risk"
          : reports30d > 0
          ? `${reports30d} reports in last 30 days`
          : "Insufficient data";

      // Save verification
      await supabase.from("verifications").insert({
        upi_identity_id: upiIdentity.id,
        user_id: user.id,
        risk_score: score,
        risk_level: level,
        reason,
      });

      // Update last seen
      await supabase
        .from("upi_identities")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", upiIdentity.id);

      setResult({
        upiId: extractedUpi,
        score,
        level,
        reason,
        totalReports: reports30d,
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Verify UPI ID
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GlassCard className="p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="upiInput">UPI ID or Payment Link</Label>
                <Input
                  id="upiInput"
                  placeholder="user@bank or upi://pay?pa=..."
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qrUpload">Or Upload QR Code</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="qrUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="bg-secondary/50"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Verifying..." : "Verify UPI ID"}
              </Button>
            </div>
          </GlassCard>

          {result && (
            <GlassCard className="p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{result.upiId}</h2>
                  <Badge variant={getRiskLevelBadge(result.level)}>
                    {result.level.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Safety Score</span>
                      <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{result.score}/100</span>
                    </div>
                    <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all duration-500 ${
                          result.level === "low"
                            ? "bg-gradient-success shadow-glow-success"
                            : result.level === "medium"
                            ? "bg-gradient-warning shadow-glow-warning"
                            : "bg-gradient-danger shadow-glow-danger"
                        }`}
                        style={{ width: `${result.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-danger/10 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <p className="text-xs text-muted-foreground">Total Reports</p>
                      </div>
                      <p className="text-3xl font-bold text-destructive">{result.totalReports}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-info/10 border border-info/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-info" />
                        <p className="text-xs text-muted-foreground">Last Seen</p>
                      </div>
                      <p className="text-sm font-bold text-info">
                        {new Date(result.lastSeen).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-primary/10 border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-primary mb-1">Analysis</p>
                        <p className="text-sm text-foreground">{result.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {result.level === "low" && (
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <p className="text-sm font-medium">Quick Pay</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(createPaymentDeepLink(result.upiId, "gpay"))}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        GPay
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(createPaymentDeepLink(result.upiId, "phonepe"))}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        PhonePe
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(createPaymentDeepLink(result.upiId, "paytm"))}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Paytm
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleVote("safe")}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Safe
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleVote("unsafe")}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Unsafe
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
