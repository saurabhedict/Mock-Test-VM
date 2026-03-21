import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServicesSection from '@/components/ServicesSection';

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold text-foreground">Premium Services</h1>
        <p className="mt-2 text-muted-foreground">Expert guidance and premium resources for your exam preparation</p>
      </div>
      <ServicesSection />
      <Footer />
    </div>
  );
}
