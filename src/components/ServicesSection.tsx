import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { plans } from '@/data/plans';
import { useNavigate } from 'react-router-dom';
import BuyButton from '@/components/BuyButton';

export default function ServicesSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">Premium Services & Counselling</h2>
          <p className="mt-3 text-muted-foreground">Get expert guidance for your exam journey</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => {
            const features = [...plan.mockTests.slice(0, 2), ...plan.counseling.slice(0, 2)];
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`flex flex-col relative rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover ${
                  plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-display font-bold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                <div className="mt-4">
                  <span className="text-2xl font-display font-bold text-foreground">₹{plan.price.toLocaleString()}</span>
                </div>
                <ul className="mt-4 mb-8 space-y-2 flex-grow">
                  {features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="leading-tight">{f.title}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    className="w-full py-2 rounded-lg border border-primary/40 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/15 hover:border-primary transition-colors duration-200"
                  >
                    View Details
                  </button>
                  <BuyButton
                    featureId={plan.id}
                    featureName={plan.name}
                    price={plan.price}
                    variant={plan.popular ? 'default' : 'outline'}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}