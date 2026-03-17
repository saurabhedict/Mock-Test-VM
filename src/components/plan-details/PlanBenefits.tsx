import { TrendingUp, BookOpen, Clock, Award } from 'lucide-react';

export default function PlanBenefits() {
  const benefits = [
    {
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      title: "Rank Improvement",
      desc: "Proven strategies that have helped past students drastically improve their percentiles."
    },
    {
      icon: <BookOpen className="h-6 w-6 text-primary" />,
      title: "Clear Concepts",
      desc: "Focus on fundamentals and difficult topics with personalized attention."
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: "Time Management",
      desc: "Learn how to optimize your test-taking speed and accuracy effectively."
    },
    {
      icon: <Award className="h-6 w-6 text-primary" />,
      title: "Confidence Building",
      desc: "Reduce examination anxiety through regular practice and continuous mentorship."
    }
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-card border-y border-border">
      <div className="container px-4 md:px-6 mx-auto max-w-7xl">
         <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-6 font-display text-foreground">
                Unlock Your True Potential
              </h2>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Investing in this plan gives you more than just materials. It gives you a clear roadmap to achieving your dream college and rank.
              </p>
              <div className="grid gap-8 sm:grid-cols-2">
                 {benefits.map((b, i) => (
                   <div key={i} className="flex gap-4 group">
                      <div className="shrink-0 mt-1 p-3 rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        {b.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground mb-2 text-lg">{b.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Students studying collaboratively" 
                className="relative rounded-3xl shadow-2xl object-cover h-[500px] w-full border border-border/50" 
              />
            </div>
         </div>
      </div>
    </section>
  );
}
