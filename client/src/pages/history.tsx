import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Download, ShoppingCart, DollarSign, Coins } from "lucide-react";
import type { Transaction } from "@shared/schema";
import Navbar from "@/components/Navbar";
import { transactionStatsResponseSchema, type TransactionStatsResponse } from "@shared/apiContracts";
import { parseApiResponse } from "@/lib/apiResponse";

export default function History() {
  const [filterPeriod, setFilterPeriod] = useState("all");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: transactionStats } = useQuery<TransactionStatsResponse>({
    queryKey: ["/api/transactions/stats"],
    queryFn: async () => parseApiResponse(
      await fetch("/api/transactions/stats", { credentials: "include" }),
      transactionStatsResponseSchema,
    ),
  });

  const getStatusBadge = (type: string, status: string) => {
    if (type === 'redemption') {
      return <Badge className="bg-blue-100 text-blue-800">Redeemed</Badge>;
    }
    if (type === 'bonus') {
      return <Badge className="bg-purple-100 text-purple-800">Bonus</Badge>;
    }
    if (status === 'completed') {
      return <Badge className="bg-success bg-opacity-10 text-success">Completed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPointsDisplay = (transaction: Transaction) => {
    if ((transaction.pointsEarned || 0) > 0) {
      return <span className="text-success font-medium">+{transaction.pointsEarned} pts</span>;
    }
    if ((transaction.pointsSpent || 0) > 0) {
      return <span className="text-red-600 font-medium">-{transaction.pointsSpent} pts</span>;
    }
    return <span className="text-gray-500">0 pts</span>;
  };

  const handleDownload = () => {
    // This would implement CSV/PDF download functionality
    console.log("Downloading transaction history...");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Transaction History</h2>
          <p className="text-gray-600 text-sm sm:text-base">Track your Maverick purchases and earned points</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <Select value={filterPeriod} onValueChange={setFilterPeriod} data-testid="select-filter-period">
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownload} className="w-full sm:w-auto min-h-[44px]" data-testid="button-download-history">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Purchase Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="text-summary-purchases">
                  {transactionStats?.totalPurchases || 0}
                </p>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                <ShoppingCart className="text-primary h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="text-summary-spent">
                  R{transactionStats?.totalSpent || '0.00'}
                </p>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-lg">
                <DollarSign className="text-success h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Points Earned</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="text-summary-points">
                  {transactionStats?.totalPointsEarned || 0}
                </p>
              </div>
              <div className="bg-accent bg-opacity-10 p-3 rounded-lg">
                <Coins className="text-accent h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500" data-testid="text-no-transactions">
                No transactions found. Start making purchases to see your history here.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: any) => (
                      <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900" data-testid={`text-transaction-description-${transaction.id}`}>
                              {transaction.description}
                            </div>
                            {transaction.orderId && (
                              <div className="text-sm text-gray-500">
                                Order #{transaction.orderId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-transaction-amount-${transaction.id}`}>
                          {transaction.amount ? `R${transaction.amount}` : 'R0.00'}
                        </TableCell>
                        <TableCell data-testid={`text-transaction-points-${transaction.id}`}>
                          {getPointsDisplay(transaction)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.type, transaction.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {transactions.map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="bg-white border rounded-lg p-4 space-y-3"
                    data-testid={`card-transaction-${transaction.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1" data-testid={`text-transaction-description-${transaction.id}`}>
                          {transaction.description}
                        </h3>
                        {transaction.orderId && (
                          <p className="text-sm text-gray-500">Order #{transaction.orderId}</p>
                        )}
                      </div>
                      {getStatusBadge(transaction.type, transaction.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Date</p>
                        <p className="font-medium">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Amount</p>
                        <p className="font-medium" data-testid={`text-transaction-amount-${transaction.id}`}>
                          {transaction.amount ? `R${transaction.amount}` : 'R0.00'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-gray-500 text-xs mb-1">Points</p>
                      <div data-testid={`text-transaction-points-${transaction.id}`}>
                        {getPointsDisplay(transaction)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
