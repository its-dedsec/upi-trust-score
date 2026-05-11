import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Settings,
  Trophy,
  UserCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function Navigation() {
  const location = useLocation();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error signing out", description: error.message, variant: "destructive" });
    } else {
      window.location.href = "/auth";
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const items: NavItem[] = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/verify-upi", label: "Verify", icon: Shield },
    { to: "/report-fraud", label: "Report", icon: AlertTriangle },
    { to: "/leaderboard", label: "Ranks", icon: Trophy },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Settings } as NavItem] : []),
    { to: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <>
      {/* Top Bar — Apple-style translucent */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-glass safe-top">
        <div className="container mx-auto px-4">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold tracking-tight">
                VERI<span className="text-primary">PAY</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {items.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}>
                  <Button
                    variant={isActive(to) ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2 rounded-full px-4 h-9",
                      isActive(to) && "font-semibold"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="rounded-full"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar — iOS-style */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-glass safe-bottom"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {items.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-[22px] w-[22px]", active && "scale-110")} />
                <span className="text-[10px] font-medium tracking-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
