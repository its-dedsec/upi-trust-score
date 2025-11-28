import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { BADGE_CONFIGS } from "@/lib/badges";

interface UserStat {
  id: string;
  user_id: string;
  display_name: string | null;
  badge_level: string;
  points: number;
  total_reports: number;
  total_verifications: number;
  total_votes: number;
}

export const LeaderboardManager = () => {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [editingUser, setEditingUser] = useState<UserStat | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    display_name: "",
    points: 0,
    total_reports: 0,
    total_verifications: 0,
    total_votes: 0,
    badge_level: "rookie",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .order("points", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setUsers(data || []);
  };

  const handleAddUser = async () => {
    if (!newUser.display_name.trim()) {
      toast({
        title: "Error",
        description: "Display name is required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("user_stats").insert({
      user_id: crypto.randomUUID(),
      display_name: newUser.display_name,
      points: newUser.points,
      total_reports: newUser.total_reports,
      total_verifications: newUser.total_verifications,
      total_votes: newUser.total_votes,
      badge_level: newUser.badge_level,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User added",
        description: "New user added to leaderboard",
      });
      setShowAddDialog(false);
      setNewUser({
        display_name: "",
        points: 0,
        total_reports: 0,
        total_verifications: 0,
        total_votes: 0,
        badge_level: "rookie",
      });
      fetchUsers();
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from("user_stats")
      .update({
        display_name: editingUser.display_name,
        points: editingUser.points,
        total_reports: editingUser.total_reports,
        total_verifications: editingUser.total_verifications,
        total_votes: editingUser.total_votes,
        badge_level: editingUser.badge_level,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User updated",
        description: "Leaderboard entry updated successfully",
      });
      setEditingUser(null);
      fetchUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;

    const { error } = await supabase
      .from("user_stats")
      .delete()
      .eq("id", deleteConfirm);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User deleted",
        description: "User removed from leaderboard",
      });
      setDeleteConfirm(null);
      fetchUsers();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Manage Leaderboard</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Verifications</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell className="font-bold">#{index + 1}</TableCell>
                <TableCell className="font-medium">
                  {user.display_name || "Anonymous"}
                </TableCell>
                <TableCell>
                  <BadgeDisplay badgeLevel={user.badge_level} size="sm" />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{user.points}</Badge>
                </TableCell>
                <TableCell>{user.total_reports}</TableCell>
                <TableCell>{user.total_verifications}</TableCell>
                <TableCell>{user.total_votes}</TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={newUser.display_name}
                onChange={(e) =>
                  setNewUser({ ...newUser, display_name: e.target.value })
                }
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Points</label>
              <Input
                type="number"
                value={newUser.points}
                onChange={(e) =>
                  setNewUser({ ...newUser, points: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total Reports</label>
              <Input
                type="number"
                value={newUser.total_reports}
                onChange={(e) =>
                  setNewUser({ ...newUser, total_reports: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total Verifications</label>
              <Input
                type="number"
                value={newUser.total_verifications}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    total_verifications: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total Votes</label>
              <Input
                type="number"
                value={newUser.total_votes}
                onChange={(e) =>
                  setNewUser({ ...newUser, total_votes: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Badge Level</label>
              <Select
                value={newUser.badge_level}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, badge_level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BADGE_CONFIGS.map((badge) => (
                    <SelectItem key={badge.level} value={badge.level}>
                      {badge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={editingUser.display_name || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, display_name: e.target.value })
                  }
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Points</label>
                <Input
                  type="number"
                  value={editingUser.points}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      points: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Reports</label>
                <Input
                  type="number"
                  value={editingUser.total_reports}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      total_reports: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Verifications</label>
                <Input
                  type="number"
                  value={editingUser.total_verifications}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      total_verifications: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Votes</label>
                <Input
                  type="number"
                  value={editingUser.total_votes}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      total_votes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Badge Level</label>
                <Select
                  value={editingUser.badge_level}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, badge_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_CONFIGS.map((badge) => (
                      <SelectItem key={badge.level} value={badge.level}>
                        {badge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this user from the leaderboard?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
