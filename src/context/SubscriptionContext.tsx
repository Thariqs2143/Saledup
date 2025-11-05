
'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';

// Define the shape of our subscription plans and their features
const plans = {
  trial: {
    name: '14-Day Free Trial',
    maxEmployees: 5,
    maxBranches: 1,
    features: new Set([
        'REPORTS_EXPORT',
        'PAYROLL',
        'MUSTER_ROLL',
        'REWARDS_SYSTEM'
    ]),
  },
  growth: {
    name: 'Growth',
    maxEmployees: 50,
    maxBranches: 5,
    features: new Set([
        'REPORTS_EXPORT',
        'PAYROLL',
        'MUSTER_ROLL',
        'REWARDS_SYSTEM',
        'MULTI_BRANCH'
    ]),
  },
  pro: {
    name: 'Pro',
    maxEmployees: Infinity,
    maxBranches: Infinity,
    features: new Set([
        'REPORTS_EXPORT',
        'PAYROLL',
        'MUSTER_ROLL',
        'REWARDS_SYSTEM',
        'MULTI_BRANCH',
        'AI_TOOLS'
    ]),
  },
};

type PlanName = keyof typeof plans;
type Feature = 
    | 'REPORTS_EXPORT' 
    | 'PAYROLL' 
    | 'MUSTER_ROLL' 
    | 'REWARDS_SYSTEM'
    | 'MULTI_BRANCH'
    | 'AI_TOOLS';

interface SubscriptionContextType {
  plan: PlanName;
  status: 'active' | 'inactive' | 'trialing';
  hasReachedEmployeeLimit: (currentCount: number) => boolean;
  hasReachedBranchLimit: (currentCount: number) => boolean;
  canAccessFeature: (feature: Feature) => boolean;
  planDetails: {
    name: string;
    maxEmployees: number;
    maxBranches: number;
  }
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({
  children,
  subscriptionPlan,
  subscriptionStatus,
}: {
  children: ReactNode;
  subscriptionPlan: string | undefined;
  subscriptionStatus: string | undefined;
}) => {
  const plan: PlanName = useMemo(() => {
    const planKey = subscriptionPlan?.toLowerCase() || 'trial';
    return plans.hasOwnProperty(planKey) ? (planKey as PlanName) : 'trial';
  }, [subscriptionPlan]);

  const status = useMemo(() => {
      return (subscriptionStatus || 'trialing') as SubscriptionContextType['status']
  }, [subscriptionStatus])

  const planDetails = plans[plan];

  const hasReachedEmployeeLimit = (currentCount: number) => {
    return currentCount >= planDetails.maxEmployees;
  };

  const hasReachedBranchLimit = (currentCount: number) => {
    return currentCount >= planDetails.maxBranches;
  };
  
  const canAccessFeature = (feature: Feature) => {
    return planDetails.features.has(feature);
  };

  const value = {
    plan,
    status,
    hasReachedEmployeeLimit,
    hasReachedBranchLimit,
    canAccessFeature,
    planDetails,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
