export interface Plan {
  id: string;
  name: string;
  price: number;
  tagline: string;
  target: string;
  mockTests: string[];
  counseling: string[];
  popular?: boolean;
}

export const plans: Plan[] = [
  {
    id: "foundation",
    name: "Foundation Plan",
    price: 0,
    tagline: "Start your preparation with essential tools",
    target: "Students just starting their prep",
    mockTests: [
      "2 Full-length Mock Tests (2026 pattern)",
      "MHTCET Previous Year Papers (PDF)",
      "Basic scorecard with percentile estimate"
    ],
    counseling: [
      "Basic college predictor (top 10 colleges)",
      "Admission tracker (CET dates calendar)",
      "Branch finder quiz (Engineering vs Pharmacy)"
    ]
  },
  {
    id: "practice-pro",
    name: "Practice Pro Plan",
    price: 1499,
    tagline: "Serious practice with real exam simulation",
    target: "Students focused on improving performance",
    mockTests: [
      "25+ full-length mock tests (real exam UI)",
      "50+ chapter-wise tests",
      "AI performance insights (weak areas, speed analysis)"
    ],
    counseling: [
      "Advanced college predictor (filters: district, category, branch)",
      "Cut-off database (3 years, 300+ colleges)"
    ],
    popular: true
  },
  {
    id: "admission-expert",
    name: "Admission Expert Plan",
    price: 2999,
    tagline: "Master the CAP admission process",
    target: "Students confident in prep but need admission guidance",
    mockTests: [
      "All Practice Pro features",
      "Predictive ranking vs other students"
    ],
    counseling: [
      "Smart CAP option form builder",
      "Document checklist & verification assistant",
      "Pre-recorded expert webinars (CAP, freeze/float, spot rounds)"
    ]
  },
  {
    id: "elite",
    name: "Elite Strategist Plan",
    price: 4999,
    tagline: "Complete roadmap from exam to admission",
    target: "Students & parents wanting full guidance",
    mockTests: [
      "Full mock + analytics suite",
      "Error tracker (personal mistake book)"
    ],
    counseling: [
      "Spot round & institutional alerts (COEP, VJTI, etc.)",
      "Scholarship navigator (MAHA-DBT, EBC)",
      "Premium dashboard tracking entire admission journey"
    ]
  }
];
