import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { Shield, Check, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [diagnosticHint, setDiagnosticHint] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const clearSupabaseAuthStorage = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("auth-token"))
      .forEach((key) => localStorage.removeItem(key));
  };

  const resetLocalAuthState = async () => {
    await supabase.auth.signOut({ scope: "local" });
    clearSupabaseAuthStorage();
  };

  const isNetworkFetchError = (error: unknown) => {
    if (error instanceof TypeError && error.message === "Failed to fetch") return true;
    if (typeof error === "object" && error && "name" in error) {
      return (error as { name?: string }).name === "AuthRetryableFetchError";
    }
    return false;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkUser();
      } catch {
        // Keep auth screen usable even if initial session fetch fails.
      }
    };

    void initializeAuth();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate("/dashboard");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Please check your email to confirm your account.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate("/dashboard");
      }
    } catch (error: any) {
      if (isNetworkFetchError(error)) {
        await resetLocalAuthState();
        setDiagnosticHint("Cannot reach Supabase from this browser. Disable VPN/adblock, or try another network.");
        toast({
          title: "Network error",
          description: "Could not reach Supabase. Local auth cache was reset—please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(200,160,57,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(200,160,57,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px]" />
            <div className="relative bg-gradient-to-br from-primary via-accent to-primary p-8 rounded-3xl shadow-glow">
              <Shield className="h-20 w-20 text-background" strokeWidth={2} />
              <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-2 border-4 border-primary">
                <Check className="h-7 w-7 text-primary" strokeWidth={3} />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-4">
            VERI<span className="text-primary">PAY</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Community-powered UPI verification. Protect yourself from fraud with trusted safety scores.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {[
              { label: "Secure", icon: Lock },
              { label: "Instant", icon: ArrowRight },
              { label: "Trusted", icon: Shield },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="relative mb-4">
              <div className="bg-gradient-to-br from-primary via-accent to-primary p-5 rounded-2xl shadow-glow">
                <Shield className="h-10 w-10 text-background" strokeWidth={2} />
              </div>
            </div>
            <h1 className="text-3xl font-bold">
              VERI<span className="text-primary">PAY</span>
            </h1>
          </div>

          <GlassCard className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {isSignUp ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isSignUp
                  ? "Join the community protecting users from UPI fraud"
                  : "Sign in to continue to VeriPay"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary/50 pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-secondary/50 pl-10 pr-10 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base shadow-glow transition-all duration-300 hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isSignUp ? "Creating account..." : "Signing in..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {diagnosticHint && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">{diagnosticHint}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await resetLocalAuthState();
                    setDiagnosticHint(null);
                    toast({ title: "Done", description: "Local auth cache reset. Try signing in again." });
                  }}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Reset auth cache again
                </button>
              </div>
            )}

            <div className="mt-6 text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">or</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </GlassCard>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
