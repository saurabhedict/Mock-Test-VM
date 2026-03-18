// Question generation system for mock tests

export interface Question {
  questionId: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  subject: string;
  explanation: string;
}

// Generate dummy questions for a given subject and count
function generateSubjectQuestions(subject: string, count: number): Question[] {
  const topics: Record<string, string[]> = {
    Physics: [
      'Kinematics', 'Laws of Motion', 'Work, Energy & Power', 'Rotational Motion',
      'Gravitation', 'Oscillations', 'Waves', 'Thermodynamics', 'Electrostatics',
      'Current Electricity', 'Magnetic Effects', 'Electromagnetic Induction',
      'Optics', 'Dual Nature of Matter', 'Atoms and Nuclei', 'Semiconductor Electronics',
    ],
    Chemistry: [
      'Atomic Structure', 'Chemical Bonding', 'States of Matter', 'Thermodynamics',
      'Equilibrium', 'Redox Reactions', 'Organic Chemistry', 'Coordination Compounds',
      'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry', 'Polymers',
      'Biomolecules', 'Environmental Chemistry', 'Solid State', 'd-Block Elements',
    ],
    Mathematics: [
      'Sets & Relations', 'Trigonometry', 'Complex Numbers', 'Quadratic Equations',
      'Sequences & Series', 'Permutations', 'Binomial Theorem', 'Matrices',
      'Determinants', 'Limits & Continuity', 'Differentiation', 'Integration',
      'Differential Equations', 'Vectors', 'Three-Dimensional Geometry', 'Probability',
    ],
    Biology: [
      'Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Plant Physiology',
      'Reproduction', 'Evolution', 'Biotechnology', 'Microorganisms', 'Biodiversity',
      'Human Health', 'Animal Kingdom', 'Plant Kingdom', 'Biomolecules',
      'Morphology of Plants', 'Anatomy of Plants', 'Digestion', 'Respiration',
      'Excretion', 'Locomotion',
    ],
    English: [
      'Grammar', 'Vocabulary', 'Synonyms / Antonyms', 'Reading Comprehension', 'Sentence correction', 'Fill in the blanks'
    ],
    Reasoning: [
      'Blood relations', 'Coding decoding', 'Direction sense', 'Series completion', 'Number reasoning', 'Analogy'
    ],
    'General Knowledge': [
      'Current affairs', 'Indian history', 'Geography', 'Polity', 'Economy', 'Static GK'
    ],
    'Computer Basics': [
      'Input / Output devices', 'Internet basics', 'MS Office', 'Hardware & Software', 'Operating System'
    ],
  };

  const bbaSampleQuestions: Record<string, Omit<Question, 'questionId' | 'subject'>[]> = {
    English: [
      {
        question: '"Don\'t put all your eggs in one basket" means:',
        options: ['Don\'t invest all your resources in one thing', 'Always carry multiple baskets', 'Be careful while shopping', 'Avoid eating too many eggs'],
        correctAnswer: 0,
        explanation: 'This proverb means one should not concentrate all efforts and resources in one area as one could lose everything.',
      },
      {
        question: 'Find out the correct word for the statement: A person who loves humanity and works for its welfare.',
        options: ['Egoist', 'Pessimist', 'Philanthropist', 'Misanthrope'],
        correctAnswer: 2,
        explanation: 'A philanthropist is a person who seeks to promote the welfare of others, especially by the generous donation of money to good causes.',
      },
      {
        question: 'Choose the correct modal verb: "You ___ go to the doctor if you are sick."',
        options: ['might', 'can', 'may', 'must'],
        correctAnswer: 3,
        explanation: '"Must" indicates strong obligation or necessity, appropriate when given advice regarding sickness.',
      },
      {
        question: 'Choose the correct sentence: (Degree of Comparison)',
        options: ['This is the most easy way.', 'This is the easiest way.', 'This is the most easiest way.', 'This is the more easier way.'],
        correctAnswer: 1,
        explanation: '"Easiest" is the correct superlative form of the adjective "easy".',
      },
      {
        question: 'What type of sentence is this? "How beautiful the sunset is!"',
        options: ['Interrogative', 'Exclamatory', 'Assertive', 'Imperative'],
        correctAnswer: 1,
        explanation: 'It expresses strong emotion and ends with an exclamation mark.',
      },
      {
        question: 'Identify the missing punctuation. "Johns book is on the table."',
        options: ['Johns', 'John,s', 'Johns\'', 'John\'s'],
        correctAnswer: 3,
        explanation: 'The apostrophe \'s implies possession.',
      }
    ],
    Reasoning: [
      {
        question: 'Look at this series: 70, 5, 60, 10, 50, 15, 40, ... What number should come next?',
        options: ['50', '30', '25', '20'],
        correctAnswer: 3,
        explanation: 'This is an alternating series. 70, 60, 50, 40 (decreases by 10) and 5, 10, 15, 20 (increases by 5). The next number is 20.',
      },
      {
        question: 'Which word does NOT belong with the others?',
        options: ['branch', 'dirt', 'leaf', 'root'],
        correctAnswer: 1,
        explanation: 'Branch, leaf, and root are all parts of a tree. Dirt is not.',
      },
      {
        question: 'CUP : LIP :: BIRD : ?',
        options: ['GRASS', 'FOREST', 'BEAK', 'BUSH'],
        correctAnswer: 2,
        explanation: 'You drink from a cup with your lip, and a bird eats/drinks with its beak.',
      },
      {
        question: 'A person crosses a 900 m long street in 5 minutes. What is his speed in km per hour?',
        options: ['3.6', '7.2', '8.4', '10.8'],
        correctAnswer: 3,
        explanation: 'Speed = Distance / Time. 900m / 5m = 180 m/min = 3 m/sec. 3 * (18/5) = 10.8 km/hr.',
      }
    ],
    'General Knowledge': [
      {
        question: 'Which of the following taxes have been subsumed in GST?',
        options: ['Central sales tax', 'Central Excise Duty', 'VAT', 'All the Above'],
        correctAnswer: 3,
        explanation: 'GST (Goods and Services Tax) has replaced multiple indirect taxes including Central Excise Duty, VAT, and Central sales tax.',
      },
      {
        question: 'Where was the bilateral military exercise between India and Singapore "Agni Warrior 2024" held?',
        options: ['Gujarat', 'Maharashtra', 'Andhra Pradesh', 'New Delhi'],
        correctAnswer: 1,
        explanation: 'Agni Warrior is a bilateral exercise held between the armies of India and Singapore, typically in Maharashtra (Devlali).',
      },
      {
        question: 'Which of these is associated with the National Film awards by Govt of India?',
        options: ['Golden Peacock', 'Golden Lotus', 'Golden Elephant', 'Golden Bear'],
        correctAnswer: 1,
        explanation: 'The Golden Lotus (Swarna Kamal) is top prize awarded at the National Film Awards.',
      }
    ],
    'Computer Basics': [
      {
        question: 'Which of the following is not a kind of system software?',
        options: ['BIOS software', 'Unix, Linux', 'Microsoft Windows, and Mac OS', 'Microsoft Word'],
        correctAnswer: 3,
        explanation: 'Microsoft Word is an application software, not system software.',
      },
      {
        question: 'Which input device is used for input text, numbers, and commands to the computer?',
        options: ['Mouse', 'Keyboard', 'Scanner', 'Printer'],
        correctAnswer: 1,
        explanation: 'The keyboard is the primary device for typing text and numbers.',
      },
      {
        question: 'Which of the following is a type of secondary memory?',
        options: ['RAM', 'Cache', 'Hard disk', 'Register'],
        correctAnswer: 2,
        explanation: 'Hard disk drives are common types of secondary non-volatile memory storage.',
      },
      {
        question: 'Software programs developed for performing particular tasks related to managing computer resources is called:',
        options: ['System software', 'Utility software', 'Application software', 'Helper software'],
        correctAnswer: 1,
        explanation: 'Utility software helps to manage, maintain and control computer resources.',
      }
    ]
  };

  const subjectTopics = topics[subject] || topics.Physics;
  const questions: Question[] = [];

  const sampleSet = bbaSampleQuestions[subject] || [];

  for (let i = 0; i < count; i++) {
    if (sampleSet.length > 0 && i < sampleSet.length) {
      questions.push({
        questionId: i + 1,
        subject,
        ...sampleSet[i],
      });
    } else {
      const topic = subjectTopics[i % subjectTopics.length];
      const correctAnswer = Math.floor(Math.random() * 4);

      questions.push({
        questionId: i + 1,
        question: `[${subject}] ${topic}: Question ${i + 1} — Which of the following statements about ${topic.toLowerCase()} is correct?`,
        options: [
          `Option A — Statement about ${topic.toLowerCase()} (variant 1)`,
          `Option B — Statement about ${topic.toLowerCase()} (variant 2)`,
          `Option C — Statement about ${topic.toLowerCase()} (variant 3)`,
          `Option D — Statement about ${topic.toLowerCase()} (variant 4)`,
        ],
        correctAnswer,
        subject,
        explanation: `The correct answer is Option ${String.fromCharCode(65 + correctAnswer)}. This relates to the concept of ${topic.toLowerCase()} in ${subject}. In a real exam, a detailed explanation would be provided here.`,
      });
    }
  }

  return questions;
}

// Cache generated questions
const questionCache: Record<string, Question[]> = {};

export function getQuestionsForTest(testId: string): Question[] {
  if (questionCache[testId]) return questionCache[testId];

  let questions: Question[] = [];

  // Parse testId: e.g., mhtcet-physics-paper-1, mah-bba-bca-cet-english-paper-1
  const parts = testId.split('-');
  const subjectOrType = parts[parts.length - 3] || 'physics';

  if (subjectOrType === 'pcm') {
    questions = [
      ...generateSubjectQuestions('Physics', 50),
      ...generateSubjectQuestions('Chemistry', 50),
      ...generateSubjectQuestions('Mathematics', 50),
    ];
    // Re-number
    questions.forEach((q, i) => q.questionId = i + 1);
  } else if (subjectOrType === 'pcb') {
    questions = [
      ...generateSubjectQuestions('Physics', 50),
      ...generateSubjectQuestions('Chemistry', 50),
      ...generateSubjectQuestions('Biology', 100),
    ];
    questions.forEach((q, i) => q.questionId = i + 1);
  } else if (subjectOrType === 'full') {
    questions = [
      ...generateSubjectQuestions('English', 40),
      ...generateSubjectQuestions('Reasoning', 30),
      ...generateSubjectQuestions('General Knowledge', 15),
      ...generateSubjectQuestions('Computer Basics', 15),
    ];
    questions.forEach((q, i) => q.questionId = i + 1);
  } else {
    const subjectMap: Record<string, { name: string; count: number }> = {
      physics: { name: 'Physics', count: 50 },
      chemistry: { name: 'Chemistry', count: 50 },
      maths: { name: 'Mathematics', count: 50 },
      biology: { name: 'Biology', count: 100 },
      english: { name: 'English', count: 40 },
      reasoning: { name: 'Reasoning', count: 30 },
      gk: { name: 'General Knowledge', count: 15 },
      computer: { name: 'Computer Basics', count: 15 },
    };
    const sub = subjectMap[subjectOrType];
    if (sub) {
      questions = generateSubjectQuestions(sub.name, sub.count);
    }
  }

  // Add paper variation by using the paper number as seed offset
  const paperNum = parseInt(parts[parts.length - 1]) || 1;
  if (paperNum > 1) {
    // Shuffle questions deterministically based on paper number
    questions = questions.map((q, i) => ({
      ...q,
      question: q.question.replace(`Question ${i + 1}`, `Question ${i + 1} (Set ${paperNum})`),
      correctAnswer: (q.correctAnswer + paperNum - 1) % 4,
    }));
  }

  questionCache[testId] = questions;
  return questions;
}
