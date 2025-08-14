import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Bell, 
  Plus, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Check, 
  AlertCircle, 
  Info, 
  Star,
  Clock,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const notificationFormSchema = z.object({
  type: z.enum(["push", "sms", "email", "in_app"]),
  category: z.enum(["system", "marketing", "transactional", "reminder"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  actionUrl: z.string().optional(),
  scheduledFor: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationFormSchema>;

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  readAt?: string;
  actionUrl?: string;
  data?: any;
  createdAt: string;
  scheduledFor?: string;
}

export default function NotificationsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      return await apiRequest("/api/notifications", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Notification Created",
        description: "Your notification has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      type: "in_app",
      category: "system",
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    createNotificationMutation.mutate(data);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "push": return <Smartphone className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "in_app": return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "system": return <AlertCircle className="h-4 w-4" />;
      case "marketing": return <Star className="h-4 w-4" />;
      case "transactional": return <CheckCircle className="h-4 w-4" />;
      case "reminder": return <Clock className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "system": return "bg-red-500";
      case "marketing": return "bg-blue-500";
      case "transactional": return "bg-green-500";
      case "reminder": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n: Notification) => !n.readAt);
  const readNotifications = notifications.filter((n: Notification) => n.readAt);

  return (
    <div className="space-y-6" data-testid="notifications-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notification Center</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage and send notifications across multiple channels</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-notification" className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]">
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
              <DialogDescription>
                Create and send notifications to your customers
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-notification-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in_app">In-App Notification</SelectItem>
                            <SelectItem value="push">Push Notification</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectTrigger data-testid="select-notification-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="transactional">Transactional</SelectItem>
                            <SelectItem value="reminder">Reminder</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-notification-title" placeholder="Notification title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-notification-message" placeholder="Your notification message..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actionUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-action-url" placeholder="https://example.com/action" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule For (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-scheduled-for" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-notification"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createNotificationMutation.isPending}
                    data-testid="button-submit-notification"
                    className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                  >
                    {createNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notification Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-notifications">{notifications.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-unread-notifications">
              {unreadNotifications.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-read-notifications">
              {readNotifications.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-today-notifications">
              {notifications.filter((n: Notification) => {
                const created = new Date(n.createdAt);
                const now = new Date();
                return created.toDateString() === now.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-notifications">All Notifications</TabsTrigger>
          <TabsTrigger value="unread" data-testid="tab-unread-notifications">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="read" data-testid="tab-read-notifications">Read</TabsTrigger>
          <TabsTrigger value="marketing" data-testid="tab-marketing-notifications">Marketing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Notifications</h3>
                <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                  You don't have any notifications yet. Create your first notification to get started.
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Send First Notification
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification: Notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-all hover:shadow-md ${!notification.readAt ? 'border-l-4 border-l-[#FDC800] bg-[#FDC800]/5' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex space-x-2">
                          {getNotificationIcon(notification.type)}
                          {getCategoryIcon(notification.category)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white" data-testid={`notification-title-${notification.id}`}>
                              {notification.title}
                            </h3>
                            <Badge className={getCategoryColor(notification.category)} data-testid={`notification-category-${notification.id}`}>
                              {notification.category}
                            </Badge>
                            <Badge variant="outline" data-testid={`notification-type-${notification.id}`}>
                              {notification.type}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 mb-2" data-testid={`notification-message-${notification.id}`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span data-testid={`notification-time-${notification.id}`}>
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            
                            {notification.scheduledFor && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled: {new Date(notification.scheduledFor).toLocaleString()}
                              </span>
                            )}
                            
                            {notification.readAt && (
                              <span className="flex items-center text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Read
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!notification.readAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        
                        {notification.actionUrl && (
                          <Button
                            size="sm"
                            onClick={() => window.open(notification.actionUrl, '_blank')}
                            data-testid={`button-action-${notification.id}`}
                            className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                          >
                            Take Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="unread" className="space-y-3">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  You have no unread notifications.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {unreadNotifications.map((notification: Notification) => (
                <Card key={notification.id} className="border-l-4 border-l-[#FDC800] bg-[#FDC800]/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex space-x-2">
                          {getNotificationIcon(notification.type)}
                          {getCategoryIcon(notification.category)}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-2">
                            {notification.message}
                          </p>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Read
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="read" className="space-y-3">
          {readNotifications.map((notification: Notification) => (
            <Card key={notification.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex space-x-2 opacity-60">
                    {getNotificationIcon(notification.type)}
                    {getCategoryIcon(notification.category)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-gray-500 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                      <span className="flex items-center text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Read {formatDistanceToNow(new Date(notification.readAt!), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="marketing" className="space-y-3">
          {notifications
            .filter((n: Notification) => n.category === 'marketing')
            .map((notification: Notification) => (
              <Card key={notification.id} className="border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-blue-500 mt-0.5" />
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        {notification.message}
                      </p>
                      <span className="text-sm text-blue-600">
                        Marketing • {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}