import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getExamAvailabilityBadgeClass,
  getExamAvailabilityLabel,
  isExamOpenForStudents,
  normalizeExamAvailabilityStatus,
} from '@/lib/examAvailability';
import { useExams } from '@/hooks/useExams';
import { mergeExamCatalog, type DynamicExam } from '@/lib/examCatalog';

export default function ExamCardsSection() {
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
    <section className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">Available Mock Tests</h2>
          <p className="mt-3 text-muted-foreground">Choose your exam and start practicing</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
                  <div className="text-4xl mb-4">{exam.icon}</div>
                  <h3 className="text-lg font-bold line-clamp-1">
                    {exam.shortName}
                  </h3>

                  <p className="mt-2 min-h-10 text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
                  <div className={`mt-auto pt-4 flex items-center gap-1 text-sm font-medium ${isOpen ? "text-primary" : "text-muted-foreground"}`}>
                    {isOpen ? "View Tests" : statusLabel}
                    {isOpen && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
                  </div>
                </>
              );

              return (
                <motion.div
                  key={exam.examId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
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
    </section>
  );
}
