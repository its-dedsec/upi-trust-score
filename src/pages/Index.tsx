import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { TopLeaderboard } from "@/components/TopLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Users, TrendingUp, Check, ArrowRight, Search, AlertTriangle, Star, Zap } from "lucide-react";

const Index = () => {
  const [stats, setStats] = useState({ totalVerifications: 0, totalReports: 0, totalUsers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [verifications, reports, users] = await Promise.all([
        supabase.from("verifications").select("id", { count: "exact", head: true }),
        supabase.from("fraud_reports").select("id", { count: "exact", head: true }),
        supabase.from("user_stats").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        totalVerifications: verifications.count || 0,
        totalReports: reports.count || 0,
        totalUsers: users.count || 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10 animate-gradient" />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(200,160,57,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(200,160,57,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left content */}
              <div className="animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Trusted by {stats.totalUsers.toLocaleString()}+ users</span>
                </div>
                
                <h1 className="text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                  Verify Before
                  <br />
                  You <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Pay</span>
                </h1>
                
                <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
                  Community-powered UPI ID verification platform. Check any UPI ID's safety score instantly and protect yourself from fraud.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth">
                    <Button size="lg" className="shadow-glow transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] text-base px-8 h-14 w-full sm:w-auto">
                      Get Started Free
                      <ArrowRight className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                  <Link to="/verify-upi">
                    <Button size="lg" variant="outline" className="transition-all duration-300 hover:scale-105 text-base px-8 h-14 w-full sm:w-auto">
                      <Search className="h-5 w-5 mr-1" />
                      Verify a UPI ID
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right visual - Shield with stats */}
              <div className="hidden lg:flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-[80px]" />
                  <div className="relative bg-gradient-to-br from-primary via-accent to-primary p-10 rounded-[2rem] shadow-glow">
                    <Shield className="h-24 w-24 text-background" strokeWidth={2} />
                    <div className="absolute -bottom-3 -right-3 bg-background rounded-full p-2.5 border-4 border-primary shadow-lg">
                      <Check className="h-8 w-8 text-primary" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                
                {/* Mini stat cards around shield */}
                <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-sm">
                  <GlassCard className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{stats.totalVerifications.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">Verifications</div>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <div className="text-2xl font-bold text-destructive">{stats.totalReports.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">Frauds Found</div>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <div className="text-2xl font-bold text-accent">{stats.totalUsers.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">Active Users</div>
                  </GlassCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Three simple steps to verify any UPI ID</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: 1, icon: Search, title: "Enter UPI ID", desc: "Type or scan a QR code to enter the UPI ID you want to verify" },
            { step: 2, icon: Shield, title: "Get Safety Score", desc: "Our algorithm analyzes community reports and votes to calculate risk" },
            { step: 3, icon: Check, title: "Pay Safely", desc: "Proceed with confidence knowing the UPI ID's trust level" },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="relative group">
              <GlassCard className="p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-glow h-full" hover>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-background font-bold flex items-center justify-center text-sm shadow-glow">
                  {step}
                </div>
                <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center mb-5 mt-2 transition-transform duration-300 group-hover:rotate-6">
                  <Icon className="h-7 w-7 text-background" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </GlassCard>
              {step < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/10 to-transparent" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why VeriPay?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Built for the community, by the community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Instant Verification", desc: "Get real-time safety scores for any UPI ID", glow: "hover:shadow-glow", gradient: "bg-gradient-primary" },
              { icon: Users, title: "Community Driven", desc: "Powered by reports and votes from real users", glow: "hover:shadow-glow-success", gradient: "bg-gradient-success" },
              { icon: Lock, title: "Secure & Private", desc: "Your data is protected with enterprise-grade security", glow: "hover:shadow-glow-warning", gradient: "bg-gradient-warning" },
              { icon: TrendingUp, title: "Real-time Analytics", desc: "Track fraud trends and safety metrics live", glow: "hover:shadow-glow-danger", gradient: "bg-gradient-danger" },
            ].map(({ icon: Icon, title, desc, glow, gradient }) => (
              <GlassCard key={title} className={`p-8 text-center transition-all duration-300 hover:scale-105 ${glow}`} hover>
                <div className={`h-14 w-14 mx-auto rounded-2xl ${gradient} flex items-center justify-center mb-5 transition-transform duration-300 hover:rotate-12`}>
                  <Icon className="h-7 w-7 text-background" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* Top Leaderboard Section */}
      <TopLeaderboard />

      {/* Trust indicators */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Star, label: "Community Rated", value: "4.8/5 Trust Score" },
              { icon: AlertTriangle, label: "Frauds Prevented", value: `${stats.totalReports}+ Reports Filed` },
              { icon: Shield, label: "Verifications Done", value: `${stats.totalVerifications}+ Checks` },
            ].map(({ icon: Icon, label, value }) => (
              <GlassCard key={label} className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                  <div className="font-bold text-foreground">{value}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <GlassCard className="p-12 md:p-16 text-center max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="relative z-10">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
              <Shield className="h-8 w-8 text-background" />
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Ready to verify UPI IDs safely?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Join our growing community of users protecting each other from UPI fraud
            </p>
            <Link to="/auth">
              <Button size="lg" className="shadow-glow text-base px-10 h-14 transition-all duration-300 hover:scale-105">
                Create Free Account
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold">VERI<span className="text-primary">PAY</span></span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 VeriPay. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/verify-upi" className="text-sm text-muted-foreground hover:text-primary transition-colors">Verify</Link>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
