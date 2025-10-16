import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Target, TrendingUp, Users, Calendar, Star, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["points_multiplier", "bonus_points", "tier_upgrade", "cashback"]),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["draft", "active", "completed"]).default("draft"),
  rules: z.object({
    minSpend: z.number().optional(),
    maxRedemptions: z.number().optional(),
    pointsMultiplier: z.number().default(1),
    bonusPoints: z.number().default(0),
  }),
  targetAudience: z.object({
    tiers: z.array(z.string()).optional(),
    minPoints: z.number().optional(),
    maxPoints: z.number().optional(),
  }),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  currentParticipants: number;
  maxParticipants?: number;
  rules: any;
  targetAudience: any;
  createdAt: string;
}

export default function CampaignsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      return await apiRequest("/api/campaigns", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Campaign Created",
        description: "Your campaign has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const activateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return await apiRequest(`/api/campaigns/${campaignId}/activate`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Activated",
        description: "The campaign is now active and running.",
      });
    },
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      status: "draft",
      rules: {
        pointsMultiplier: 1,
        bonusPoints: 0,
      },
      targetAudience: {},
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    createCampaignMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "draft": return "bg-yellow-500";
      case "completed": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case "points_multiplier": return <Star className="h-4 w-4" />;
      case "bonus_points": return <Plus className="h-4 w-4" />;
      case "tier_upgrade": return <TrendingUp className="h-4 w-4" />;
      case "cashback": return <Target className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const campaigns = campaignsData?.campaigns || [];

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6" data-testid="campaigns-page">
          {/* Header */}
          <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaign Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Create and manage marketing campaigns to drive customer engagement</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign" className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new marketing campaign to engage your customers
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-campaign-name" placeholder="Summer Points Boost" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-campaign-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="points_multiplier">Points Multiplier</SelectItem>
                            <SelectItem value="bonus_points">Bonus Points</SelectItem>
                            <SelectItem value="tier_upgrade">Tier Upgrade</SelectItem>
                            <SelectItem value="cashback">Cashback</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-campaign-description" placeholder="Describe your campaign..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rules.pointsMultiplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Multiplier</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.1"
                            data-testid="input-points-multiplier"
                            onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rules.bonusPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonus Points</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            data-testid="input-bonus-points"
                            onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-campaign"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCampaignMutation.isPending}
                    data-testid="button-submit-campaign"
                    className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-campaigns">{campaigns.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-active-campaigns">
              {campaigns.filter((c: Campaign) => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-participants">
              {campaigns.reduce((sum: number, c: Campaign) => sum + (c.currentParticipants || 0), 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-month-campaigns">
              {campaigns.filter((c: Campaign) => {
                const created = new Date(c.createdAt);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-campaigns">All Campaigns</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active-campaigns">Active</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft-campaigns">Draft</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-campaigns">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign: Campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCampaignTypeIcon(campaign.type)}
                      <CardTitle className="text-lg" data-testid={`campaign-title-${campaign.id}`}>{campaign.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(campaign.status)} data-testid={`campaign-status-${campaign.id}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <CardDescription data-testid={`campaign-description-${campaign.id}`}>
                    {campaign.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Participants</span>
                      <span className="font-medium" data-testid={`campaign-participants-${campaign.id}`}>
                        {campaign.currentParticipants || 0}
                        {campaign.maxParticipants && ` / ${campaign.maxParticipants}`}
                      </span>
                    </div>
                    
                    {campaign.maxParticipants && (
                      <Progress 
                        value={(campaign.currentParticipants || 0) / campaign.maxParticipants * 100} 
                        className="h-2"
                      />
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Duration</span>
                      <span className="font-medium">
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => activateCampaignMutation.mutate(campaign.id)}
                          disabled={activateCampaignMutation.isPending}
                          data-testid={`button-activate-${campaign.id}`}
                          className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCampaign(campaign)}
                        data-testid={`button-view-${campaign.id}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="active">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns
              .filter((campaign: Campaign) => campaign.status === 'active')
              .map((campaign: Campaign) => (
                <Card key={campaign.id} className="border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Play className="h-4 w-4 mr-2 text-green-600" />
                      {campaign.name}
                    </CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-green-600 font-medium">
                      Currently running • {campaign.currentParticipants || 0} participants
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="draft">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns
              .filter((campaign: Campaign) => campaign.status === 'draft')
              .map((campaign: Campaign) => (
                <Card key={campaign.id} className="border-yellow-200 dark:border-yellow-800">
                  <CardHeader>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      onClick={() => activateCampaignMutation.mutate(campaign.id)}
                      className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Activate Campaign
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="completed">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns
              .filter((campaign: Campaign) => campaign.status === 'completed')
              .map((campaign: Campaign) => (
                <Card key={campaign.id} className="border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-600 dark:text-gray-300">{campaign.name}</CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      Completed • {campaign.currentParticipants || 0} total participants
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </>
  );
}