import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertRewardSchema } from "@shared/schema";
import { Users, Gift, Coins, TrendingUp, Download, Plus, Clock, AlertTriangle, KeyRound } from "lucide-react";
import { z } from "zod";
import Navbar from "@/components/Navbar";

const createRewardSchema = insertRewardSchema.extend({
  pointsCost: z.number().min(1, "Points cost must be at least 1"),
});

type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: any;
  performedBy: string | null;
  performedByType: string;
  performedByEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
};

function AuditLogPanel() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const params = new URLSearchParams();
  if (actionFilter !== "all") params.set("action", actionFilter);
  params.set("limit", "200");
  const url = `/api/admin/audit-logs?${params.toString()}`;

  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/admin/audit-logs", actionFilter],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json();
    },
  });

  const fmtAction = (a: string) =>
    a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Audit Log</CardTitle>
        <div className="w-56">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger data-testid="select-audit-action">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="reset_contact">Reset contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No log entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const before = log.changes?.before ?? {};
                  const after = log.changes?.after ?? {};
                  const reason = log.changes?.reason as string | null | undefined;
                  const fields = Array.from(
                    new Set([...Object.keys(before), ...Object.keys(after)])
                  );
                  return (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{fmtAction(log.action)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-900">
                          {log.performedByEmail || "—"}
                        </div>
                        <div className="text-xs text-gray-500">{log.performedByType}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityType}/{log.entityId.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-sm">
                        {fields.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="space-y-1">
                            {fields.map((f) => (
                              <div key={f} className="text-xs">
                                <span className="font-medium">{f}:</span>{" "}
                                <span className="text-red-600 line-through">
                                  {String((before as any)[f] ?? "∅")}
                                </span>{" "}
                                →{" "}
                                <span className="text-green-700">
                                  {String((after as any)[f] ?? "∅")}
                                </span>
                              </div>
                            ))}
                            {reason && (
                              <div className="text-xs text-gray-500 italic">
                                Reason: {reason}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 font-mono">
                        {log.ipAddress || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CreateRewardFormData = z.infer<typeof createRewardSchema>;

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetReason, setResetReason] = useState("");

  const openResetDialog = (user: any) => {
    setResetTarget(user);
    setResetEmail(user.email ?? "");
    setResetPhone(user.phoneNumber ?? "");
    setResetReason("");
  };
  const closeResetDialog = () => {
    setResetTarget(null);
    setResetEmail("");
    setResetPhone("");
    setResetReason("");
  };

  const resetContactMutation = useMutation({
    mutationFn: async (vars: { userId: string; email?: string; phoneNumber?: string; reason?: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${vars.userId}/reset-contact`, {
        email: vars.email,
        phoneNumber: vars.phoneNumber,
        reason: vars.reason,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contact updated", description: "The customer can now sign in with the new details." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      closeResetDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update contact", description: error.message, variant: "destructive" });
    },
  });

  const { data: adminStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: allRewards = [] } = useQuery({
    queryKey: ["/api/admin/rewards"],
  });

  const form = useForm<CreateRewardFormData>({
    resolver: zodResolver(createRewardSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsCost: 100,
      category: "food",
      imageUrl: "",
      isActive: true,
    },
  });

  const createRewardMutation = useMutation({
    mutationFn: async (data: CreateRewardFormData) => {
      return await apiRequest("POST", "/api/admin/rewards", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Reward created successfully.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deactivateRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest("DELETE", `/api/admin/rewards/${rewardId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Reward deactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runExpiryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/run-expiry", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Expiry Run Complete",
        description: `Processed ${data.processed} users. ${data.expired} had points expired.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitReward = (data: CreateRewardFormData) => {
    createRewardMutation.mutate(data);
  };

  const handleDeactivateReward = (rewardId: string) => {
    deactivateRewardMutation.mutate(rewardId);
  };

  const filteredUsers = allUsers.filter((user: any) =>
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMembershipBadge = (tier: string) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
    };
    return colors[tier as keyof typeof colors] || colors.bronze;
  };

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h2>
          <p className="text-gray-600">Manage loyalty program and customer data</p>
        </div>
        <Badge variant="destructive" data-testid="badge-admin-access">
          Admin Access
        </Badge>
      </div>

      {/* Admin Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Customers</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-total-customers">
                  {adminStats?.totalCustomers || 0}
                </p>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                <Users className="text-primary h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Rewards</p>
                <p className="text-3xl font-bold text-accent" data-testid="text-active-rewards">
                  {adminStats?.activeRewards || 0}
                </p>
              </div>
              <div className="bg-accent bg-opacity-10 p-3 rounded-lg">
                <Gift className="text-accent h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Points Redeemed</p>
                <p className="text-3xl font-bold text-success" data-testid="text-points-redeemed">
                  {adminStats?.totalPointsRedeemed || 0}
                </p>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-lg">
                <Coins className="text-success h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-monthly-revenue">
                  ${adminStats?.monthlyRevenue || '0.00'}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <TrendingUp className="text-gray-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="customers" data-testid="tab-customers">Customer Management</TabsTrigger>
          <TabsTrigger value="rewards" data-testid="tab-rewards">Rewards Management</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Customer Management Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Customer Management</CardTitle>
              <div className="flex space-x-4">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  data-testid="input-search-customers"
                />
                <Button data-testid="button-export-customers">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Member ID</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No customers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: any) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-gray-900" data-testid={`text-user-name-${user.id}`}>
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-user-id-${user.id}`}>
                            CC-{user.id.slice(-9)}
                          </TableCell>
                          <TableCell data-testid={`text-user-points-${user.id}`}>
                            {user.totalPoints || 0}
                          </TableCell>
                          <TableCell>
                            <Badge className={getMembershipBadge(user.membershipTier || 'bronze')}>
                              {(user.membershipTier || 'bronze').charAt(0).toUpperCase() + (user.membershipTier || 'bronze').slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {user.memberSince ? new Date(user.memberSince).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-user-${user.id}`}>
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openResetDialog(user)}
                                data-testid={`button-reset-contact-${user.id}`}
                              >
                                <KeyRound className="mr-1 h-3.5 w-3.5" />
                                Reset contact
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" data-testid={`button-deactivate-user-${user.id}`}>
                                Deactivate
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Management Tab */}
        <TabsContent value="rewards">
          <div className="space-y-6">
            {/* Add New Reward Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Reward</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitReward)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reward Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Free Coffee" data-testid="input-reward-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pointsCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points Cost</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="200"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-points-cost"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-reward-category">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="food">Food & Drinks</SelectItem>
                              <SelectItem value="merchandise">Merchandise</SelectItem>
                              <SelectItem value="experiences">Experiences</SelectItem>
                              <SelectItem value="discounts">Discounts</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-end">
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createRewardMutation.isPending}
                        data-testid="button-create-reward"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {createRewardMutation.isPending ? "Creating..." : "Create Reward"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Existing Rewards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allRewards.map((reward: any) => (
                <Card key={reward.id} data-testid={`card-admin-reward-${reward.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900" data-testid={`text-admin-reward-name-${reward.id}`}>
                        {reward.name}
                      </h4>
                      <Badge className={reward.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {reward.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3" data-testid={`text-admin-reward-description-${reward.id}`}>
                      {reward.description || "No description provided"}
                    </p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-primary" data-testid={`text-admin-reward-cost-${reward.id}`}>
                        {reward.pointsCost} pts
                      </span>
                      <span className="text-sm text-gray-500">
                        Redeemed: {reward.redemptionCount} times
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-reward-${reward.id}`}>
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-red-600 hover:text-red-900"
                        onClick={() => handleDeactivateReward(reward.id)}
                        disabled={deactivateRewardMutation.isPending}
                        data-testid={`button-deactivate-reward-${reward.id}`}
                      >
                        {deactivateRewardMutation.isPending ? "..." : "Deactivate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6 h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <TrendingUp className="mx-auto h-12 w-12 mb-2" />
                  <p className="font-medium">Points Redemption Trends</p>
                  <p className="text-sm">Chart implementation needed</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Users className="mx-auto h-12 w-12 mb-2" />
                  <p className="font-medium">Customer Engagement</p>
                  <p className="text-sm">Chart implementation needed</p>
                </div>
              </CardContent>
            </Card>

            {/* Points Expiry Management */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3C3C3B]">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Points Expiry Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      Points expire after <span className="font-semibold">12 months of inactivity</span>. 
                      Running this will immediately expire points for all users whose activity deadline has passed.
                      Users are warned 30 days in advance on their dashboard.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 w-fit">
                      <AlertTriangle className="h-3 w-3" />
                      This action is irreversible — expired points cannot be restored.
                    </div>
                  </div>
                  <Button
                    onClick={() => runExpiryMutation.mutate()}
                    disabled={runExpiryMutation.isPending}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 whitespace-nowrap"
                  >
                    {runExpiryMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Running...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Run Points Expiry Now
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <AuditLogPanel />
        </TabsContent>
      </Tabs>
      </div>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && closeResetDialog()}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-reset-contact">
          <DialogHeader>
            <DialogTitle>Reset contact details</DialogTitle>
            <DialogDescription>
              Change this customer's email or phone if they've lost access. They'll be marked as verified
              and can sign in with the new details immediately. This action is logged.
            </DialogDescription>
          </DialogHeader>

          {resetTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">
                  {resetTarget.firstName} {resetTarget.lastName}
                </div>
                <div className="text-gray-500">
                  Current email: {resetTarget.email || "—"}
                </div>
                <div className="text-gray-500">
                  Current phone: {resetTarget.phoneNumber || "—"}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-email">New email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="customer@example.com"
                  data-testid="input-reset-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-phone">New phone (+27 or 0…)</Label>
                <Input
                  id="reset-phone"
                  type="tel"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="+27821234567"
                  data-testid="input-reset-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-reason">Reason (for the audit log)</Label>
                <Textarea
                  id="reset-reason"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Customer lost access to old phone number, verified ID over the phone."
                  rows={3}
                  data-testid="input-reset-reason"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeResetDialog} data-testid="button-reset-cancel">
              Cancel
            </Button>
            <Button
              onClick={() =>
                resetTarget &&
                resetContactMutation.mutate({
                  userId: resetTarget.id,
                  email: resetEmail.trim() || undefined,
                  phoneNumber: resetPhone.trim() || undefined,
                  reason: resetReason.trim() || undefined,
                })
              }
              disabled={resetContactMutation.isPending}
              data-testid="button-reset-confirm"
            >
              {resetContactMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
