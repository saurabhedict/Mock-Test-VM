// Modular exam configuration system
// Add new exams by adding entries here - no code changes needed elsewhere

export interface ExamConfig {
  examId: string;
  examName: string;
  shortName: string;
  description: string;
  icon: string;
  subjects: SubjectConfig[];
  fullLengthTests: FullLengthTestConfig[];
}

export interface SubjectConfig {
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  marksPerQuestion: number;
  papers: number;
  duration?: number; // Optional custom duration in minutes
}

export interface FullLengthTestConfig {
  testId: string;
  testName: string;
  subjects: {
    subjectName: string;
    questions: number;
    marksPerQuestion: number;
  }[];
  totalQuestions: number;
  totalMarks: number;
  papers: number;
  duration?: number; // Optional custom duration in minutes
}

export interface TestInfo {
  testId: string;
  testName: string;
  subject: string;
  totalQuestions: number;
  totalMarks: number;
  duration: number; // minutes
  type: 'subject' | 'full-length';
}

export const examConfigs: ExamConfig[] = [
  {
    examId: 'mhtcet',
    examName: 'MHT CET',
    shortName: 'MHTCET',
    description: 'Maharashtra Common Entrance Test for Engineering & Pharmacy admissions',
    icon: '🎓',
    subjects: [
      { subjectId: 'physics', subjectName: 'Physics', totalQuestions: 50, marksPerQuestion: 1, papers: 3 },
      { subjectId: 'chemistry', subjectName: 'Chemistry', totalQuestions: 50, marksPerQuestion: 1, papers: 3 },
      { subjectId: 'maths', subjectName: 'Mathematics', totalQuestions: 50, marksPerQuestion: 2, papers: 3 },
      { subjectId: 'biology', subjectName: 'Biology', totalQuestions: 100, marksPerQuestion: 1, papers: 3 },
    ],
    fullLengthTests: [
      {
        testId: 'pcm',
        testName: 'PCM Full Length Test',
        subjects: [
          { subjectName: 'Physics', questions: 50, marksPerQuestion: 1 },
          { subjectName: 'Chemistry', questions: 50, marksPerQuestion: 1 },
          { subjectName: 'Mathematics', questions: 50, marksPerQuestion: 2 },
        ],
        totalQuestions: 150,
        totalMarks: 200,
        papers: 3,
      },
      {
        testId: 'pcb',
        testName: 'PCB Full Length Test',
        subjects: [
          { subjectName: 'Physics', questions: 50, marksPerQuestion: 1 },
          { subjectName: 'Chemistry', questions: 50, marksPerQuestion: 1 },
          { subjectName: 'Biology', questions: 100, marksPerQuestion: 1 },
        ],
        totalQuestions: 200,
        totalMarks: 200,
        papers: 3,
      },
    ],
  },
  {
    examId: 'mah-bba-bca-cet',
    examName: 'MAH-BHMCT / BCA / BBA / BBM / BMS CET',
    shortName: 'MAH-BBA / BCA CET',
    description: 'Maharashtra Common Entrance Test for BHMCT, BCA, BBA, BBM, and BMS admissions',
    icon: '📊',
    subjects: [
      { subjectId: 'english', subjectName: 'English Language', totalQuestions: 40, marksPerQuestion: 1, papers: 3, duration: 40 },
      { subjectId: 'reasoning', subjectName: 'Reasoning (Verbal + Arithmetic)', totalQuestions: 30, marksPerQuestion: 1, papers: 3, duration: 40 },
      { subjectId: 'gk', subjectName: 'General Knowledge & Awareness', totalQuestions: 15, marksPerQuestion: 1, papers: 3, duration: 20 },
      { subjectId: 'computer', subjectName: 'Computer Basics', totalQuestions: 15, marksPerQuestion: 1, papers: 3, duration: 20 },
    ],
    fullLengthTests: [
      {
        testId: 'full',
        testName: 'Full Length Mock Test',
        subjects: [
          { subjectName: 'English Language', questions: 40, marksPerQuestion: 1 },
          { subjectName: 'Reasoning (Verbal + Arithmetic)', questions: 30, marksPerQuestion: 1 },
          { subjectName: 'General Knowledge & Awareness', questions: 15, marksPerQuestion: 1 },
          { subjectName: 'Computer Basics', questions: 15, marksPerQuestion: 1 },
        ],
        totalQuestions: 100,
        totalMarks: 100,
        papers: 3,
        duration: 90, // 90 minutes per full test
      },
    ],
  },
];

export function getExamById(examId: string): ExamConfig | undefined {
  return examConfigs.find(e => e.examId === examId);
}

export function getAllTests(examId: string): TestInfo[] {
  const exam = getExamById(examId);
  if (!exam) return [];

  const tests: TestInfo[] = [];

  // Subject tests
  for (const subject of exam.subjects) {
    for (let i = 1; i <= subject.papers; i++) {
      tests.push({
        testId: `${examId}-${subject.subjectId}-paper-${i}`,
        testName: `${subject.subjectName} - Paper ${i}`,
        subject: subject.subjectName,
        totalQuestions: subject.totalQuestions,
        totalMarks: subject.totalQuestions * subject.marksPerQuestion,
        duration: subject.duration || (subject.totalQuestions <= 50 ? 60 : 90),
        type: 'subject',
      });
    }
  }

  // Full length tests
  for (const flt of exam.fullLengthTests) {
    for (let i = 1; i <= flt.papers; i++) {
      tests.push({
        testId: `${examId}-${flt.testId}-paper-${i}`,
        testName: `${flt.testName} - Paper ${i}`,
        subject: flt.subjects.map(s => s.subjectName).join(', '),
        totalQuestions: flt.totalQuestions,
        totalMarks: flt.totalMarks,
        duration: flt.duration || (flt.totalQuestions <= 150 ? 180 : 210),
        type: 'full-length',
      });
    }
  }

  return tests;
}
