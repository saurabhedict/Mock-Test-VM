import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServicesSection from '@/components/ServicesSection';
import { useAuth } from '@/context/AuthContext';
import { useExams } from '@/hooks/useExams';
import { resolveCounsellingProcessName, resolveExamLabel } from '@/lib/counsellingContext';

export default function ServicesPage() {
  const { user } = useAuth();
  const { exams } = useExams();
  const selectedExam = user?.examPref || "";
  const examLabel = resolveExamLabel(selectedExam, exams);
  const processName = resolveCounsellingProcessName(selectedExam);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold text-foreground">
          {selectedExam ? `${processName} Counselling Plans` : "Premium Services"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {selectedExam
            ? `Get expert guidance for your exam journey (${examLabel})`
            : "Expert guidance and premium resources for your exam preparation"}
        </p>
      </div>
      <ServicesSection />
      <Footer />
    </div>
  );
}
