const mongoose = require("mongoose");
require("dotenv").config();

const Exam = require("./models/Exam");

const examBlueprints = [
  {
    slug: "mhtcet-pcm",
    name: "MHT-CET PCM",
    shortName: "MHTCET PCM",
    description:
      "Official MHT-CET PCM pattern with Physics, Chemistry, and Mathematics. Physics and Chemistry carry 1 mark each, Mathematics carries 2 marks each.",
    icon: "📘",
    durationMinutes: 180,
    subjects: [
      { name: "Physics", code: "physics", questionCount: 50, marksPerQuestion: 1 },
      { name: "Chemistry", code: "chemistry", questionCount: 50, marksPerQuestion: 1 },
      { name: "Mathematics", code: "mathematics", questionCount: 50, marksPerQuestion: 2 },
    ],
  },
  {
    slug: "mhtcet-pcb",
    name: "MHT-CET PCB",
    shortName: "MHTCET PCB",
    description:
      "Official MHT-CET PCB pattern with Physics, Chemistry, and Biology. All questions carry 1 mark each.",
    icon: "🧪",
    durationMinutes: 180,
    subjects: [
      { name: "Physics", code: "physics", questionCount: 50, marksPerQuestion: 1 },
      { name: "Chemistry", code: "chemistry", questionCount: 50, marksPerQuestion: 1 },
      { name: "Biology", code: "biology", questionCount: 100, marksPerQuestion: 1 },
    ],
  },
  {
    slug: "mah-mba-cet",
    name: "MAH MBA/MMS CET",
    shortName: "MBA CET",
    description:
      "Official MAH MBA/MMS CET structure from the State CET Cell with four sections and 150 minutes total duration.",
    icon: "💼",
    durationMinutes: 150,
    subjects: [
      { name: "Logical Reasoning", code: "logical-reasoning", questionCount: 75, marksPerQuestion: 1 },
      { name: "Abstract Reasoning", code: "abstract-reasoning", questionCount: 25, marksPerQuestion: 1 },
      { name: "Quantitative Aptitude", code: "quantitative-aptitude", questionCount: 50, marksPerQuestion: 1 },
      {
        name: "Verbal Ability / Reading Comprehension",
        code: "verbal-ability-reading-comprehension",
        questionCount: 50,
        marksPerQuestion: 1,
      },
    ],
  },
  {
    slug: "neet-ug",
    name: "NEET UG",
    shortName: "NEET",
    description:
      "Official NEET UG 2026 pattern with 180 compulsory questions across Physics, Chemistry, Botany, and Zoology.",
    icon: "🩺",
    durationMinutes: 180,
    subjects: [
      { name: "Physics", code: "physics", questionCount: 45, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Chemistry", code: "chemistry", questionCount: 45, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Botany", code: "botany", questionCount: 45, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Zoology", code: "zoology", questionCount: 45, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
    ],
  },
  {
    slug: "jee-main",
    name: "JEE Main",
    shortName: "JEE Main",
    description:
      "Paper 1 (B.E./B.Tech.) default blueprint with Physics, Chemistry, and Mathematics. Use per-test overrides if you want year-specific section behavior.",
    icon: "🧮",
    durationMinutes: 180,
    subjects: [
      { name: "Physics", code: "physics", questionCount: 25, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Chemistry", code: "chemistry", questionCount: 25, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Mathematics", code: "mathematics", questionCount: 25, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
    ],
  },
  {
    slug: "jee-advanced",
    name: "JEE Advanced",
    shortName: "JEE Adv",
    description:
      "Admin-editable default based on two compulsory papers with Physics, Chemistry, and Mathematics. JEE Advanced marking varies by year, so use question-level overrides whenever a section has a different positive or negative mark.",
    icon: "🚀",
    durationMinutes: 360,
    subjects: [
      { name: "Physics", code: "physics", questionCount: 36, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Chemistry", code: "chemistry", questionCount: 36, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
      { name: "Mathematics", code: "mathematics", questionCount: 36, marksPerQuestion: 4, negativeMarksPerQuestion: 1 },
    ],
  },
  {
    slug: "cuet-ug",
    name: "CUET UG",
    shortName: "CUET",
    description:
      "Flexible CUET UG starter blueprint with Language, Domain, and General Aptitude blocks. Each paper in CUET is 60 minutes with 50 compulsory questions, and admins can customize subject combinations per test.",
    icon: "🎓",
    durationMinutes: 60,
    subjects: [
      { name: "Language Test", code: "language-test", questionCount: 50, marksPerQuestion: 5 },
      { name: "Domain Subject Test", code: "domain-subject-test", questionCount: 50, marksPerQuestion: 5 },
      { name: "General Aptitude Test", code: "general-aptitude-test", questionCount: 50, marksPerQuestion: 5 },
    ],
  },
  {
    slug: "comedk-uget",
    name: "COMEDK UGET",
    shortName: "COMEDK",
    description:
      "Official COMEDK UGET engineering pattern with 180 questions across Physics, Chemistry, and Mathematics.",
    icon: "🏫",
    durationMinutes: 180,
    subjects: [
      { name: "Physics", code: "physics", questionCount: 60, marksPerQuestion: 1 },
      { name: "Chemistry", code: "chemistry", questionCount: 60, marksPerQuestion: 1 },
      { name: "Mathematics", code: "mathematics", questionCount: 60, marksPerQuestion: 1 },
    ],
  },
];

const withTotals = (exam) => {
  const totalQuestions = exam.subjects.reduce((sum, subject) => sum + Number(subject.questionCount || 0), 0);
  const totalMarks = exam.subjects.reduce(
    (sum, subject) => sum + Number(subject.questionCount || 0) * Number(subject.marksPerQuestion || 0),
    0
  );

  return {
    ...exam,
    totalQuestions,
    totalMarks,
    availabilityStatus: "available",
    isActive: true,
  };
};

const seedExamBlueprints = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB...");

    for (const exam of examBlueprints.map(withTotals)) {
      const result = await Exam.findOneAndUpdate(
        { slug: exam.slug },
        { $set: exam },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      console.log(`Upserted blueprint: ${result.shortName} (${result.slug})`);
    }

    console.log(`Seeded ${examBlueprints.length} exam blueprints.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding exam blueprints:", error);
    process.exit(1);
  }
};

seedExamBlueprints();
