const DEFAULT_DIFFICULTY_ORDER = ["medium", "easy", "hard"];

const shuffleArray = (items = []) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const prioritizeQuestions = (questions, weakTopicsSet) => {
  const buckets = Array.from({ length: 6 }, () => []);

  for (const question of questions) {
    const weakTopicRank = weakTopicsSet.has(question.topic) ? 0 : 1;
    const foundIndex = DEFAULT_DIFFICULTY_ORDER.indexOf((question.difficulty || "medium").toLowerCase());
    const difficultyRank = foundIndex === -1 ? 2 : foundIndex;
    const bucketIndex = Math.min(5, weakTopicRank * 3 + difficultyRank);
    buckets[bucketIndex].push(question);
  }

  return buckets.flatMap((bucket) => bucket);
};

const getWeakTopics = (analytics = {}) => {
  const weakTopics = Array.isArray(analytics.weakTopics) ? analytics.weakTopics : [];
  return new Set(weakTopics.map((topic) => String(topic)));
};

const pickQuestions = (bucket = [], needed = 0, usedIds = new Set()) => {
  if (needed <= 0 || bucket.length === 0) return [];

  const picked = [];
  for (const question of bucket) {
    const id = String(question._id || question.id);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    picked.push(question);
    if (picked.length >= needed) break;
  }
  return picked;
};

const groupPool = (pool = []) => {
  const bySubject = new Map();
  const bySubjectTopic = new Map();

  for (const question of pool) {
    const subject = String(question.subject || "");
    const topic = String(question.topic || "Unspecified");

    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(question);

    const key = `${subject}::${topic}`;
    if (!bySubjectTopic.has(key)) bySubjectTopic.set(key, []);
    bySubjectTopic.get(key).push(question);
  }

  return { bySubject, bySubjectTopic };
};

const toSchemaEntries = (schema) => {
  if (!schema || typeof schema !== "object") return [];
  return Object.entries(schema).map(([subject, rule]) => [String(subject), rule || {}]);
};

const generateQuestionSet = ({ pool = [], schema = {}, studentHistory = {}, analytics = {} }) => {
  const attempted = new Set((studentHistory.attemptedQuestionIds || []).map((id) => String(id)));
  const weakTopicsSet = getWeakTopics(analytics);
  const unattemptedPool = pool.filter((question) => !attempted.has(String(question._id || question.id)));
  const selected = [];
  const usedIds = new Set();

  const runSelection = (candidatePool) => {
    const { bySubject, bySubjectTopic } = groupPool(candidatePool);
    const nextSelected = [];

    for (const [subject, subjectRule] of toSchemaEntries(schema)) {
      const subjectQuestions = prioritizeQuestions(bySubject.get(subject) || [], weakTopicsSet);
      const total = Number(subjectRule.totalQuestions || 0);
      const topics = subjectRule.topics && typeof subjectRule.topics === "object" ? subjectRule.topics : {};

      let selectedForSubject = [];
      const topicWeights = Object.entries(topics);

      for (const [topic, count] of topicWeights) {
        const bucketKey = `${subject}::${topic}`;
        const bucket = prioritizeQuestions(bySubjectTopic.get(bucketKey) || [], weakTopicsSet);
        const picked = pickQuestions(bucket, Number(count || 0), usedIds);
        selectedForSubject = selectedForSubject.concat(picked);
      }

      const remaining = Math.max(0, total - selectedForSubject.length);
      if (remaining > 0) {
        const picked = pickQuestions(subjectQuestions, remaining, usedIds);
        selectedForSubject = selectedForSubject.concat(picked);
      }

      nextSelected.push(...selectedForSubject);
    }

    return nextSelected;
  };

  selected.push(...runSelection(unattemptedPool));

  const requiredTotal = toSchemaEntries(schema).reduce((sum, [, rule]) => sum + Number(rule?.totalQuestions || 0), 0);
  if (selected.length < requiredTotal) {
    selected.push(...runSelection(pool));
  }

  return shuffleArray(selected.slice(0, requiredTotal));
};

module.exports = {
  generateQuestionSet,
};
