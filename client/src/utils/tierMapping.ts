// Maverick Loyalty Tier System

export interface TierInfo {
  tier: string;
  displayName: string;
  points: number;
  benefits: string[];
  color: string;
  icon: string;
}

export const planToTierMapping: Record<string, TierInfo> = {
  // Maverick Starter Tier
  'Prepaid': {
    tier: 'starter',
    displayName: 'Maverick Starter',
    points: 100,
    benefits: ['Basic rewards access', 'Essential support'],
    color: '#8B4513',
    icon: 'star'
  },

  // Maverick Explorer Tier
  'Contract': {
    tier: 'explorer',
    displayName: 'Maverick Explorer',
    points: 200,
    benefits: ['Enhanced rewards', 'Priority customer service', 'Exclusive monthly offers', 'Data rollover'],
    color: '#C0C0C0',
    icon: 'compass'
  },

  // Maverick Champion Tier
  'SME': {
    tier: 'champion',
    displayName: 'Maverick Champion',
    points: 300,
    benefits: ['Premium rewards catalog', 'VIP customer service', 'Free device upgrades', 'International roaming discounts'],
    color: '#FFD700',
    icon: 'trophy'
  },
};

export const tierDisplayNames = {
  starter: 'Maverick Starter',
  explorer: 'Maverick Explorer', 
  champion: 'Maverick Champion',
  elite: 'Maverick Elite'
};

export const tierColors = {
  starter: '#8B4513',
  explorer: '#C0C0C0',
  champion: '#FFD700',
  elite: '#E5E4E2'
};

export const tierBenefits = {
  starter: ['Basic rewards access', 'Essential support'],
  explorer: ['Enhanced rewards', 'Priority customer service', 'Exclusive monthly offers', 'Data rollover'],
  champion: ['Premium rewards catalog', 'VIP customer service', 'Free device upgrades', 'International roaming discounts'],
  elite: ['Platinum-level rewards', 'Personal account manager', 'Concierge services', 'Exclusive event access']
};

export function getTierFromPlan(plan: string): TierInfo {
  return planToTierMapping[plan] || {
    tier: 'starter',
    displayName: 'Maverick Starter',
    points: 100,
    benefits: ['Basic rewards access'],
    color: '#8B4513',
    icon: 'star'
  };
}

export const availablePlans = [
  { value: 'Prepaid', label: 'Prepaid', tier: 'Maverick Starter' },
  { value: 'Contract', label: 'Contract', tier: 'Maverick Explorer' },
  { value: 'SME', label: 'SME', tier: 'Maverick Champion' },
];