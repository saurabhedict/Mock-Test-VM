import { Plan } from '@/data/plans';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function PlanCTA({ plan }: { plan: Plan }) {
  return (
    <section className="w-full py-20 md:py-32 bg-primary/5 dark:bg-primary/10 relative overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto max-w-5xl relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 bg-card p-10 md:p-16 rounded-[2rem] border border-primary/20 shadow-2xl relative overflow-hidden">
           {/* Decorative elements */}
           <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
           <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
           
           <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground max-w-2xl relative z-10 leading-tight">
             Ready to accelerate your preparation?
           </h2>
           <p className="text-xl text-muted-foreground max-w-xl relative z-10">
             Join thousands of students who have secured top ranks with our <span className="font-semibold text-foreground">{plan.name}</span>.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-6 relative z-10">
             <Button size="lg" className="h-16 px-10 text-xl font-bold group w-full sm:w-auto shadow-xl shadow-primary/25 rounded-xl">
               Proceed to Checkout - {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
               <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
             </Button>
           </div>
           
           <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-muted-foreground font-medium relative z-10 relative z-10">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" /> Secure Checkout
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" /> 7-Day Money Back Guarantee
              </span>
           </div>
        </div>
      </div>
    </section>
  );
}
