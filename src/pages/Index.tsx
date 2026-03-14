import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ExamCardsSection from '@/components/ExamCardsSection';
import FeaturesSection from '@/components/FeaturesSection';
import ServicesSection from '@/components/ServicesSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ExamCardsSection />
      <FeaturesSection />
      <ServicesSection />
      <Footer />
    </div>
  );
};

export default Index;
