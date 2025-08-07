import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoyaltyCard from "@/components/LoyaltyCard";
import { Link } from "wouter";
import { 
  Coins, 
  Gift, 
  TrendingUp, 
  Crown, 
  ShoppingBag, 
  History, 
  UserPen,
  Plus,
  Minus
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["/api/offers"],
  });

  const { data: transactionStats } = useQuery({
    queryKey: ["/api/transactions/stats"],
  });

  const recentTransactions = transactions.slice(0, 3);
  const activeOffers = offers.slice(0, 2);

  const membershipTier = user?.membershipTier || 'bronze';
  const tierColors = {
    bronze: 'bg-orange-100 text-orange-800',
    silver: 'bg-gray-100 text-gray-800',
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-purple-100 text-purple-800',
  };

  const memberSince = user?.memberSince 
    ? new Date(user.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span data-testid="text-user-name">{user?.firstName || 'Customer'}</span>!
        </h2>
        <p className="text-gray-600">Manage your loyalty points and discover new rewards.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Points Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Points</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-total-points">
                  {user?.totalPoints || 0}
                </p>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                <Coins className="text-primary h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Rewards Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Available Offers</p>
                <p className="text-3xl font-bold text-accent" data-testid="text-available-offers">
                  {offers.length}
                </p>
              </div>
              <div className="bg-accent bg-opacity-10 p-3 rounded-lg">
                <Gift className="text-accent h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month Earned */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Purchases</p>
                <p className="text-3xl font-bold text-success" data-testid="text-total-purchases">
                  {transactionStats?.totalPurchases || 0}
                </p>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-lg">
                <TrendingUp className="text-success h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Since */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <p className="text-xl font-bold text-gray-900" data-testid="text-member-since">
                  {memberSince}
                </p>
                <Badge className={tierColors[membershipTier as keyof typeof tierColors]}>
                  {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)} Status
                </Badge>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <Crown className="text-accent h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Digital Loyalty Card and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Digital Loyalty Card</h3>
          <LoyaltyCard user={user} />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-4">
            <Button asChild className="w-full bg-accent hover:bg-yellow-500 text-white" data-testid="button-browse-rewards">
              <Link href="/rewards">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Rewards
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full" data-testid="button-view-history">
              <Link href="/history">
                <History className="mr-2 h-4 w-4" />
                View Purchase History
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full" data-testid="button-update-profile">
              <Link href="/profile">
                <UserPen className="mr-2 h-4 w-4" />
                Update Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity and Personalized Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-activity">
              <Link href="/history">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4" data-testid="text-no-transactions">
                No recent transactions found.
              </p>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.pointsEarned > 0 
                          ? 'bg-success bg-opacity-10' 
                          : 'bg-red-100'
                      }`}>
                        {transaction.pointsEarned > 0 ? (
                          <Plus className="text-success h-4 w-4" />
                        ) : (
                          <Minus className="text-red-600 h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900" data-testid={`text-transaction-description-${transaction.id}`}>
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.pointsEarned > 0 ? 'text-success' : 'text-red-600'
                      }`} data-testid={`text-transaction-points-${transaction.id}`}>
                        {transaction.pointsEarned > 0 
                          ? `+${transaction.pointsEarned} pts`
                          : `-${transaction.pointsSpent} pts`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personalized Offers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personalized Offers</CardTitle>
            {offers.length > 0 && (
              <Badge variant="destructive" data-testid="badge-new-offers">
                {offers.length} New
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {activeOffers.length === 0 ? (
              <p className="text-gray-500 text-center py-4" data-testid="text-no-offers">
                No active offers available.
              </p>
            ) : (
              <div className="space-y-4">
                {activeOffers.map((offer: any) => (
                  <div key={offer.id} className="border border-accent border-opacity-30 bg-accent bg-opacity-5 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900" data-testid={`text-offer-title-${offer.id}`}>
                        {offer.title}
                      </h4>
                      <Badge className="bg-accent text-white">
                        Limited
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3" data-testid={`text-offer-description-${offer.id}`}>
                      {offer.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Expires: {new Date(offer.validUntil).toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="ghost" className="text-accent hover:text-yellow-600" data-testid={`button-activate-offer-${offer.id}`}>
                        Activate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
