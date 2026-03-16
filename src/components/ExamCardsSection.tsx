import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { examConfigs } from '@/data/exams';

export default function ExamCardsSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">Available Mock Tests</h2>
          <p className="mt-3 text-muted-foreground">Choose your exam and start practicing</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {examConfigs.map((exam, i) => (
            <motion.div
              key={exam.examId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/exams/${exam.examId}`}
                className="group block rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{exam.icon}</div>
                {/* <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {exam.examName}
                </h3> */}
                <h3 className="text-lg font-bold line-clamp-1">
                    {exam.shortName}
                </h3>

                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  View Tests <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Coming soon cards */}
          {['JEE Main', 'NEET'].map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (examConfigs.length + i) * 0.1 }}
              className="rounded-xl border border-dashed border-border bg-muted/50 p-6 opacity-60"
            >
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-display font-bold text-foreground">{name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
              <div className="mt-4 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Coming Soon
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
