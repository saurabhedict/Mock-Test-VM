import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plans } from '@/data/plans';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import PlanHero from '@/components/plan-details/PlanHero';
import PlanFeatures from '@/components/plan-details/PlanFeatures';
import PlanTargetAudience from '@/components/plan-details/PlanTargetAudience';
import PlanHowItWorks from '@/components/plan-details/PlanHowItWorks';
import PlanBenefits from '@/components/plan-details/PlanBenefits';
import PlanTestimonials from '@/components/plan-details/PlanTestimonials';
import PlanFAQ from '@/components/plan-details/PlanFAQ';
import PlanCTA from '@/components/plan-details/PlanCTA';

export default function PlanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const plan = plans.find(p => p.id === id);

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold mb-4 font-display">Plan Not Found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <Header />
      
      {/* Back button navigation */}
      <div className="w-full bg-background border-b border-border/40 py-4">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit -ml-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Plans
          </Button>
        </div>
      </div>

      <main className="flex-1 flex flex-col w-full">
        <PlanHero plan={plan} />
        <PlanFeatures plan={plan} />
        <PlanTargetAudience />
        <PlanHowItWorks />
        <PlanBenefits />
        <PlanTestimonials />
        <PlanFAQ />
        <PlanCTA plan={plan} />
      </main>

      <Footer />
    </div>
  );
}
