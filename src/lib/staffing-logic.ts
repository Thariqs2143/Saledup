export type RoleBreakdownItem = {
    name: string;
    value: number;
};

export type StaffingAdvice = {
    businessType: string;
    monthlyTurnover: number;
    yearlyTurnover: number;
    optimalStaffCount: number;
    currentStaffCount: number;
    recommendationText: string;
    roleBreakdown: RoleBreakdownItem[];
    salaryBudget: {
        min: number;
        max: number;
    };
    efficiencyTip: string;
};

// This is a simple, rule-based engine. 
// Numbers are illustrative and based on general market estimates for Tier 2/3 cities in India.
const rules = {
    'Retail': {
        turnoverPerStaff: 250000, // 1 staff for every 2.5 lakhs monthly
        roles: ['Cashier', 'Sales Associate', 'Stocker'],
        avgSalaryPerStaff: { min: 12000, max: 20000 },
        tip: "Consider implementing a simple inventory management system to optimize stock levels and reduce manual tracking."
    },
    'Food & Beverage': {
        turnoverPerStaff: 150000, // 1 staff for every 1.5 lakhs (higher need)
        roles: ['Cook', 'Server', 'Cashier', 'Cleaner'],
        avgSalaryPerStaff: { min: 14000, max: 25000 },
        tip: "Optimize your menu to focus on high-profit, quick-to-prepare items during peak hours to improve table turnover."
    },
    'Service': {
        turnoverPerStaff: 200000, // 1 staff for every 2 lakhs
        roles: ['Technician', 'Receptionist', 'Consultant'],
        avgSalaryPerStaff: { min: 15000, max: 28000 },
        tip: "Use an online booking system to manage appointments efficiently and reduce no-shows with automated reminders."
    },
    'MSME': {
        turnoverPerStaff: 300000, // 1 staff for every 3 lakhs
        roles: ['Operator', 'Supervisor', 'Helper'],
        avgSalaryPerStaff: { min: 16000, max: 30000 },
        tip: "Cross-train your employees on multiple tasks. This creates a flexible workforce that can adapt to changing demands."
    },
    'Other': {
        turnoverPerStaff: 225000, // A general average
        roles: ['General Staff', 'Assistant', 'Operator'],
        avgSalaryPerStaff: { min: 13000, max: 22000 },
        tip: "Regularly ask for customer feedback to identify bottlenecks and areas where an extra team member could improve service."
    },
};

export function getStaffingAdvice(
    businessType: string, 
    monthlyTurnover: number, 
    yearlyTurnover: number,
    currentStaffCount: number
): StaffingAdvice {
    const rule = rules[businessType as keyof typeof rules] || rules['Other'];

    // Prioritize yearly turnover if available, otherwise use monthly.
    const effectiveMonthlyTurnover = yearlyTurnover > 0 ? yearlyTurnover / 12 : monthlyTurnover;
    
    const calculatedStaff = Math.ceil(effectiveMonthlyTurnover / rule.turnoverPerStaff);
    
    const optimalStaffCount = effectiveMonthlyTurnover > 0 ? Math.max(1, calculatedStaff) : 0;

    let roleBreakdown: RoleBreakdownItem[] = [];
    if (optimalStaffCount > 0) {
        if (optimalStaffCount === 1) {
            roleBreakdown.push({ name: rule.roles[0], value: 1 });
        } else if (optimalStaffCount <= 3) {
            const primaryCount = Math.ceil(optimalStaffCount / 2);
            const secondaryCount = Math.floor(optimalStaffCount / 2);
            roleBreakdown.push({ name: rule.roles[0], value: primaryCount });
            if (secondaryCount > 0 && rule.roles[1]) {
                roleBreakdown.push({ name: rule.roles[1], value: secondaryCount });
            }
        } else {
            const primaryCount = Math.ceil(optimalStaffCount * 0.5);
            const secondaryCount = Math.floor(optimalStaffCount * 0.3);
            const supportCount = optimalStaffCount - primaryCount - secondaryCount;
            if (primaryCount > 0 && rule.roles[0]) {
                roleBreakdown.push({ name: rule.roles[0], value: primaryCount });
            }
             if (secondaryCount > 0 && rule.roles[1]) {
                roleBreakdown.push({ name: rule.roles[1], value: secondaryCount });
            }
             if (supportCount > 0 && rule.roles[2]) {
                roleBreakdown.push({ name: rule.roles[2], value: supportCount });
            }
        }
    }
    
    const minBudget = Math.round(optimalStaffCount * rule.avgSalaryPerStaff.min);
    const maxBudget = Math.round(optimalStaffCount * rule.avgSalaryPerStaff.max);

    let recommendationText = "";
    const difference = optimalStaffCount - currentStaffCount;

    if (optimalStaffCount === 0) {
        recommendationText = "Enter your turnover to get started.";
    } else if (difference > 1) {
        recommendationText = `Your turnover suggests you could support around ${optimalStaffCount} staff members. Consider hiring ${difference} more people to boost growth and reduce workload.`;
    } else if (difference === 1) {
        recommendationText = `Your current team size is good, but hiring one more person could help you scale operations and improve service during peak times.`;
    } else if (difference === 0) {
        recommendationText = `Your staffing level seems optimal for your current turnover. Focus on training and efficiency to maximize your team's potential.`;
    } else {
        recommendationText = `You may have more staff than your current turnover requires. Ensure each team member has a clear, impactful role to maximize efficiency.`;
    }

    return {
        businessType,
        monthlyTurnover: monthlyTurnover,
        yearlyTurnover: yearlyTurnover,
        optimalStaffCount: optimalStaffCount,
        currentStaffCount: currentStaffCount,
        roleBreakdown,
        salaryBudget: {
            min: minBudget,
            max: maxBudget
        },
        efficiencyTip: rule.tip,
        recommendationText: recommendationText,
    };
}
