import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function PlanFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How soon can I access the features after payment?",
      a: "Access is granted immediately after successful payment. All premium features will be unlocked on your dashboard instantly."
    },
    {
      q: "Can I upgrade or change my plan later?",
      a: "Yes, you can upgrade your plan at any time. The remaining balance of your current plan will be adjusted pro-rata against the new upgrade."
    },
    {
      q: "Are the mentorship sessions one-on-one?",
      a: "Yes, all our mentorship sessions are strictly 1-on-1 to ensure personalized attention and tailored study plans just for you."
    },
    {
      q: "Is there a refund policy?",
      a: "We offer a 7-day money-back guarantee if you are not satisfied with the resources provided. Simple and transparent cancellation."
    }
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-muted/20 border-t border-border">
      <div className="container px-4 md:px-6 mx-auto max-w-3xl">
        <div className="text-center mb-12">
           <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-display text-foreground">Frequently Asked Questions</h2>
           <p className="mt-4 text-lg text-muted-foreground">Everything you need to know about purchasing.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-sm">
               <button 
                 onClick={() => setOpenIdx(openIdx === i ? null : i)}
                 className="w-full flex justify-between items-center p-6 text-left font-semibold text-lg text-foreground hover:bg-muted/50 transition-colors"
               >
                 {faq.q}
                 <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`} />
               </button>
               {openIdx === i && (
                 <div className="p-6 pt-0 text-muted-foreground leading-relaxed">
                   <div className="pt-4 border-t border-border/50">
                     {faq.a}
                   </div>
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
