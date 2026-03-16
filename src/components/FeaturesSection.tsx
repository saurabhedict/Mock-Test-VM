import { motion } from 'framer-motion';
import { Monitor, BarChart3, Zap } from 'lucide-react';

const features = [
  {
    icon: Monitor,
    title: 'Real Exam Simulation',
    description: 'Experience the actual exam interface with timer, question palette, and navigation — just like the real test.',
  },
  {
    icon: BarChart3,
    title: 'Instant Performance Analysis',
    description: 'Get detailed score breakdowns, subject-wise analysis, and accuracy metrics immediately after submission.',
  },
  {
    icon: Zap,
    title: 'Smart Test Interface',
    description: 'Mark questions for review, navigate freely, auto-save answers, and track your progress in real time.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-20 bg-muted/40">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">Why Choose Our Platform</h2>
          <p className="mt-3 text-muted-foreground">Built by students, for students</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
