import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExams } from '@/hooks/useExams';
import { normalizeExamAvailabilityStatus } from '@/lib/examAvailability';

interface ExamTickerItem {
  id: string;
  label: string;
  status: 'available' | 'coming_soon' | 'unavailable';
  icon: string;
}

const statusConfig = {
  available: {
    text: 'Mock Tests Available',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    Icon: CheckCircle,
  },
  coming_soon: {
    text: 'Coming Soon',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    Icon: Clock,
  },
  unavailable: {
    text: 'Tests Unavailable',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    Icon: XCircle,
  },
};

export default function HeroSection() {
  const text1 = "Practice Mock Tests for ";
  const text2 = "Competitive Exams";
  const text3 = "Real Exam Simulation With Instant Performance Analysis.";
  const text4 = "Prepare Smarter With Our Professional Test Interface.";

  const { exams, loading } = useExams();
  const [activeIndex, setActiveIndex] = useState(0);

  // Build ticker items from real exam data
  const tickerItems: ExamTickerItem[] = useMemo(() => {
    if (!exams || exams.length === 0) return [];
    return exams.map((exam) => ({
      id: exam.examId,
      label: exam.shortName || exam.examName,
      status: normalizeExamAvailabilityStatus(exam.availabilityStatus),
      icon: exam.icon || '📝',
    }));
  }, [exams]);

  // Rotate through items every 3 seconds
  useEffect(() => {
    if (tickerItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tickerItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tickerItems.length]);

  const currentItem = tickerItems[activeIndex];

  return (
    <section className="gradient-hero dark:bg-background relative overflow-hidden">
      <div className="container py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center gap-2 mb-6"
          >
            {/* Dynamic exam ticker */}
            <div className="relative h-9 w-full flex items-center justify-center overflow-hidden">
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground animate-pulse">
                  <BookOpen className="h-3.5 w-3.5" />
                  Loading exams…
                </span>
              ) : tickerItems.length > 0 && currentItem ? (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentItem.id}
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -18, scale: 0.96 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${statusConfig[currentItem.status].badgeClass}`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">{currentItem.icon}</span>
                    {currentItem.label} — {statusConfig[currentItem.status].text}
                    {(() => {
                      const StatusIcon = statusConfig[currentItem.status].Icon;
                      return <StatusIcon className="h-3.5 w-3.5 ml-0.5 opacity-70" />;
                    })()}
                  </motion.span>
                </AnimatePresence>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Mock Tests Available
                </span>
              )}
            </div>

            {/* Dots indicator */}
            {tickerItems.length > 1 && (
              <div className="flex items-center gap-1.5 mt-1">
                {tickerItems.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Show ${item.label}`}
                    onClick={() => setActiveIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex
                        ? 'w-5 bg-primary'
                        : 'w-1.5 bg-primary/25 hover:bg-primary/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>

  

         <motion.h1 className="text-4xl md:text-6xl font-display font-bold leading-tight text-foreground dark:text-white">
                  {text1.split("").map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      {char}
                    </motion.span>
                  ))}

                  <span className="text-primary">
                    {text2.split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (text1.length + i) * 0.04 }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
          </motion.h1>



              <motion.div
                className="mt-6 text-lg max-w-xl mx-auto leading-relaxed text-center"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.04
                    }
                  }
                }}
              >
                     {text3.split("").map((char, i) => (
                  <motion.span
                     key={i}
                      variants={{
                        hidden: { opacity: 0, y: 20, rotateX: -90 },
                        visible: { opacity: 1, y: 0, rotateX: 0 }
                     }}
                     transition={{
                       duration: 0.4,
                       ease: "easeOut"
                     }}
                  className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
                   >                    
                     {char === " " ? "\u00A0" : char}
                   </motion.span>
                  ))}


          <br />

               <motion.span
                className="block mt-3 text-xl font-semibold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 bg-clip-text text-transparent"
                              initial={{ opacity: 0, y: 30, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{
                   delay: 2,
                   duration: 0.7,
                   ease: "easeOut"
                 }}
               >
                 {text4}
               </motion.span>
             </motion.div>



          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/exams">
              <Button size="lg" className="gap-2 text-base px-8">
                Start Mock Test <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="text-base px-8">
                View Counselling
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
    </section>
  );
}
