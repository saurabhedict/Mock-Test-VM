import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  getExamAvailabilityBadgeClass,
  getExamAvailabilityLabel,
  isExamOpenForStudents,
  normalizeExamAvailabilityStatus,
} from '@/lib/examAvailability';
import { useExams } from '@/hooks/useExams';
import { mergeExamCatalog, type DynamicExam } from '@/lib/examCatalog';

export default function ExamsPage() {
  const { user } = useAuth();
  const { exams: dynamicExams } = useExams();

  const exams = useMemo(() => {
    const merged = mergeExamCatalog(dynamicExams as DynamicExam[]);
    if (!user?.examPref) return merged;
    const preferred = merged.find((exam) => exam.examId === user.examPref);
    if (!preferred) return merged;
    return [preferred, ...merged.filter((exam) => exam.examId !== user.examPref)];
  }, [dynamicExams, user?.examPref]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold text-foreground">All Exams</h1>
        <p className="mt-2 text-muted-foreground">Select an exam to view available mock tests</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam, i) => (
            (() => {
              const isOpen = isExamOpenForStudents(exam.availabilityStatus);
              const statusLabel = getExamAvailabilityLabel(exam.availabilityStatus);
              const cardClass = `group flex h-full flex-col rounded-xl border bg-card p-6 shadow-card transition-all ${
                exam.examId === user?.examPref
                  ? "border-primary ring-1 ring-primary/20 bg-primary/[0.03]"
                  : "border-border"
              } ${isOpen ? "hover:-translate-y-1 hover:shadow-card-hover" : "cursor-not-allowed opacity-85"}`;

              const content = (
                <>
                  {exam.examId === user?.examPref && (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                      Your Preference
                    </span>
                  )}
                  {normalizeExamAvailabilityStatus(exam.availabilityStatus) !== "available" && (
                    <span className={`mb-3 inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold ${getExamAvailabilityBadgeClass(exam.availabilityStatus)}`}>
                      {statusLabel}
                    </span>
                  )}
                  <div className="text-4xl mb-3">{exam.icon}</div>
                  <h2 className={`text-lg font-bold line-clamp-1 text-foreground transition-colors ${isOpen ? "group-hover:text-primary" : ""}`}>
                    {exam.shortName}
                  </h2>

                  <p className="mt-2 min-h-10 text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {exam.subjects.length} subjects • {exam.fullLengthTests.length || 1} test groups
                  </div>
                  <div className={`mt-auto pt-4 flex items-center gap-1 text-sm font-medium ${isOpen ? "text-primary" : "text-muted-foreground"}`}>
                    {isOpen ? "View Tests" : statusLabel}
                    {isOpen && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />}
                  </div>
                </>
              );

              return (
                <motion.div
                  key={exam.examId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-full"
                >
                  {isOpen ? (
                    <Link to={`/exams/${exam.examId}`} className={cardClass}>
                      {content}
                    </Link>
                  ) : (
                    <div className={cardClass}>
                      {content}
                    </div>
                  )}
                </motion.div>
              );
            })()
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
