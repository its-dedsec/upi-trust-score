import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Shield, Lock, Users, TrendingUp, Check } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-background via-secondary/20 to-background">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/15 animate-gradient" />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(200,160,57,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(200,160,57,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="relative bg-gradient-to-br from-primary via-accent to-primary p-8 rounded-3xl shadow-glow">
                  <Shield className="h-20 w-20 text-background" strokeWidth={2.5} />
                  <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-2 border-4 border-primary">
                    <Check className="h-8 w-8 text-primary" strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
            <h1 className="text-7xl font-bold mb-6 text-foreground">
              VERI<span className="text-primary">PAY</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Community-powered UPI ID verification. Verify before you pay. Stay safe from fraud.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="shadow-glow transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)]">
                  Get Started
                </Button>
              </Link>
              <Link to="/verify-upi">
                <Button size="lg" variant="outline" className="transition-all duration-300 hover:scale-105">
                  Verify a UPI ID
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-glow" hover>
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 transition-transform duration-300 hover:rotate-12">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Instant Verification</h3>
            <p className="text-muted-foreground">
              Get real-time safety scores for any UPI ID
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-glow-success" hover>
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-success flex items-center justify-center mb-4 transition-transform duration-300 hover:rotate-12">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Community Driven</h3>
            <p className="text-muted-foreground">
              Powered by reports and votes from real users
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-glow-warning" hover>
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-warning flex items-center justify-center mb-4 transition-transform duration-300 hover:rotate-12">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Your data is protected with enterprise-grade security
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-glow-danger" hover>
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-danger flex items-center justify-center mb-4 transition-transform duration-300 hover:rotate-12">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-time Analytics</h3>
            <p className="text-muted-foreground">
              Track fraud trends and safety metrics in real-time
            </p>
          </GlassCard>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <GlassCard className="p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">
            Ready to verify UPI IDs safely?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users protecting themselves from UPI fraud
          </p>
          <Link to="/auth">
            <Button size="lg" className="shadow-glow">
              Create Free Account
            </Button>
          </Link>
        </GlassCard>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 VeriPay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
