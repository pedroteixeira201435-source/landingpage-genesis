
import { QuizState, QUESTIONS, RevenueBracket, BusinessType } from '../types';

export interface ImpactFact {
  area: string;
  fact: string;
  icon: string;
}

export interface MaturityLevel {
  title: string;
  status: 'Critical' | 'Warning' | 'Healthy';
  description: string;
}

export const calculateScore = (answers: Record<number, number>, businessType: BusinessType = 'Mixed') => {
  let totalWeightedPoints = 0;
  let maxPossibleWeightedPoints = 0;
  let penalty = 0;

  // 1. Defining Weights by Business Type
  const weights: Record<string, number> = {
    'Cash & Finance': 1.6, // High weight always
    'Taxes & Compliance': 1.2,
    'Sales & Customers': 1.0,
    'Inventory & Operations': businessType === 'Services' ? 0.4 : 1.2, // Drastic difference
  };

  // Adjusting Sales weight for Services
  if (businessType === 'Services') {
    weights['Sales & Customers'] = 1.6;
  }

  QUESTIONS.forEach((q) => {
    const weight = weights[q.block] || 1.0;
    const answerIndex = answers[q.id];
    
    maxPossibleWeightedPoints += 10 * weight;

    if (answerIndex !== undefined && q.options[answerIndex]) {
      const pts = q.options[answerIndex].points;
      totalWeightedPoints += pts * weight;

      // 2. Structural Red Flags
      // Q2: Cash visibility (id: 2) - No visibility is a massive penalty
      if (q.id === 2 && pts === 0) penalty += 12; 
      // Q10: Tax penalties (id: 10) - Legal risk
      if (q.id === 10 && pts === 0) penalty += 8; 
      // Q1: Extreme manual labor hours
      if (q.id === 1 && pts === 0) penalty += 5;
    }
  });

  const rawScore = Math.round((totalWeightedPoints / maxPossibleWeightedPoints) * 100);
  return Math.max(0, rawScore - penalty);
};

export const calculateMonthlyLoss = (score: number, revenue: RevenueBracket) => {
  const baseRevenue: Record<RevenueBracket, number> = {
    '< N$ 500,000': 40000,
    'N$ 500k – 2M': 100000,
    'N$ 2M – 5M': 280000,
    'N$ 5M+': 650000,
  };

  const monthlyRevenue = baseRevenue[revenue];
  
  // Exponential Inefficiency Leakage
  // Score of 100 = 2% floor (no system is perfect)
  // Score of 0 = 20% leakage
  const inefficiency = (100 - score) / 100;
  const leakageRate = 0.02 + (0.18 * Math.pow(inefficiency, 1.4)); 
  
  return Math.round(monthlyRevenue * leakageRate);
};

export const getMaturityLevel = (score: number): MaturityLevel => {
  if (score < 40) {
    return {
      title: "Reactive Chaos",
      status: 'Critical',
      description: "Business is running on manual life-support. Growth is physically impossible without increasing payroll overhead proportionately."
    };
  }
  if (score < 70) {
    return {
      title: "Fragile Stability",
      status: 'Warning',
      description: "Functional but inefficient. Frequent manual interventions are hidden costs that erode profit margins by up to 15%."
    };
  }
  return {
    title: "Streamlined Engine",
    status: 'Healthy',
    description: "Strong digital foundation. Opportunity lies in advanced predictive analytics and AI-driven process optimization."
  };
};

export const getImpactFacts = (answers: Record<number, number>, businessType: BusinessType, revenue: RevenueBracket): ImpactFact[] => {
  const facts: ImpactFact[] = [];
  const getOpt = (id: number) => answers[id];

  // Manual Labor Impact (Q1)
  const q1Ans = getOpt(1);
  if (q1Ans === 3 || q1Ans === 2) {
    const hours = q1Ans === 3 ? 12 : 8;
    facts.push({
      area: "Human Capital",
      fact: `Manual data entry is consuming ~${hours * 52} hours per year. This is hidden payroll waste.`,
      icon: "Clock"
    });
  }

  // Inventory/Resource Impact
  const q4Ans = getOpt(4);
  if (q4Ans === 3 || q4Ans === 2) {
    facts.push({
      area: businessType === 'Services' ? "Resource Utilization" : "Inventory Leakage",
      fact: businessType === 'Services' 
        ? "Preventable double-booking and schedule gaps are likely reducing billable capacity by 20%." 
        : "Uncontrolled stock levels are tying up significant working capital in 'dead stock'.",
      icon: "Package"
    });
  }

  // Compliance Risk
  const q10Ans = getOpt(10);
  if (q10Ans === 2) {
    facts.push({
      area: "Legal Risk",
      fact: "Tax penalties suggest a systemic failure in financial audit trails, increasing IR investigation risk.",
      icon: "ShieldAlert"
    });
  }

  // Cash Flow
  const q2Ans = getOpt(2);
  if (q2Ans === 3 || q2Ans === 2) {
    facts.push({
      area: "Strategic Blindness",
      fact: "Poor 30-day cash visibility prevents aggressive growth investments and creates payroll anxiety.",
      icon: "EyeOff"
    });
  }

  return facts.slice(0, 3);
};

export const calculateCategories = (answers: Record<number, number>) => {
  const getPts = (ids: number[]) => ids.reduce((sum, id) => {
    const q = QUESTIONS.find(q => q.id === id);
    const optIdx = answers[id];
    return sum + ((q && optIdx !== undefined && q.options[optIdx]) ? q.options[optIdx].points : 0);
  }, 0);

  const scores = {
    finance: (getPts([1, 2, 3]) / 30) * 100,
    inventory: (getPts([4, 5, 6]) / 30) * 100,
    sales: (getPts([7, 8]) / 20) * 100,
    compliance: (getPts([9, 10, 11]) / 30) * 100
  };

  const ineff = {
    finance: 100 - scores.finance,
    inventory: 100 - scores.inventory,
    sales: 100 - scores.sales,
    compliance: 100 - scores.compliance,
  };

  const totalIneff = ineff.finance + ineff.inventory + ineff.sales + ineff.compliance;

  // Scalability Index
  const automationQuestions = [1, 6, 11];
  const automationPts = getPts(automationQuestions);
  const scalabilityIndex = Math.round((automationPts / 30) * 100);

  return {
    financePiePct: totalIneff === 0 ? 25 : (ineff.finance / totalIneff) * 100,
    inventoryPiePct: totalIneff === 0 ? 25 : (ineff.inventory / totalIneff) * 100,
    salesPiePct: totalIneff === 0 ? 25 : (ineff.sales / totalIneff) * 100,
    compliancePiePct: totalIneff === 0 ? 25 : (ineff.compliance / totalIneff) * 100,
    scalabilityIndex,
    benchmarkPercentile: (() => {
      const avgScore = (scores.finance + scores.inventory + scores.sales + scores.compliance) / 4;
      
      // Persuasive Benchmarking Formula:
      // High score (90+) -> Top 7-12% (Elite)
      // Mid score (50-70) -> Top 40-60% (Average)
      // Low score (<40) -> Top 80-95% (Lagging)
      let percentile = 100 - (avgScore * 0.92);
      
      // Floor it at 5% to keep it exclusive
      return Math.max(5, Math.min(98, Math.round(percentile)));
    })(),
    scores
  };
};

export const getRecommendations = (answers: Record<number, number>, businessType: BusinessType = 'Mixed') => {
  const cats = calculateCategories(answers);
  const recommendations: string[] = [];

  if (cats.scores.finance < 60) {
    recommendations.push("Centralize bank reconciliations into a single cloud-ERP ledger. Your N$ 30-day visibility depends on eliminating CSV imports.");
  }
  if (cats.scores.inventory < 60) {
    const term = businessType === 'Services' ? "Resource Utilization" : "Inventory Control";
    recommendations.push(`Implement ${term} automation. You are currently losing ${businessType === 'Services' ? 'billable hours' : 'physical assets'} to preventable mapping errors.`);
  }
  if (cats.scores.sales < 60) {
    recommendations.push("Bridge the 'Quote-to-Cash' gap. Sales reports should auto-generate upon invoice creation, not days later from manual tallying.");
  }
  if (cats.scores.compliance < 60) {
    recommendations.push("Automate VAT & Revenue reporting hooks. The time spent on compliance is currently your most expensive administrative labor cost.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Optimize your multi-entity reporting structure for future international or regional expansion.");
    recommendations.push("Implement AI-driven demand forecasting to further sharpen inventory turnover ratios.");
  }

  return recommendations.slice(0, 3);
};
