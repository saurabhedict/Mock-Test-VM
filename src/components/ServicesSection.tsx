import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BuyButton from '@/components/BuyButton';
import { usePlans } from '@/hooks/usePlans';
import { formatPlanValidityLabel } from '@/lib/planValidity';
import { useAuth } from '@/context/AuthContext';
import { useExams } from '@/hooks/useExams';
import {
  getExamSpecificPlanName,
  resolveCounsellingProcessName,
  resolveExamLabel,
} from '@/lib/counsellingContext';

export default function ServicesSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { exams } = useExams();
  const selectedExam = user?.examPref || "";
  const { plans, loading } = usePlans(selectedExam);
  const examLabel = resolveExamLabel(selectedExam, exams);
  const processName = resolveCounsellingProcessName(selectedExam);
  const sectionTitle = selectedExam ? `${processName} Counselling Plans` : "Premium Services & Counselling";
  const personalizedSubtitle = selectedExam
    ? `Get expert guidance for your exam journey (${examLabel})`
    : "Get expert guidance for your exam journey";

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">{sectionTitle}</h2>
          <p className="mt-3 text-muted-foreground">{personalizedSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col rounded-xl border border-border bg-card p-6 shadow-card h-[460px]">
                <div className="h-6 bg-muted rounded-md w-3/4 mb-3"></div>
                <div className="h-4 bg-muted rounded-md w-full mb-1"></div>
                <div className="h-4 bg-muted rounded-md w-5/6 mb-8"></div>
                <div className="h-8 bg-muted rounded-md w-1/2 mb-6"></div>
                <div className="space-y-4 mb-8 flex-grow">
                  <div className="h-4 bg-muted rounded-md w-full"></div>
                  <div className="h-4 bg-muted rounded-md w-5/6"></div>
                  <div className="h-4 bg-muted rounded-md w-4/5"></div>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="h-10 bg-muted rounded-lg w-full"></div>
                  <div className="h-10 bg-muted rounded-lg w-full"></div>
                </div>
              </div>
            ))
          ) :
            plans.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted/50 p-4 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-foreground text-lg">No Plans Available</p>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  {selectedExam
                    ? `There are no counselling plans available for ${examLabel} at the moment. Please check back later.`
                    : "No counselling plans are currently available. Please check back later."}
                </p>
              </div>
            ) :
            plans.map((plan, i) => {
              const displayName = getExamSpecificPlanName(plan.name, processName);
              const features = [...plan.mockTests.slice(0, 2), ...plan.counseling.slice(0, 2)];
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  // ... Keep the rest of your existing motion.div code as it is ...

                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex flex-col relative rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                    }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-display font-bold text-foreground">{displayName}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                  <div className="mt-4">
                    <span className="text-2xl font-display font-bold text-foreground">₹{plan.price.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {formatPlanValidityLabel(plan)}
                  </p>
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
                      featureName={displayName}
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
