import type { User } from "@shared/schema";
import maverickLogo from "@/assets/maverick-logo.png";

interface LoyaltyCardProps {
  user: User | null | undefined;
}

export default function LoyaltyCard({ user }: LoyaltyCardProps) {
  const membershipTier = user?.membershipTier || 'bronze';
  const memberSince = user?.memberSince 
    ? new Date(user.memberSince).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
    : '12/25';
  
  const memberId = user?.id ? `MV-${user.id.slice(-9)}` : 'MV-000000000';

  return (
    <div className="bg-gradient-to-br from-primary to-gray-800 rounded-2xl p-6 text-white shadow-lg" data-testid="card-loyalty">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-2">
          <img src={maverickLogo} alt="Maverick" className="h-6 w-auto brightness-0 invert" />
          <div>
            <h4 className="text-lg font-semibold opacity-90">Maverick</h4>
            <p className="text-sm opacity-75">Loyalty Member</p>
          </div>
        </div>
        <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
          <span className="text-xs font-medium uppercase" data-testid="text-membership-tier">
            {membershipTier}
          </span>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-sm opacity-75 mb-1">Current Balance</p>
        <p className="text-3xl font-bold" data-testid="text-card-balance">
          {user?.totalPoints || 0} <span className="text-lg font-normal">points</span>
        </p>
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm opacity-75 mb-1">Member ID</p>
          <p className="font-mono text-sm" data-testid="text-member-id">{memberId}</p>
        </div>
        <div className="text-right">
          <p className="text-sm opacity-75 mb-1">Valid Thru</p>
          <p className="font-mono text-sm" data-testid="text-card-expiry">{memberSince}</p>
        </div>
      </div>
    </div>
  );
}
