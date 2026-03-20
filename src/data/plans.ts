export interface PlanFeature {
  title: string;
  description: string;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  target: string;
  price: number;
  popular: boolean;
  mockTests: PlanFeature[];
  counseling: PlanFeature[];
  benefits: PlanFeature[];
  howItWorks: PlanFeature[];
  personas: PlanFeature[];
  faqs: PlanFeature[];
}

export const plans: Plan[] = [
  {
    id: "foundation",
    name: "Foundation Plan",
    tagline: "Start your preparation with essential tools",
    target: "Students just starting their prep",
    price: 999,
    popular: false,
    mockTests: [
      { title: "2 Full-length Mock Tests", description: "Experience the real 2026 MHT-CET exam pattern with our high-quality mock tests." },
      { title: "MHTCET Previous Papers", description: "Access comprehensive PDF copies of past year papers to understand trends." },
      { title: "Basic Scorecard", description: "Get a clear breakdown of your marks and a preliminary percentile estimate." }
    ],
    counseling: [
      { title: "Basic College Predictor", description: "Find out your chances of getting into the top 10 colleges based on your estimated score." },
      { title: "Admission Tracker", description: "Stay updated with crucial CET 2026 dates, deadlines, and notification alerts." },
      { title: "Branch Finder Quiz", description: "Take a short quiz to discover whether Engineering or Pharmacy suits your profile." }
    ],
    benefits: [
      { title: "Strong Start", description: "Build a confident foundation for your CET journey." },
      { title: "Clear Roadmap", description: "Understand exactly what you need to focus on next." },
      { title: "Less Confusion", description: "Get clarity on admission dates and basics early on." }
    ],
    howItWorks: [
      { title: "Take Initial Tests", description: "Evaluate your current standing." },
      { title: "Review Scorecard", description: "Identify early strengths and weaknesses." },
      { title: "Check College Chances", description: "See what's realistic for your current score." },
      { title: "Refine Goals", description: "Adjust your study strategy accordingly." }
    ],
    personas: [
      { title: "Class 11th Students", description: "Looking for an early head start before 12th begins." },
      { title: "Beginners", description: "Not sure where they stand realistically." },
      { title: "Self-study Aspirants", description: "Needing basic benchmarks to track progress." }
    ],
    faqs: [
      { title: "Is the foundation plan enough to crack CET?", description: "It provides the essential benchmarks, but regular practice via the Practice Pro plan is highly recommended for top percentiles." },
      { title: "When do I get access?", description: "You get instant digital access as soon as you complete the payment." },
      { title: "Can I upgrade later?", description: "Yes! You can easily upgrade to Practice Pro or Admission Expert by paying the difference." },
      { title: "Are the mock tests based on the new syllabus?", description: "Absolutely, all tests strictly adhere to the updated 2026 exam pattern." }
    ]
  },
  {
    id: "practice-pro",
    name: "Practice Pro Plan",
    tagline: "Serious practice with real exam simulation",
    target: "Students focused on improving performance",
    price: 1999,
    popular: true,
    mockTests: [
      { title: "25+ Full-length Mocks", description: "Simulate the extreme pressure of the real exam with our authentic CBT-style UI." },
      { title: "50+ Chapter-wise Tests", description: "Focus precisely on weak chapters across Physics, Chemistry, Math, and Biology." },
      { title: "AI Insights", description: "Advanced granular analytics detailing exact weak areas and speed/accuracy matrices." }
    ],
    counseling: [
      { title: "Advanced College Predictor", description: "Filter 300+ colleges by specific district, category, and preferred branch." },
      { title: "Cut-off Database", description: "Exclusive access to 3 years of extensive cut-off data across all major institutes." }
    ],
    benefits: [
      { title: "Sharpened Accuracy", description: "Eliminate silly mistakes with high-volume repetitive testing." },
      { title: "Time Management", description: "Learn to perfectly pace yourself with our speed insights." },
      { title: "Data-Driven Prep", description: "Never guess what to study next; the AI tells you exactly what to revise." }
    ],
    howItWorks: [
      { title: "Select Chapter/Mock", description: "Choose a test matching your current study phase." },
      { title: "Simulate Exam", description: "Practice in a strictly timed, distraction-free interface." },
      { title: "Analyze AI Report", description: "Dive deep into question-level timing and accuracy." },
      { title: "Fix Weaknesses", description: "Re-study flagged chapters and test again." }
    ],
    personas: [
      { title: "Serious Aspirants", description: "Aiming for 95+ percentile and top-tier colleges." },
      { title: "Repeaters / Droppers", description: "Needing massive practice banks to perfect their approach." },
      { title: "Coaching Students", description: "Looking for supplementary, high-quality testing platforms." }
    ],
    faqs: [
      { title: "How accurate is the AI predictor?", description: "Our predictor leverages historical 3-year data and live trends, providing 90%+ accuracy." },
      { title: "Can I take tests on mobile?", description: "Yes, our interface is fully responsive, though we recommend a PC for the real exam feel." },
      { title: "Are video solutions included?", description: "We provide detailed text and step-by-step graphical solutions for all mock tests." },
      { title: "Do you cover PCM and PCB?", description: "Yes, both subject groups are fully supported with specialized mock tests." }
    ]
  },
  {
    id: "admission-expert",
    name: "Admission Expert Plan",
    tagline: "Master the CAP admission process",
    target: "Students confident in prep but need admission guidance",
    price: 3499,
    popular: false,
    mockTests: [
      { title: "All Practice Pro Features", description: "Complete access to all 75+ tests and AI analytics from the Practice Pro tier." },
      { title: "Predictive Ranking", description: "See exactly where you stand against thousands of other serious competitors." }
    ],
    counseling: [
      { title: "Smart CAP Form Builder", description: "Auto-generate the most optimal college option form to maximize your seat chances." },
      { title: "Document Assistant", description: "Get a personalized checklist and pre-verification guide for smooth counseling." },
      { title: "Pre-recorded Webinars", description: "In-depth video guides on CAP rounds, freeze/float strategies, and spot rounds." }
    ],
    benefits: [
      { title: "Zero Admission Stress", description: "Never worry about missing a deadline or missing a form." },
      { title: "Maximize College Potential", description: "Our smart form builder ensures you don't miss out on better colleges." },
      { title: "Error-free Paperwork", description: "Ensure your documents are 100% compliant before you reach the ARC center." }
    ],
    howItWorks: [
      { title: "Complete Exams", description: "Finish your MHT-CET and receive your percentile." },
      { title: "Generate Option Form", description: "Input your preferences into out Smart Builder." },
      { title: "Verify Documents", description: "Use our assistant to clear all paperwork requirements." },
      { title: "Secure Seat", description: "Navigate CAP rounds efficiently to lock in your preferred branch." }
    ],
    personas: [
      { title: "Anxious Parents", description: "Looking for guaranteed guidance through the confusing CAP process." },
      { title: "Borderline Students", description: "Where smart choice-filling makes the difference between a good and bad college." },
      { title: "Out-of-State Applicants", description: "Unfamiliar with Maharashtra's specific DTE admission procedures." }
    ],
    faqs: [
      { title: "Does this guarantee admission?", description: "While we don't guarantee seats, we guarantee that your option form will be mathematically optimized." },
      { title: "Are the webinars live?", description: "This plan includes pre-recorded deep dives. For live mentorship, check the Elite plan." },
      { title: "When should I buy this?", description: "Best purchased either right before the exam or immediately after results are out." },
      { title: "Will you check my documents?", description: "We provide an exhaustive pre-verification checklist and common error guide." }
    ]
  },
  {
    id: "elite",
    name: "Elite Strategist Plan",
    tagline: "Complete roadmap from exam to admission",
    target: "Students & parents wanting full guidance",
    price: 5999,
    popular: true,
    mockTests: [
      { title: "Complete Analytics Suite", description: "All Premium Mock Tests coupled with our highest-tier detailed analytics." },
      { title: "Error Tracker", description: "A highly personalized smart 'mistake book' that compiles your frequent errors." }
    ],
    counseling: [
      { title: "Institutional Alerts", description: "Priority live alerts for spot rounds at top colleges like COEP, VJTI, and SPIT." },
      { title: "Scholarship Navigator", description: "Identify and apply for MAHA-DBT, EBC, and other hidden financial aid." },
      { title: "Premium Dashboard", description: "An elite overview tracking every single aspect from preparation to final admission." }
    ],
    benefits: [
      { title: "VIP Treatment", description: "Get priority feature updates and the most comprehensive toolset available." },
      { title: "Financial Aid Mastery", description: "Potentially recover the cost of this plan via optimized scholarship applications." },
      { title: "Spot Round Advantage", description: "Grab vacant seats at top colleges that 95% of students miss out on." }
    ],
    howItWorks: [
      { title: "Master Preparation", description: "Utilize the error tracker to aggressively push your score." },
      { title: "Navigate CAP", description: "Use our premium tools to sail confidently through major rounds." },
      { title: "Hunt Spot Seats", description: "Rely on our alert systems to find highly coveted vacant seats." },
      { title: "Claim Scholarships", description: "Effectively subsidize your college fees using our navigator." }
    ],
    personas: [
      { title: "Top Performers aims COEP/VJTI", description: "Those who need every possible edge, including spot round alerts." },
      { title: "Cost-conscious Families", description: "Those looking to maximize Mahadbt and EBC scholarship returns." },
      { title: "Those Who Want It All", description: "Parents wanting true end-to-end peace of mind without compromise." }
    ],
    faqs: [
      { title: "What are spot rounds?", description: "Institutional level rounds conducted after CAP rounds to fill vacant seats. They are highly lucrative!" },
      { title: "Will you apply for the scholarship for me?", description: "We provide the exact navigator tool, document guides, and deadlines, but you must submit the form." },
      { title: "Why is this the most popular plan?", description: "It covers the entire 6-month journey from prep to final college entry, offering unmatched value." },
      { title: "Can I connect with a human counselor?", description: "Yes, elite members receive priority customer support for complex queries." }
    ]
  }
];
