
export type RevenueBracket = '< N$ 500,000' | 'N$ 500k – 2M' | 'N$ 2M – 5M' | 'N$ 5M+';
export type BusinessType = 'Products' | 'Services' | 'Mixed';

export interface Question {
  id: number;
  block: 'Cash & Finance' | 'Inventory & Operations' | 'Sales & Customers' | 'Taxes & Compliance';
  text: string;
  options: {
    label: string;
    points: number;
  }[];
}

export interface QuizState {
  answers: Record<number, number>;
  revenue: RevenueBracket;
  businessType: BusinessType;
  name: string;
  email: string;
  phone: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    block: 'Cash & Finance',
    text: 'How many hours per week do you spend updating cashflow spreadsheets and bank reconciliations?',
    options: [
      { label: '0-2h', points: 10 },
      { label: '3-5h', points: 5 },
      { label: '6-10h', points: 2 },
      { label: 'More than 10h', points: 0 },
    ],
  },
  {
    id: 2,
    block: 'Cash & Finance',
    text: 'Can you tell exactly how much cash your business will have in the next 30 days?',
    options: [
      { label: 'Yes, very accurately', points: 10 },
      { label: 'Roughly', points: 5 },
      { label: 'Not really', points: 2 },
      { label: 'No idea', points: 0 },
    ],
  },
  {
    id: 3,
    block: 'Cash & Finance',
    text: 'How often do your profit & loss reports match reality?',
    options: [
      { label: 'Always', points: 10 },
      { label: 'Most of the time', points: 5 },
      { label: 'Sometimes', points: 2 },
      { label: 'Rarely/Never', points: 0 },
    ],
  },
  {
    id: 4,
    block: 'Inventory & Operations',
    text: 'How often do you experience stockouts or excess dead stock?',
    options: [
      { label: 'Never', points: 10 },
      { label: '1-2 times/month', points: 5 },
      { label: '3-5 times/month', points: 2 },
      { label: 'More than 5 times/month', points: 0 },
    ],
  },
  {
    id: 5,
    block: 'Inventory & Operations',
    text: 'Do you know exactly which products give you the highest profit margin?',
    options: [
      { label: 'Yes', points: 10 },
      { label: 'Roughly', points: 5 },
      { label: 'No', points: 0 },
    ],
  },
  {
    id: 6,
    block: 'Inventory & Operations',
    text: 'How long does a full inventory count take you?',
    options: [
      { label: 'Less than 1 day', points: 10 },
      { label: '1-3 days', points: 5 },
      { label: 'More than 3 days', points: 0 },
    ],
  },
  {
    id: 7,
    block: 'Sales & Customers',
    text: 'How many hours per month do you waste chasing sales reports or client payment info?',
    options: [
      { label: '0-5h', points: 10 },
      { label: '6-15h', points: 5 },
      { label: '16-30h', points: 2 },
      { label: 'More than 30h', points: 0 },
    ],
  },
  {
    id: 8,
    block: 'Sales & Customers',
    text: 'Do you have clear visibility of which customers are late on payments?',
    options: [
      { label: 'Yes, real-time', points: 10 },
      { label: 'Monthly', points: 5 },
      { label: 'Not really', points: 0 },
    ],
  },
  {
    id: 9,
    block: 'Taxes & Compliance',
    text: 'How much time do you spend each month on VAT, IR, and tax reports?',
    options: [
      { label: 'Less than 4h', points: 10 },
      { label: '5-10h', points: 5 },
      { label: '11-20h', points: 2 },
      { label: 'More than 20h', points: 0 },
    ],
  },
  {
    id: 10,
    block: 'Taxes & Compliance',
    text: 'Have you paid any tax penalties or interest in the last 12 months?',
    options: [
      { label: 'No', points: 10 },
      { label: 'Once', points: 5 },
      { label: 'More than once', points: 0 },
    ],
  },
  {
    id: 11,
    block: 'Taxes & Compliance',
    text: 'How many different tools/systems do you currently use to run your business?',
    options: [
      { label: '1-2', points: 10 },
      { label: '3-4', points: 5 },
      { label: '5+', points: 0 },
    ],
  },
];
