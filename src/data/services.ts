export interface Service {
  serviceId: string;
  serviceName: string;
  description: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export const services: Service[] = [
  {
    serviceId: 'counselling',
    serviceName: 'Complete Counselling Program',
    description: 'End-to-end guidance for college admissions, choice filling, and seat allotment process.',
    price: 4999,
    features: ['1-on-1 counselling sessions', 'Choice filling assistance', 'College comparison reports', 'Seat allotment guidance'],
    popular: true,
  },
  {
    serviceId: 'premium-tests',
    serviceName: 'Premium Mock Test Series',
    description: 'Access all premium mock tests with detailed analytics and performance tracking.',
    price: 1499,
    features: ['Unlimited mock tests', 'Detailed analytics', 'Performance tracking', 'Subject-wise reports'],
  },
  {
    serviceId: 'mentorship',
    serviceName: 'Personal Mentorship',
    description: 'Get paired with a mentor who scored in top ranks for personalized guidance.',
    price: 2999,
    features: ['Weekly mentor calls', 'Study plan creation', 'Doubt clearing sessions', 'Motivation support'],
  },
  {
    serviceId: 'admission-guide',
    serviceName: 'College Admission Guidance',
    description: 'Complete guidance for college selection, documentation, and admission process.',
    price: 1999,
    features: ['College shortlisting', 'Document checklist', 'Application assistance', 'Deadline tracking'],
  },
];
