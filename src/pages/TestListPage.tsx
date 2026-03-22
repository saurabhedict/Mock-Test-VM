import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getExamById, getAllTests } from '@/data/exams';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

export default function TestListPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const exam = getExamById(examId || '');
  const staticTests = getAllTests(examId || '');
  const [dynamicTests, setDynamicTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDynamicTests = async () => {
      try {
        const { data } = await api.get(`/tests/exam/${examId}`);
        setDynamicTests(data.map((t: any) => ({
          testId: t._id,
          testName: t.title,
          subject: t.subject,
          totalQuestions: t.totalQuestions || 0,
          totalMarks: t.totalMarks,
          duration: t.durationMinutes,
          // If subject includes 'full', mark as full-length
          type: t.subject.toLowerCase().includes('full') ? 'full-length' : 'subject'
        })));
      } catch (error) {
        console.error("Failed to fetch dynamic tests:", error);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchDynamicTests();
  }, [examId]);

  const tests = [...staticTests, ...dynamicTests];

  if (!exam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Exam not found</h1>
          <Link to="/exams" className="mt-4 inline-block text-primary hover:underline">Back to Exams</Link>
        </div>
      </div>
    );
  }

  const subjectTests = tests.filter(t => t.type === 'subject');
  const fullLengthTests = tests.filter(t => t.type === 'full-length');

  // Group subject tests by subject
  const groupedSubjects: Record<string, typeof subjectTests> = {};
  subjectTests.forEach(t => {
    const sub = t.subject;
    if (!groupedSubjects[sub]) groupedSubjects[sub] = [];
    groupedSubjects[sub].push(t);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">{exam.icon}</span>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{exam.examName} Mock Tests</h1>
            <p className="text-muted-foreground">{exam.description || 'Practice with real-time exam simulation.'}</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Dynamic / Subject-wise Tests */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Subject-wise Tests</h2>
        <div className="space-y-6 mb-12">
          {Object.entries(groupedSubjects).map(([subject, subTests]) => (
            <div key={subject}>
              <h3 className="text-lg font-semibold text-foreground mb-3">{subject}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subTests.map((test, i) => (
                  <motion.div
                    key={test.testId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-primary/5 hover:border-primary/20 transition-all group"
                  >
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{test.testName}</h4>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {test.totalQuestions} Qs</span>
                      <span>{test.totalMarks} Marks</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {test.duration} min</span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 gap-1 w-full"
                      onClick={() => navigate(`/test/${test.testId}`)}
                    >
                      Start Test <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Full Length Tests */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Full Length Tests</h2>
        <div className="space-y-6">
          {/* Static Full Length Sections */}
          {exam.fullLengthTests.map(flt => {
            const fltTests = fullLengthTests.filter(t => t.testId.includes(flt.testId) || (t.subject.toLowerCase().includes(flt.testId.toLowerCase()) && !t.testId.includes('-')));
            
            // To prevent duplication, we'll mark which dynamic tests are consumed here
            return (
              <div key={flt.testId}>
                <h3 className="text-lg font-semibold text-foreground mb-3">{flt.testName} <span className="text-sm font-normal text-muted-foreground">({flt.totalQuestions} Qs)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fltTests.map((test, i) => (
                    <motion.div
                      key={test.testId}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm hover:shadow-md transition-all"
                    >
                        <h4 className="font-semibold text-foreground">{test.testName}</h4>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">Q: {test.totalQuestions}</span>
                            <span>{test.totalMarks} M</span>
                            <span className="flex items-center gap-1">{test.duration} min</span>
                        </div>
                        <Button
                            size="sm"
                            className="mt-4 w-full"
                            onClick={() => navigate(`/test/${test.testId}`)}
                        >
                            Start Full Test
                        </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Collect Any Remaining Full Length Tests (Dynamic ones that didn't match sections) */}
          {fullLengthTests.filter(t => !exam.fullLengthTests.some(flt => t.testId.includes(flt.testId) || (t.subject.toLowerCase().includes(flt.testId.toLowerCase()) && !t.testId.includes('-')))).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Additional Full Length Tests</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fullLengthTests.filter(t => !exam.fullLengthTests.some(flt => t.testId.includes(flt.testId) || (t.subject.toLowerCase().includes(flt.testId.toLowerCase()) && !t.testId.includes('-')))).map((test, i) => (
                   <motion.div
                    key={test.testId}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm hover:shadow-md transition-all"
                    >
                    <h4 className="font-semibold text-foreground">{test.testName}</h4>
                    <p className="text-xs text-muted-foreground">{test.subject}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{test.totalQuestions} Qs</span>
                        <span>{test.totalMarks} Marks</span>
                        <span>{test.duration} min</span>
                    </div>
                    <Button size="sm" className="mt-4 w-full" onClick={() => navigate(`/test/${test.testId}`)}>Start Test</Button>
                   </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
