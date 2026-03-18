import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { plans } from '@/data/plans';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, BookOpen, Users, Target, Rocket, Zap, HelpCircle, ArrowRight } from 'lucide-react';
import BuyButton from '@/components/BuyButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PlanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plan = plans.find((p) => p.id === id);

  // Scroll to top automatically
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-3xl font-bold font-display text-foreground">Plan not found</h2>
          <p className="text-muted-foreground mt-2">The plan you are looking for does not exist.</p>
          <button onClick={() => navigate("/services")} className="mt-8 text-primary hover:underline font-medium inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Services
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // Plan level index for upgrade hint
  const currentPlanIndex = plans.findIndex(p => p.id === id);
  const nextPlan = currentPlanIndex < plans.length - 1 ? plans[currentPlanIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Header />
      
      <main className="flex-1">
        {/* --- HERO SECTION --- md:py-24 py-16 */}
        <section className="bg-primary/5 py-16 md:py-24 relative overflow-hidden">
          <div className="container relative z-10 max-w-6xl mx-auto px-4 md:px-6">
            <Link to="/services" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors bg-background/50 px-3 py-1.5 rounded-full border border-border/50 shadow-sm backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Plans
            </Link>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 lg:col-span-7"
              >
                <div className="space-y-4">
                  {plan.popular && (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full border border-primary/20 shadow-sm">
                      <Zap className="w-3.5 h-3.5" /> Most Popular Choice
                    </span>
                  )}
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-foreground tracking-tight leading-tight">
                    {plan.name}
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                    {plan.tagline}
                  </p>
                </div>
                
                <div className="inline-flex items-center gap-2 text-sm text-foreground/80 bg-background shadow-sm border border-border rounded-lg px-4 py-3">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">Perfect for:</span> {plan.target}
                </div>
                
                {/* Mobile/Tablet CTA visible only on small screens */}
                <div className="block lg:hidden pt-4">
                   <BuyButton
                      featureId={plan.id}
                      featureName={plan.name}
                      price={plan.price}
                      variant="default"
                      className="w-full h-14 text-lg font-bold shadow-md hover:shadow-lg transition-all"
                      label={`Get ${plan.name} Now`}
                    />
                </div>
              </motion.div>

              {/* Hero Pricing Card */}
              <motion.div
                 initial={{ opacity: 0, x: 30 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="hidden lg:block lg:col-span-5 relative"
              >
                 <div className="bg-card border-none ring-1 ring-border/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm z-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">One-time Investment</h3>
                    <div className="flex items-end gap-1 mb-6">
                      <span className="text-6xl font-extrabold font-display text-foreground tracking-tighter">₹{plan.price.toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                       <div className="flex items-center gap-3 text-muted-foreground">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground/80">Instant digital access</span>
                       </div>
                       <div className="flex items-center gap-3 text-muted-foreground">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground/80">Secure online payment</span>
                       </div>
                       <div className="flex items-center gap-3 text-muted-foreground">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground/80">Active until CET 2026</span>
                       </div>
                    </div>

                    <BuyButton
                      featureId={plan.id}
                      featureName={plan.name}
                      price={plan.price}
                      variant="default"
                      className="w-full h-14 text-lg font-bold shadow-md hover:shadow-lg transition-all"
                      label={`Get Access Now`}
                    />
                 </div>
              </motion.div>
            </div>
          </div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
        </section>

        {/* --- WHAT'S INCLUDED SECTION --- */}
        <section className="py-20 bg-background border-b border-border/50">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">What's Included</h2>
              <p className="text-muted-foreground text-lg">Everything you need to succeed, broken down into powerful features.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Mock Tests Array */}
              <div className="space-y-6 lg:border-r border-border/50 lg:pr-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-primary/10 p-4 rounded-2xl text-primary ring-1 ring-primary/20 shadow-sm">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-display">Mock Tests & Practice</h3>
                    <p className="text-sm text-muted-foreground font-medium">Top-tier testing environment</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {plan.mockTests.map((feature, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow flex gap-4"
                    >
                      <div className="text-primary mt-1">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground mb-1">{feature.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Counseling Array */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-secondary/10 p-4 rounded-2xl text-secondary ring-1 ring-secondary/20 shadow-sm">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-display">Counseling & Guidance</h3>
                    <p className="text-sm text-muted-foreground font-medium">Expert admission tools</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {plan.counseling.map((feature, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow flex gap-4"
                    >
                      <div className="text-primary mt-1">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground mb-1">{feature.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS & BENEFITS --- */}
        <section className="py-20 bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              
              {/* How it works */}
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground mb-8">How It Works</h2>
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/80 before:to-transparent">
                  {plan.howItWorks.map((step, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active cursor-default"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/10 text-primary font-bold shadow-sm z-10 mx-0 md:mx-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        {idx + 1}
                      </div>

                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border bg-card shadow-sm group-hover:border-primary/40 group-hover:shadow-md transition-all">
                        <h4 className="font-bold text-foreground text-lg mb-1">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Benefits & Personas */}
              <div className="space-y-12">
                <div>
                  <h2 className="text-3xl font-display font-bold text-foreground mb-8">Why Choose This Plan</h2>
                  <div className="grid gap-6">
                    {plan.benefits.map((benefit, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-4 p-5 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/20 transition-colors"
                      >
                        <div className="text-primary mt-1"><Rocket className="w-6 h-6"/></div>
                        <div>
                          <h4 className="font-bold text-foreground text-lg">{benefit.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{benefit.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />
                  <h3 className="text-2xl font-display font-bold text-foreground mb-6 relative z-10">Who Is This For?</h3>
                  <div className="flex flex-wrap gap-4 relative z-10">
                    {plan.personas.map((persona, idx) => (
                      <div key={idx} className="bg-background border border-border rounded-xl p-4 flex-1 min-w-[200px] shadow-sm">
                        <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
                           <Users className="w-4 h-4"/> {persona.title}
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium">{persona.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="py-20 bg-background border-t border-border/50">
          <div className="container max-w-4xl mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
               <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground text-lg">Everything you need to know about the {plan.name}.</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
              {plan.faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="bg-card px-6 rounded-2xl border border-border shadow-sm">
                  <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline py-5 text-foreground hover:text-primary transition-colors">
                    {faq.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {faq.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* --- FINAL CTA & UPGRADE HINT --- */}
        <section className="py-24 bg-foreground text-background relative overflow-hidden">
           <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-white to-white" />
           <div className="container max-w-4xl mx-auto px-4 md:px-6 relative z-10 text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-display font-bold">Ready to secure your future?</h2>
              <p className="text-xl text-background/80 max-w-2xl mx-auto font-medium">
                 Join thousands of top scorers using the {plan.name} to maximize their CET outcome. Start your journey today.
              </p>
              
              <div className="flex justify-center pt-4 max-w-sm mx-auto">
                  <BuyButton
                    featureId={plan.id}
                    featureName={plan.name}
                    price={plan.price}
                    variant="default"
                    className="w-full h-14 text-lg font-bold shadow-xl"
                    label={`Checkout Now`}
                  />
              </div>

              {/* Upgrade Hint */}
              {nextPlan && (
                <div className="mt-16 pt-8 border-t border-background/20 inline-block w-full text-center">
                   <p className="text-background/60 mb-2 font-medium">Looking for even more features & guidance?</p>
                   <Link 
                     to={`/plan/${nextPlan.id}`}
                     className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors font-semibold group"
                   >
                      Explore the {nextPlan.name} 
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </Link>
                </div>
              )}
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
