import { useEffect, useState, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Mail, Lock, Eye, EyeOff, Save, Loader2, User } from "lucide-react";

const Profile = () => {
  const { isLoading: authLoading, isAuthorized } = useAuthGuard();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthorized) loadProfile();
  }, [isAuthorized]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? "");
    setUserId(user.id);

    const { data: stats } = await supabase
      .from("user_stats")
      .select("avatar_url, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (stats) {
      setAvatarUrl(stats.avatar_url);
      setDisplayName(stats.display_name ?? "");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Bust cache
      const freshUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("user_stats")
        .update({ avatar_url: freshUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(freshUrl);
      toast({ title: "Avatar updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      // Update display name
      const { error: statsError } = await supabase
        .from("user_stats")
        .update({ display_name: displayName || null })
        .eq("user_id", userId);

      if (statsError) throw statsError;

      // Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast({ title: "Passwords don't match", variant: "destructive" });
          setSaving(false);
          return;
        }

        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
      }

      toast({ title: "Profile saved!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  const initials = (displayName || email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          My Profile
        </h1>

        {/* Avatar Section */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Profile" />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Camera className="h-6 w-6 text-primary" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {displayName || "Set your display name"}
              </h2>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hover over avatar to change photo
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Profile Details */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Details
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email (read-only)
              </Label>
              <Input
                id="email"
                value={email}
                readOnly
                disabled
                className="mt-1 opacity-70"
              />
            </div>
          </div>
        </GlassCard>

        {/* Change Password */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change Password
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            For security, your current password cannot be displayed. You can set a new one below.
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1"
              />
            </div>
          </div>
        </GlassCard>

        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full gap-2"
          size="lg"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default Profile;
