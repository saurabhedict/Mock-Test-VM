export default function PlanHowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Complete Registration",
      desc: "Sign up and complete your payment to get instant access to the platform."
    },
    {
      num: "2",
      title: "Get Assigned a Mentor",
      desc: "We will pair you with an expert mentor based on your specific profile."
    },
    {
      num: "3",
      title: "Weekly Sessions",
      desc: "Engage in structured weekly 1-on-1 sessions and regular mock tests."
    },
    {
      num: "4",
      title: "Track Progress",
      desc: "Monitor your improvement with detailed analytics and expert feedback."
    }
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <div className="container px-4 md:px-6 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-display text-foreground">How It Works</h2>
          <p className="mt-4 text-lg text-muted-foreground">A simple, effective process to supercharge your learning.</p>
        </div>
        <div className="grid gap-12 md:grid-cols-4 relative">
           <div className="hidden md:block absolute top-[3rem] left-[12%] right-[12%] h-0.5 bg-border"></div>
           {steps.map((step, i) => (
             <div key={i} className="relative flex flex-col items-center text-center group">
                 <div className="w-24 h-24 mb-6 rounded-full bg-background border-[6px] border-muted flex items-center justify-center text-3xl font-extrabold text-muted-foreground shadow-sm z-10 transition-colors group-hover:border-primary group-hover:text-primary">
                    {step.num}
                 </div>
                 <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                 <p className="text-muted-foreground text-sm max-w-[220px] leading-relaxed">{step.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
