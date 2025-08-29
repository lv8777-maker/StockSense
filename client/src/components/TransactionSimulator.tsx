import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Zap, Gift, CreditCard } from "lucide-react";

interface TransactionSimulatorProps {
  currentPoints: number;
}

export default function TransactionSimulator({ currentPoints }: TransactionSimulatorProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("airtime");
  const [description, setDescription] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      return await apiRequest("/api/transactions", {
        method: "POST",
        body: JSON.stringify(transactionData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Complete!",
        description: `Transaction processed successfully. Points earned will appear shortly.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      setAmount("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Transaction Failed",
        description: error.message || "Unable to process transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const categories = [
    { value: "airtime", label: "Airtime Top-up", icon: "📱" },
    { value: "data", label: "Data Bundle", icon: "🌐" },
    { value: "international", label: "International Calls", icon: "🌍" },
    { value: "sms", label: "SMS Bundle", icon: "💬" },
    { value: "other", label: "Other Services", icon: "⚡" },
  ];

  const quickAmounts = [25, 50, 100, 200, 500];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid purchase amount",
        variant: "destructive",
      });
      return;
    }

    const selectedCategory = categories.find(c => c.value === category);
    const transactionDescription = description || `${selectedCategory?.label} - R${amount}`;

    transactionMutation.mutate({
      type: "purchase",
      amount: parseFloat(amount),
      description: transactionDescription,
      category: category,
      orderId: `SIM-${Date.now()}`,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-[#3C3C3B] text-base sm:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Simulate Purchase</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden"
          >
            {isExpanded ? "Less" : "More"}
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Test the points engine with a simulated telecom purchase
        </p>
      </CardHeader>
      
      <CardContent className={`transition-all duration-200 ${!isExpanded ? 'hidden sm:block' : ''}`}>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Service Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center space-x-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Amounts (ZAR)</label>
            <div className="grid grid-cols-5 sm:grid-cols-3 gap-1 sm:gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-xs px-2 py-1 h-8"
                  data-testid={`quick-amount-${quickAmount}`}
                >
                  R{quickAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (ZAR)</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                step="0.01"
                min="0"
                data-testid="input-amount"
              />
            </div>
          </div>

          {/* Optional Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input
              type="text"
              placeholder="Custom description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-description"
            />
          </div>

          {/* Points Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-[#FDC800]/10 rounded-lg border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Estimated Points:</span>
                <span className="font-semibold text-[#3C3C3B]">
                  ~{Math.floor(parseFloat(amount) * 0.1)} points
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Base rate: 0.1 points per ZAR + tier bonuses
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={transactionMutation.isPending || !amount}
            className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold"
            data-testid="button-simulate-purchase"
          >
            {transactionMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-[#3C3C3B] border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Simulate Purchase</span>
              </div>
            )}
          </Button>
        </form>

        {/* Current Points Display */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Balance:</span>
            <div className="flex items-center space-x-1">
              <Gift className="h-4 w-4 text-[#FDC800]" />
              <span className="font-semibold text-[#3C3C3B]">
                {currentPoints.toLocaleString()} points
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}