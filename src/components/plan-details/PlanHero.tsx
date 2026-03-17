import { Plan } from '@/data/plans';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function PlanHero({ plan }: { plan: Plan }) {
  return (
    <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-primary/10 to-background border-b border-border/50">
      <div className="container px-4 md:px-6 mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4 relative z-10">
              {plan.popular && (
                <div className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-sm font-semibold text-primary w-fit">
                  ★ Most Popular Choice
                </div>
              )}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl text-foreground font-display">
                {plan.name}
              </h1>
              <p className="max-w-[600px] text-lg text-muted-foreground leading-relaxed">
                {plan.tagline}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold group w-full sm:w-auto">
                Proceed to Payment 
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-10 bg-card rounded-2xl shadow-xl border border-border/50 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
             <div className="relative z-10">
               <div className="text-sm uppercase tracking-wider text-primary font-bold mb-2">One-time payment</div>
               <div className="flex items-baseline text-6xl font-extrabold font-display text-foreground">
                 {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
               </div>
               <div className="mt-8 space-y-4">
                 <h3 className="font-semibold text-foreground text-lg mb-4">Core Benefits:</h3>
                 <ul className="space-y-4">
                   {[...plan.mockTests, ...plan.counseling].slice(0, 4).map((feature, i) => (
                     <li key={i} className="flex items-start gap-3">
                       <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                       <span className="font-medium text-muted-foreground leading-snug">{feature}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
