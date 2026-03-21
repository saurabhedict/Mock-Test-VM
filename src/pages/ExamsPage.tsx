import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { examConfigs } from '@/data/exams';

export default function ExamsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold text-foreground">All Exams</h1>
        <p className="mt-2 text-muted-foreground">Select an exam to view available mock tests</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {examConfigs.map((exam, i) => (
            <motion.div
              key={exam.examId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/exams/${exam.examId}`}
                className="group block rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">{exam.icon}</div>
                {/* <h2 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {exam.examName}
                </h2> */}
                <h2 className="text-lg font-bold line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                       {exam.shortName}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">{exam.description}</p>
                <div className="mt-3 text-sm text-muted-foreground">
                  {exam.subjects.length} subjects • {exam.fullLengthTests.length} full-length test types
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  View Tests <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
