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
  'Essential': {
    tier: 'starter',
    displayName: 'Maverick Starter',
    points: 100,
    benefits: ['Basic rewards access', 'Monthly newsletters', 'Essential support'],
    color: '#8B4513',
    icon: 'star'
  },
  'Core': {
    tier: 'starter',
    displayName: 'Maverick Starter',
    points: 100,
    benefits: ['Basic rewards access', 'Monthly newsletters', 'Essential support'],
    color: '#8B4513',
    icon: 'star'
  },
  
  // Maverick Explorer Tier
  'Plus': {
    tier: 'explorer',
    displayName: 'Maverick Explorer',
    points: 200,
    benefits: ['Enhanced rewards', 'Priority customer service', 'Exclusive monthly offers', 'Data rollover'],
    color: '#C0C0C0',
    icon: 'compass'
  },
  'Prime': {
    tier: 'explorer',
    displayName: 'Maverick Explorer',
    points: 200,
    benefits: ['Enhanced rewards', 'Priority customer service', 'Exclusive monthly offers', 'Data rollover'],
    color: '#C0C0C0',
    icon: 'compass'
  },
  
  // Maverick Champion Tier
  'Deluxe': {
    tier: 'champion',
    displayName: 'Maverick Champion',
    points: 300,
    benefits: ['Premium rewards catalog', 'VIP customer service', 'Free device upgrades', 'International roaming discounts'],
    color: '#FFD700',
    icon: 'trophy'
  },
  'Elite': {
    tier: 'champion',
    displayName: 'Maverick Champion',
    points: 300,
    benefits: ['Premium rewards catalog', 'VIP customer service', 'Free device upgrades', 'International roaming discounts'],
    color: '#FFD700',
    icon: 'trophy'
  },
  
  // Maverick Elite Tier
  'Bronze': {
    tier: 'elite',
    displayName: 'Maverick Elite',
    points: 500,
    benefits: ['Platinum-level rewards', 'Personal account manager', 'Concierge services', 'Exclusive event access'],
    color: '#CD7F32',
    icon: 'crown'
  },
  'Silver': {
    tier: 'elite',
    displayName: 'Maverick Elite',
    points: 500,
    benefits: ['Platinum-level rewards', 'Personal account manager', 'Concierge services', 'Exclusive event access'],
    color: '#C0C0C0',
    icon: 'crown'
  },
  'Gold': {
    tier: 'elite',
    displayName: 'Maverick Elite',
    points: 500,
    benefits: ['Platinum-level rewards', 'Personal account manager', 'Concierge services', 'Exclusive event access'],
    color: '#FFD700',
    icon: 'crown'
  },
  'Platinum': {
    tier: 'elite',
    displayName: 'Maverick Elite',
    points: 500,
    benefits: ['Platinum-level rewards', 'Personal account manager', 'Concierge services', 'Exclusive event access'],
    color: '#E5E4E2',
    icon: 'crown'
  }
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
  starter: ['Basic rewards access', 'Monthly newsletters', 'Essential support'],
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
  // Starter tier plans
  { value: 'Essential', label: 'Essential Plan', tier: 'Maverick Starter' },
  { value: 'Core', label: 'Core Plan', tier: 'Maverick Starter' },
  
  // Explorer tier plans
  { value: 'Plus', label: 'Plus Plan', tier: 'Maverick Explorer' },
  { value: 'Prime', label: 'Prime Plan', tier: 'Maverick Explorer' },
  
  // Champion tier plans
  { value: 'Deluxe', label: 'Deluxe Plan', tier: 'Maverick Champion' },
  { value: 'Elite', label: 'Elite Plan', tier: 'Maverick Champion' },
  
  // Elite tier plans
  { value: 'Bronze', label: 'MTN Sky Bronze', tier: 'Maverick Elite' },
  { value: 'Silver', label: 'MTN Sky Silver', tier: 'Maverick Elite' },
  { value: 'Gold', label: 'MTN Sky Gold', tier: 'Maverick Elite' },
  { value: 'Platinum', label: 'MTN Sky Platinum', tier: 'Maverick Elite' },
];