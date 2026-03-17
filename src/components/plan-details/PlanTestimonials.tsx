import { Star } from 'lucide-react';

export default function PlanTestimonials() {
  const testimonials = [
    {
      name: "Rahul Sharma",
      role: "JEE Aspirant",
      content: "This plan completely changed my preparation strategy. The mentorship and regular tests helped me identify my weak spots early on.",
      initials: "RS"
    },
    {
      name: "Priya Patel",
      role: "NEET Ranker",
      content: "The level of detail in the reports and the support from the community is unmatched. Highly recommend to everyone serious about their goals.",
      initials: "PP"
    },
    {
      name: "Amit Kumar",
      role: "Drop Year Student",
      content: "I was confused about my preparation but the structured approach in this plan kept me on track. The features are definitely worth the investment.",
      initials: "AK"
    }
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <div className="container px-4 md:px-6 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-display text-foreground">What Our Students Say</h2>
          <p className="mt-4 text-lg text-muted-foreground">Join hundreds of successful candidates.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className="p-8 bg-muted/40 rounded-2xl border border-border relative hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-yellow-400 mb-6">
                {[...Array(5)].map((_, j) => <Star key={j} className="h-5 w-5 fill-current" />)}
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed italic">"{t.content}"</p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-lg">
                  {t.initials}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{t.name}</h4>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
