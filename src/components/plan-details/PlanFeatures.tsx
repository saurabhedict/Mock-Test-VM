import { Plan } from '@/data/plans';
import { CheckCircle } from 'lucide-react';

export default function PlanFeatures({ plan }: { plan: Plan }) {
  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <div className="container px-4 md:px-6 mx-auto max-w-7xl">
         <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground font-display">Everything Included in this Plan</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get access to all the comprehensive resources and expert guidance you need to ensure your success.
            </p>
         </div>
         <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...plan.mockTests, ...plan.counseling].map((feature, i) => (
              <div key={i} className="flex flex-col p-8 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Unlock the full potential of your preparation with our premium {feature.toLowerCase()} tailored specially for your goals.
                </p>
              </div>
            ))}
         </div>
      </div>
    </section>
  );
}
