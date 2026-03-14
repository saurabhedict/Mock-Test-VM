import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
    const text1 = "Practice Mock Tests for ";
    const text2 = "Competitive Exams";
    const text3 = "Real Exam Simulation With Instant Performance Analysis.";
    const text4 = "Prepare Smarter With Our Professional Test Interface.";


  return (


    <section className="gradient-hero relative overflow-hidden">
      <div className="container py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center gap-2 mb-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              MHTCET 2026 Mock Tests Available
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              MAH-BBA/BCA CET Mock Tests Available
            </span>
          </motion.div>

          {/* <motion.h1
            className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Practice Mock Tests for{' '}
            <span className="text-primary">Competitive Exams</span>
          </motion.h1> */}

          <motion.h1 className="text-4xl md:text-6xl font-display font-bold leading-tight">
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




          {/* <motion.p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Real exam simulation with instant performance analysis. Prepare smarter with our professional test interface.
          </motion.p> */}

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
                  className="inline-block text-muted-foreground"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}


          <br />

               <motion.span
                 className="block mt-3 text-xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent"
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
