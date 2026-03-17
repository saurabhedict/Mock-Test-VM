import { GraduationCap, Target, Users } from 'lucide-react';

export default function PlanTargetAudience() {
  const audiences = [
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "JEE / NEET Aspirants",
      desc: "Students looking to secure top ranks in highly competitive engineering and medical entrance exams."
    },
    {
      icon: <GraduationCap className="h-8 w-8 text-primary" />,
      title: "Drop Year Students",
      desc: "Candidates taking a dedicated year to focus solely on maximizing their test scores."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Class 11 & 12 Students",
      desc: "Early starters wanting a structured approach parallel to their regular school curriculum."
    }
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-muted/30 border-y border-border/50">
      <div className="container px-4 md:px-6 mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground font-display">Who Is This Plan For?</h2>
          <p className="max-w-[700px] text-lg text-muted-foreground">
            Tailored specifically for students who are serious about their exam preparation and determined to get results.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((aud, i) => (
            <div key={i} className="p-8 bg-background rounded-2xl border border-border shadow-sm text-center flex flex-col items-center hover:border-primary/40 transition-colors">
               <div className="mb-6 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                 {aud.icon}
               </div>
               <h3 className="text-xl font-bold mb-3 text-foreground">{aud.title}</h3>
               <p className="text-muted-foreground leading-relaxed">{aud.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
