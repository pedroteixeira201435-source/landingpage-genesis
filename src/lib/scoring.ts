
import { QuizState, QUESTIONS, RevenueBracket, BusinessType } from '../types';

export const calculateScore = (answers: Record<number, number>, businessType: BusinessType = 'Mixed') => {
  let totalWeightedPoints = 0;
  let maxPossibleWeightedPoints = 0;
  let penalty = 0;

  // 1. Defining Weights by Business Type
  const weights: Record<string, number> = {
    'Cash & Finance': 1.5,
    'Taxes & Compliance': 1.2,
    'Sales & Customers': 1.0,
    'Inventory & Operations': businessType === 'Services' ? 0.6 : 1.0, // Less weight for services
  };

  // Adjusting Sales weight for Services
  if (businessType === 'Services') {
    weights['Sales & Customers'] = 1.4;
  }

  QUESTIONS.forEach((q) => {
    const weight = weights[q.block] || 1.0;
    const answerIndex = answers[q.id];
    
    maxPossibleWeightedPoints += 10 * weight;

    if (answerIndex !== undefined && q.options[answerIndex]) {
      const pts = q.options[answerIndex].points;
      totalWeightedPoints += pts * weight;

      // 2. Red Flags (Penalties)
      // Q2: Cash visibility (id: 2)
      if (q.id === 2 && pts === 0) penalty += 15; // "No idea" on cashflow
      // Q10: Tax penalties (id: 10)
      if (q.id === 10 && pts === 0) penalty += 10; // Multiple penalties
    }
  });

  const rawScore = Math.round((totalWeightedPoints / maxPossibleWeightedPoints) * 100);
  return Math.max(0, rawScore - penalty);
};

export const calculateMonthlyLoss = (score: number, revenue: RevenueBracket) => {
  const baseRevenue: Record<RevenueBracket, number> = {
    '< N$ 500,000': 35000,
    'N$ 500k – 2M': 90000,
    'N$ 2M – 5M': 250000,
    'N$ 5M+': 550000,
  };

  const monthlyRevenue = baseRevenue[revenue];
  
  // 3. Non-linear Loss (Exponential Curve)
  // Higher inefficiency causes disproportionately higher losses
  const inefficiency = (100 - score) / 100;
  const maxLeakageRate = 0.15; // Increased slightly for higher pain
  const exponentialFactor = Math.pow(inefficiency, 1.3); // Curve effect
  
  return Math.round(monthlyRevenue * maxLeakageRate * exponentialFactor);
};

export const calculateCategories = (answers: Record<number, number>) => {
  const getPts = (ids: number[]) => ids.reduce((sum, id) => {
    const q = QUESTIONS.find(q => q.id === id);
    const optIdx = answers[id];
    return sum + ((q && optIdx !== undefined && q.options[optIdx]) ? q.options[optIdx].points : 0);
  }, 0);

  const fPts = getPts([1, 2, 3]);
  const iPts = getPts([4, 5, 6]);
  const sPts = getPts([7, 8]);
  const cPts = getPts([9, 10, 11]);

  const scores = {
    finance: (fPts / 30) * 100,
    inventory: (iPts / 30) * 100,
    sales: (sPts / 20) * 100,
    compliance: (cPts / 30) * 100
  };

  const ineff = {
    finance: 100 - scores.finance,
    inventory: 100 - scores.inventory,
    sales: 100 - scores.sales,
    compliance: 100 - scores.compliance,
  };

  const totalIneff = ineff.finance + ineff.inventory + ineff.sales + ineff.compliance;

  // 6. Scalability Index
  // Derived from automation-related questions (Q1, Q6, Q11)
  const automationQuestions = [1, 6, 11];
  const automationPts = getPts(automationQuestions);
  const scalabilityIndex = Math.round((automationPts / 30) * 100);

  return {
    financePiePct: totalIneff === 0 ? 25 : (ineff.finance / totalIneff) * 100,
    inventoryPiePct: totalIneff === 0 ? 25 : (ineff.inventory / totalIneff) * 100,
    salesPiePct: totalIneff === 0 ? 25 : (ineff.sales / totalIneff) * 100,
    compliancePiePct: totalIneff === 0 ? 25 : (ineff.compliance / totalIneff) * 100,
    scalabilityIndex,
    benchmarkPercentile: Math.max(5, Math.round(scores.finance * 0.8 + scores.compliance * 0.2) - 10), // Logic for benchmarking
    scores
  };
};

export const getRecommendations = (answers: Record<number, number>) => {
  const cats = calculateCategories(answers);
  const recommendations: string[] = [];

  if (cats.scores.finance < 60) {
    recommendations.push("Implement an automated invoicing and real-time cashflow dashboard. Your current manual tracking is causing severe delays in receivables and blinding your financial decision-making.");
  }
  if (cats.scores.inventory < 60) {
    recommendations.push("Deploy a unified inventory management system. You are currently tying up capital in dead stock while simultaneously losing sales due to preventable stockouts.");
  }
  if (cats.scores.sales < 60) {
    recommendations.push("Integrate your CRM with your quoting system. Your sales cycle is too slow, and scattered customer data is preventing your team from upselling effectively.");
  }
  if (cats.scores.compliance < 60) {
    recommendations.push("Digitize your tax and audit trails immediately. The time your team spends manually preparing for compliance is a massive hidden payroll cost and a major liability risk.");
  }

  // Fallback if they scored well
  if (recommendations.length === 0) {
    recommendations.push("Your core systems are strong. Focus on advanced BI (Business Intelligence) to forecast trends and optimize your supply chain further.");
    recommendations.push("Consider automating your vendor payment runs to capture early-payment discounts.");
    recommendations.push("Explore customer self-service portals to reduce administrative load on your sales team.");
  }

  return recommendations.slice(0, 3);
};
