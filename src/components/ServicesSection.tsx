import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { services } from '@/data/services';
import { toast } from 'sonner';

export default function ServicesSection() {
  const handleBuy = (serviceName: string) => {
    toast.info(`Payment for "${serviceName}" will be available soon. Razorpay integration is in test mode.`);
  };

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">Premium Services & Counselling</h2>
          <p className="mt-3 text-muted-foreground">Get expert guidance for your exam journey</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.serviceId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover ${
                service.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              {service.popular && (
                <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-display font-bold text-foreground">{service.serviceName}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
              <div className="mt-4">
                <span className="text-2xl font-display font-bold text-foreground">₹{service.price.toLocaleString()}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {service.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                variant={service.popular ? 'default' : 'outline'}
                onClick={() => handleBuy(service.serviceName)}
              >
                Buy Now
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
