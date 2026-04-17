import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/services/api';
import { isAnswered, isSameSubject, type AnswerValue, type ExamSubjectMarkingRule, type MultipleCorrectScoringMode } from '@/lib/scoring';
import {
  buildOriginalAnswersPayload,
  buildOriginalQuestionTimesPayload,
  prepareTestQuestions,
  type BaseTestQuestion,
  type DisplayTestQuestion,
  type SavedTestOrderState,
  type TestRandomizationConfig,
} from '@/lib/testRandomization';
import FormattedContent from '@/components/FormattedContent';
import IntrinsicImage from '@/components/IntrinsicImage';

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked';

type TestQuestion = DisplayTestQuestion;

interface TestState {
  answers: Record<number, AnswerValue>;
  statuses: Record<number, QuestionStatus>;
  questionTimes: Record<number, number>;
  currentQuestion: number;
  tabSwitchCount: number;
  startTime: number;
  attemptId: string | null;
  questionOrder: string[];
  optionOrderByQuestionId: Record<string, number[]>;
}

interface TestInfo {
  testName: string;
  duration: number;
  totalMarks: number;
  subjects: ExamSubjectMarkingRule[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

const STATUS_COLORS: Record<QuestionStatus, string> = {
  'not-visited': 'bg-status-not-visited text-primary-foreground',
  'not-answered': 'bg-status-not-answered text-primary-foreground',
  'answered': 'bg-status-answered text-primary-foreground',
  'marked': 'bg-status-marked text-primary-foreground',
};

const PALETTE_GUIDE = [
  { status: 'not-visited' as const, label: 'Not Visited', description: 'You have not opened this question yet.' },
  { status: 'not-answered' as const, label: 'Not Answered', description: 'You opened this question but have not saved a response.' },
  { status: 'answered' as const, label: 'Answered', description: 'A response is currently saved for this question.' },
  { status: 'marked' as const, label: 'Marked for Review', description: 'You flagged this question to revisit before final submission.' },
];

const EXAM_RULES = [
  'The exam opens in fullscreen when your browser allows it. You can still continue if fullscreen is blocked.',
  'The first two tab switches show warnings. The third tab switch auto-submits the test.',
  'Use Save & Next, Mark for Review, and the question palette to manage your progress.',
  'Written answers can be typed directly in the answer box.',
];

const STUDENT_CHECKLIST = [
  'Read the marking scheme before you begin.',
  'Check the colour coding so you can track answered and marked questions quickly.',
  'Keep a stable internet connection while the test is running.',
  'Use Submit Test only when you are fully done with the paper.',
];

const formatDurationLabel = (minutes: number) => {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!remainingMinutes) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

const formatMultipleMode = (mode?: MultipleCorrectScoringMode) =>
  (mode || 'full_only').replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());

const getEmptyAnswer = (question: TestQuestion): AnswerValue => {
  if (question.questionType === 'multiple') return [];
  if (question.questionType === 'written') return '';
  return null;
};

const getInitialTestState = (
  questions: TestQuestion[],
  savedOrderState: SavedTestOrderState = {},
): TestState => {
  const statuses: Record<number, QuestionStatus> = {};
  const answers: Record<number, AnswerValue> = {};
  const questionTimes: Record<number, number> = {};

  questions.forEach((question, index) => {
    statuses[index] = index === 0 ? 'not-answered' : 'not-visited';
    answers[index] = getEmptyAnswer(question);
    questionTimes[index] = 0;
  });

  return {
    answers,
    statuses,
    questionTimes,
    currentQuestion: 0,
    tabSwitchCount: 0,
    startTime: Date.now(),
    attemptId: null,
    questionOrder: savedOrderState.questionOrder || questions.map((question) => question.id),
    optionOrderByQuestionId: savedOrderState.optionOrderByQuestionId || {},
  };
};

const sanitizeSavedState = (savedState: unknown, questions: TestQuestion[]): TestState | null => {
  if (!savedState || typeof savedState !== 'object') return null;
  const candidate = savedState as Partial<TestState>;
  if (!Number.isFinite(candidate.startTime)) return null;

  const answers: Record<number, AnswerValue> = {};
  const statuses: Record<number, QuestionStatus> = {};
  const questionTimes: Record<number, number> = {};

  questions.forEach((question, index) => {
    const savedAnswer = candidate.answers?.[index];
    const savedStatus = candidate.statuses?.[index];
    const savedQuestionTime = candidate.questionTimes?.[index];

    answers[index] = savedAnswer !== undefined ? savedAnswer : getEmptyAnswer(question);
    statuses[index] =
      savedStatus === 'not-visited' || savedStatus === 'not-answered' || savedStatus === 'answered' || savedStatus === 'marked'
        ? savedStatus
        : index === 0 ? 'not-answered' : 'not-visited';
    questionTimes[index] = typeof savedQuestionTime === 'number' && Number.isFinite(savedQuestionTime) ? savedQuestionTime : 0;
  });

  const currentQuestion = Number.isInteger(candidate.currentQuestion)
    ? Math.min(Math.max(candidate.currentQuestion as number, 0), Math.max(questions.length - 1, 0))
    : 0;
  const tabSwitchCount = Number.isInteger(candidate.tabSwitchCount) ? Math.max(0, candidate.tabSwitchCount as number) : 0;
  const attemptId = typeof candidate.attemptId === 'string' && candidate.attemptId.trim() ? candidate.attemptId : null;
  const questionOrder = Array.isArray(candidate.questionOrder)
    ? candidate.questionOrder.map((value) => String(value))
    : questions.map((question) => question.id);
  const optionOrderByQuestionId =
    candidate.optionOrderByQuestionId && typeof candidate.optionOrderByQuestionId === 'object'
      ? Object.fromEntries(
          Object.entries(candidate.optionOrderByQuestionId).map(([questionId, optionOrder]) => [
            questionId,
            Array.isArray(optionOrder) ? optionOrder.map((value) => Number(value)) : [],
          ]),
        )
      : {};

  return {
    answers,
    statuses,
    questionTimes,
    currentQuestion,
    tabSwitchCount,
    startTime: candidate.startTime as number,
    attemptId,
    questionOrder,
    optionOrderByQuestionId,
  };
};

const extractSavedOrderState = (savedState: unknown): SavedTestOrderState => {
  if (!savedState || typeof savedState !== 'object') {
    return {};
  }

  const candidate = savedState as Partial<TestState>;
  return {
    questionOrder: Array.isArray(candidate.questionOrder) ? candidate.questionOrder.map((value) => String(value)) : undefined,
    optionOrderByQuestionId:
      candidate.optionOrderByQuestionId && typeof candidate.optionOrderByQuestionId === 'object'
        ? Object.fromEntries(
            Object.entries(candidate.optionOrderByQuestionId).map(([questionId, optionOrder]) => [
              questionId,
              Array.isArray(optionOrder) ? optionOrder.map((value) => Number(value)) : [],
            ]),
          )
        : undefined,
  };
};

export default function TestInterfacePage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestStateRef = useRef<TestState | null>(null);
  const hasSubmittedRef = useRef(false);
  const activeQuestionRef = useRef(0);
  const questionEnteredAtRef = useRef<number | null>(null);
  const questionTimerReadyRef = useRef(false);
  const isExitingRef = useRef(false);

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<TestState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [hasSavedAttempt, setHasSavedAttempt] = useState(false);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const requestTestFullscreen = useCallback(async () => {
    const element = containerRef.current;
    if (!element?.requestFullscreen) return false;
    try {
      await element.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
      return true;
    } catch {
      try {
        await element.requestFullscreen();
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const ensureServerAttempt = useCallback(async (candidateState: TestState | null) => {
    if (!candidateState || !testId) return null;
    if (candidateState.attemptId) {
      try {
        await api.post('/tests/session/heartbeat', { attemptId: candidateState.attemptId });
        return candidateState.attemptId;
      } catch {}
    }

    const { data } = await api.post('/tests/session/start', {
      testId,
      startedAt: new Date(candidateState.startTime).toISOString(),
    });
    const nextAttemptId = data.attempt?._id || null;
    if (nextAttemptId) setState((prev) => (prev ? { ...prev, attemptId: nextAttemptId } : prev));
    return nextAttemptId;
  }, [testId]);

  const handleStartSession = useCallback(async () => {
    if (!instructionsAccepted) {
      toast.error('Please confirm the instructions before starting the test.');
      return;
    }
    const enteredFullscreen = await requestTestFullscreen();
    if (!enteredFullscreen) toast.warning('Fullscreen could not be enabled automatically. You can still continue the test.');
    try {
      await ensureServerAttempt(latestStateRef.current);
    } catch {
      toast.warning('Live monitoring could not start, but you can still continue the test.');
    }
    questionTimerReadyRef.current = false;
    questionEnteredAtRef.current = null;
    setHasStartedSession(true);
  }, [ensureServerAttempt, instructionsAccepted, requestTestFullscreen]);

  const handleExitTest = useCallback(async () => {
    isExitingRef.current = true;
    localStorage.removeItem(`test_${testId}`);
    
    // Completely abandon the test session in the backend so it drops from 'Live' status
    const currentAttemptId = latestStateRef.current?.attemptId;
    if (currentAttemptId) {
      api.post('/tests/session/abandon', { attemptId: currentAttemptId }).catch(() => {});
    }

    if (document.fullscreenElement) await document.exitFullscreen?.();
    navigate('/exams');
  }, [navigate, testId]);

  const getQuestionTimesPayload = useCallback((candidateState: TestState) => {
    const merged = { ...candidateState.questionTimes };
    if (questionTimerReadyRef.current && questionEnteredAtRef.current !== null) {
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - questionEnteredAtRef.current) / 1000));
      const questionIndex = activeQuestionRef.current;
      merged[questionIndex] = (merged[questionIndex] || 0) + elapsedSeconds;
    }
    return questions.map((_, index) => Number(merged[index] || 0));
  }, [questions]);

  const handleSubmit = useCallback(async () => {
    const candidateState = latestStateRef.current;
    if (!candidateState || !testId || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const timeTaken = Math.max(0, (testInfo?.duration || 60) * 60 - timeLeft);
    const displayPerQuestionTimes = getQuestionTimesPayload(candidateState);
    const submissionAnswers = buildOriginalAnswersPayload(questions, candidateState.answers);
    const submissionPerQuestionTimes = buildOriginalQuestionTimesPayload(questions, displayPerQuestionTimes);

    try {
      const { data } = await api.post('/tests/submit', {
        attemptId: candidateState.attemptId,
        testId,
        answers: submissionAnswers,
        timeTaken,
        perQuestionTimes: submissionPerQuestionTimes,
      });

      localStorage.removeItem(`test_${testId}`);
      localStorage.setItem(`result_${testId}`, JSON.stringify({
        testId,
        testTitle: testInfo?.testName || "Practice Test",
        attemptId: data.attempt?._id || candidateState.attemptId,
        answers: candidateState.answers,
        questions,
        timeTaken,
        perQuestionTimes: displayPerQuestionTimes,
        subjects: testInfo?.subjects || [],
        summary: data.summary,
        submissionStatus: data.attempt?.status || 'COMPLETED',
        autoSubmitReason: data.attempt?.terminationReason || null,
        optionOrderByQuestionId: candidateState.optionOrderByQuestionId,
      }));
    } catch (err) {
      console.error('Failed to save attempt to DB:', err);
      toast.error('We could not submit your test. Please try again.');
      hasSubmittedRef.current = false;
      return;
    }

    if (document.fullscreenElement) await document.exitFullscreen?.();
    navigate(`/results/${testId}`);
  }, [getQuestionTimesPayload, navigate, questions, testId, testInfo, timeLeft]);

  useEffect(() => {
    const initializeNewState = (
      candidateQuestions: TestQuestion[],
      candidateInfo: TestInfo | null,
      savedOrderState: SavedTestOrderState,
    ) => {
      const newState = getInitialTestState(candidateQuestions, savedOrderState);
      setState(newState);
      setTimeLeft((candidateInfo?.duration || 60) * 60);
      setHasSavedAttempt(false);
    };

    const fetchTestData = async () => {
      setLoading(true);
      let finalQuestions: TestQuestion[] = [];
      let finalTestInfo: TestInfo | null = null;
      let parsedSavedState: unknown = null;
      let preparedOrderState: SavedTestOrderState = {};

      const saved = localStorage.getItem(`test_${testId}`);
      if (saved) {
        try {
          parsedSavedState = JSON.parse(saved);
        } catch {
          localStorage.removeItem(`test_${testId}`);
        }
      }

      try {
        const { data } = await api.get(`/tests/${testId}`);
        const flatQuestions = Array.isArray(data?.questions)
          ? data.questions.filter((question: unknown) => Boolean(question && typeof question === 'object'))
          : [];

        const rawQuestions: BaseTestQuestion[] = flatQuestions.map((q: any) => ({
          id: String(q._id ?? q.id ?? ''),
          question: q.question,
          questionType: q.questionType || 'single',
          questionImage: q.questionImage,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          correctAnswers: q.correctAnswers || [],
          writtenAnswer: q.writtenAnswer || '',
          subject: q.subject,
          explanation: q.explanation || '',
          explanationImage: q.explanationImage,
          marksPerQuestion: q.marksPerQuestion ?? (data.examDetails?.subjects?.find((subject: any) => isSameSubject(subject.name, q.subject))?.marksPerQuestion) ?? 1,
          negativeMarksPerQuestion: q.negativeMarksPerQuestion ?? (data.examDetails?.subjects?.find((subject: any) => isSameSubject(subject.name, q.subject))?.negativeMarksPerQuestion) ?? 0,
          multipleCorrectScoringMode: q.multipleCorrectScoringMode || 'full_only',
        })).filter((question) => Boolean(question.id && question.question));

        if (rawQuestions.length === 0) {
          toast.error('This test has no valid questions. Please ask admin to republish it.');
          navigate('/exams');
          return;
        }

        // Compute totalMarks dynamically from actual questions so it stays accurate
        // even when questions have been added/removed after the test was created.
        const computedTotalMarks = rawQuestions.reduce((sum, q) => sum + (q.marksPerQuestion ?? 1), 0);

        const randomizationConfig: TestRandomizationConfig = {
          // Keep test flow normal and deterministic.
          shuffleQuestions: false,
          shuffleOptions: false,
        };
        const extractedSavedOrderState = extractSavedOrderState(parsedSavedState);
        const savedOrderStateForResume = parsedSavedState
          ? {
              questionOrder: extractedSavedOrderState.questionOrder || rawQuestions.map((question) => question.id),
              optionOrderByQuestionId:
                extractedSavedOrderState.optionOrderByQuestionId ||
                Object.fromEntries(rawQuestions.map((question) => [question.id, question.options.map((_, index) => index)])),
            }
          : extractedSavedOrderState;
        const preparedQuestions = prepareTestQuestions(rawQuestions, randomizationConfig, savedOrderStateForResume);

        finalQuestions = preparedQuestions.questions;
        preparedOrderState = {
          questionOrder: preparedQuestions.questionOrder,
          optionOrderByQuestionId: preparedQuestions.optionOrderByQuestionId,
        };
        finalTestInfo = {
          testName: data.title,
          duration: data.durationMinutes,
          totalMarks: computedTotalMarks || data.totalMarks,
          subjects: data.examDetails?.subjects || [],
          shuffleQuestions: false,
          shuffleOptions: false,
        };
      } catch {
        toast.error('Failed to load test data');
        navigate('/exams');
        return;
      }

      setQuestions(finalQuestions);
      setTestInfo(finalTestInfo);
      setSelectedSubject('All');
      setInstructionsAccepted(false);
      setHasStartedSession(false);
      setIsFullscreenActive(false);
      hasSubmittedRef.current = false;
      questionTimerReadyRef.current = false;
      questionEnteredAtRef.current = null;

      if (parsedSavedState) {
        try {
          const sanitizedState = sanitizeSavedState(parsedSavedState, finalQuestions);
          const duration = (finalTestInfo?.duration || 60) * 60;
          if (!sanitizedState) throw new Error('Saved test state is invalid');

          const elapsed = Math.floor((Date.now() - sanitizedState.startTime) / 1000);
          const remaining = duration - elapsed;
          if (remaining <= 0) {
            localStorage.removeItem(`test_${testId}`);
            initializeNewState(finalQuestions, finalTestInfo, preparedOrderState);
            toast.info('Your previous saved attempt had expired, so a fresh test was started.');
          } else {
            setState(sanitizedState);
            setTimeLeft(remaining);
            setHasSavedAttempt(true);
          }
        } catch {
          localStorage.removeItem(`test_${testId}`);
          initializeNewState(finalQuestions, finalTestInfo, preparedOrderState);
        }
      } else {
        initializeNewState(finalQuestions, finalTestInfo, preparedOrderState);
      }

      setLoading(false);
    };

    void fetchTestData();
  }, [navigate, testId]);

  useEffect(() => {
    if (loading || !state || hasSubmittedRef.current || !hasStartedSession) return;
    if (timeLeft <= 0) {
      void handleSubmit();
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [handleSubmit, hasStartedSession, loading, state, timeLeft]);

  useEffect(() => {
    if (!state || isExitingRef.current) return;

    const storageKey = `test_${testId}`;
    const serializedState = JSON.stringify(state);
    const timer = window.setTimeout(() => {
      if (!isExitingRef.current) {
        localStorage.setItem(storageKey, serializedState);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [state, testId]);

  useEffect(() => {
    if (!state || !questions.length) return;
    const preloadImage = (url?: string) => {
      if (!url) return;
      const img = new Image();
      img.src = url;
    };

    const currentIndex = state.currentQuestion;
    for (let i = 1; i <= 3; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < questions.length) {
        const nextQ = questions[nextIndex];
        preloadImage(nextQ.questionImage);
        nextQ.options.forEach((opt) => {
          if (typeof opt !== 'string' && opt.imageUrl) preloadImage(opt.imageUrl);
        });
        preloadImage(nextQ.explanationImage);
      }
    }
  }, [state?.currentQuestion, questions]);
  useEffect(() => {
    if (!hasStartedSession || !state?.attemptId || hasSubmittedRef.current) return;
    const interval = window.setInterval(() => {
      api.post('/tests/session/heartbeat', { attemptId: state.attemptId }).catch((error: any) => {
        if (error.response?.status === 404) {
          toast.error('Your test was terminated by admin.');
          isExitingRef.current = true;
          localStorage.removeItem(`test_${testId}`);
          hasSubmittedRef.current = true;
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
          navigate('/exams');
        }
      });
    }, 15000); // Poll every 15 seconds so termination responds quickly
    return () => window.clearInterval(interval);
  }, [hasStartedSession, state?.attemptId, testId, navigate]);

  useEffect(() => {
    if (loading || !state || hasSubmittedRef.current || !hasStartedSession) return;
    if (!questionTimerReadyRef.current) {
      activeQuestionRef.current = state.currentQuestion;
      questionEnteredAtRef.current = Date.now();
      questionTimerReadyRef.current = true;
      return;
    }

    if (activeQuestionRef.current === state.currentQuestion || questionEnteredAtRef.current === null) return;
    const previousQuestionIndex = activeQuestionRef.current;
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - questionEnteredAtRef.current) / 1000));

    if (elapsedSeconds > 0) {
      setState((prev) => !prev ? prev : ({
        ...prev,
        questionTimes: {
          ...prev.questionTimes,
          [previousQuestionIndex]: (prev.questionTimes[previousQuestionIndex] || 0) + elapsedSeconds,
        },
      }));
    }

    activeQuestionRef.current = state.currentQuestion;
    questionEnteredAtRef.current = Date.now();
  }, [hasStartedSession, loading, state?.currentQuestion]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreenActive(Boolean(document.fullscreenElement));
    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (loading || !hasStartedSession) return;

    const handleVisibility = () => {
      if (!document.hidden) return;
      setState((prev) => {
        if (!prev || hasSubmittedRef.current) return prev;
        const nextCount = prev.tabSwitchCount + 1;
        if (nextCount >= 3) {
          toast.error('You switched tabs 3 times. Test auto-submitted.');
          window.setTimeout(() => { void handleSubmit(); }, 500);
        } else {
          toast.warning(`Warning ${nextCount}/3: Tab switch detected.`);
        }
        return { ...prev, tabSwitchCount: nextCount };
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [handleSubmit, hasStartedSession, loading]);

  const setCurrentAnswer = (answer: AnswerValue) => {
    setState((prev) => {
      if (!prev) return null;
      const currentQuestion = questions[prev.currentQuestion];
      const nextStatus = isAnswered(currentQuestion, answer) ? 'answered' : 'not-answered';
      return {
        ...prev,
        answers: { ...prev.answers, [prev.currentQuestion]: answer },
        statuses: { ...prev.statuses, [prev.currentQuestion]: nextStatus },
      };
    });
  };

  const selectOption = (optionIndex: number) => {
    const currentQuestion = questions[state?.currentQuestion || 0];
    if (currentQuestion.questionType === 'multiple') {
      const existing = Array.isArray(state?.answers[state.currentQuestion]) ? [...(state?.answers[state.currentQuestion] as number[])] : [];
      const nextAnswer = existing.includes(optionIndex)
        ? existing.filter((value) => value !== optionIndex)
        : [...existing, optionIndex].sort((a, b) => a - b);
      setCurrentAnswer(nextAnswer);
      return;
    }
    setCurrentAnswer(optionIndex);
  };

  const updateWrittenAnswer = (value: string) => setCurrentAnswer(value);
  const saveAndNext = () => {
    if (state && state.currentQuestion < questions.length - 1) {
      setState((prev) => {
        if (!prev) return null;
        const next = prev.currentQuestion + 1;
        return {
          ...prev,
          currentQuestion: next,
          statuses: { ...prev.statuses, [next]: prev.statuses[next] === 'not-visited' ? 'not-answered' : prev.statuses[next] },
        };
      });
    }
  };

  const goToPrevious = () => {
    if (state && state.currentQuestion > 0) {
      setState((prev) => prev ? ({ ...prev, currentQuestion: prev.currentQuestion - 1 }) : null);
    }
  };

  const markForReview = () => {
    setState((prev) => prev ? ({ ...prev, statuses: { ...prev.statuses, [prev.currentQuestion]: 'marked' } }) : null);
    saveAndNext();
  };

  const clearResponse = () => {
    if (!state) return;
    setCurrentAnswer(getEmptyAnswer(questions[state.currentQuestion]));
  };

  const goToQuestion = (index: number) => {
    setState((prev) => prev ? ({
      ...prev,
      currentQuestion: index,
      statuses: { ...prev.statuses, [index]: prev.statuses[index] === 'not-visited' ? 'not-answered' : prev.statuses[index] },
    }) : null);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const questionTypeSummary = useMemo(() => questions.reduce((summary, question) => {
    if (question.questionType === 'multiple') summary.multiple += 1;
    else if (question.questionType === 'written') summary.written += 1;
    else summary.single += 1;
    return summary;
  }, { single: 0, multiple: 0, written: 0 }), [questions]);

  const markingRows = useMemo(() => {
    const subjectMap = new Map<string, ExamSubjectMarkingRule>();
    const predefinedSubjects = testInfo?.subjects || [];
    
    questions.forEach((question) => {
      const subjName = question.subject || 'General';
      if (!subjectMap.has(subjName)) {
        const predefined = predefinedSubjects.find((s) => isSameSubject(s.name, subjName));
        subjectMap.set(subjName, {
          name: subjName,
          marksPerQuestion: predefined?.marksPerQuestion ?? question.marksPerQuestion ?? 1,
          negativeMarksPerQuestion: predefined?.negativeMarksPerQuestion ?? question.negativeMarksPerQuestion ?? 0,
        });
      }
    });

    predefinedSubjects.forEach((predefined) => {
      if (!subjectMap.has(predefined.name)) {
        subjectMap.set(predefined.name, {
          name: predefined.name,
          marksPerQuestion: predefined.marksPerQuestion ?? 1,
          negativeMarksPerQuestion: predefined.negativeMarksPerQuestion ?? 0,
        });
      }
    });

    return Array.from(subjectMap.values());
  }, [questions, testInfo?.subjects]);

  const multipleModeLabels = useMemo(() => Array.from(new Set(
    questions.filter((question) => question.questionType === 'multiple').map((question) => formatMultipleMode(question.multipleCorrectScoringMode)),
  )), [questions]);

  if (loading || !state) return <div className="flex h-screen items-center justify-center">Loading test...</div>;

  const currentQ = questions[state.currentQuestion];
  const currentAnswer = state.answers[state.currentQuestion];
  const availableSubjects = Array.from(new Set(questions.map((question) => question.subject).filter(Boolean)));
  const filteredQuestionIndexes = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => selectedSubject === 'All' || question.subject === selectedSubject)
    .map(({ index }) => index);
  const answeredCount = Object.values(state.statuses).filter((status) => status === 'answered').length;

  return (
    <div ref={containerRef} className="flex h-screen flex-col bg-background select-none">
      <div className="border-b border-border bg-card px-4 py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="font-display text-sm font-bold text-foreground">Vidyarthi Mitra Test Portal</span>
            <p className="truncate text-sm text-muted-foreground">{testInfo?.testName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
            <div className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Tab Warnings: {state.tabSwitchCount}/3</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (isFullscreenActive) {
                  document.exitFullscreen?.();
                  return;
                }
                void requestTestFullscreen();
              }}
            >
              {isFullscreenActive ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
              {isFullscreenActive ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowExitDialog(true)}>Exit Test</Button>
            <Button size="sm" variant="destructive" onClick={() => setShowSubmitDialog(true)}>Submit Test</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-auto p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{state.currentQuestion + 1}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{currentQ.subject}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {currentQ.questionType === 'written' ? 'Written' : currentQ.questionType === 'multiple' ? 'Multiple Select' : 'Single Correct'}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{currentQ.marksPerQuestion ?? 1} / -{currentQ.negativeMarksPerQuestion ?? 0}
            </span>
            {currentQ.questionType === 'multiple' && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{formatMultipleMode(currentQ.multipleCorrectScoringMode)}</span>
            )}
          </div>

          {availableSubjects.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={selectedSubject === 'All' ? 'default' : 'outline'} onClick={() => setSelectedSubject('All')}>
                All Subjects
              </Button>
              {availableSubjects.map((subject) => (
                <Button
                  key={subject}
                  type="button"
                  size="sm"
                  variant={selectedSubject === subject ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedSubject(subject);
                    const firstIndex = questions.findIndex((question) => question.subject === subject);
                    if (firstIndex >= 0) goToQuestion(firstIndex);
                  }}
                >
                  {subject}
                </Button>
              ))}
            </div>
          )}

          <div className="flex-1">
            <FormattedContent html={currentQ.question} className="mb-6 text-lg font-medium leading-relaxed text-foreground" />
            {currentQ.questionImage && (
              <div className="mx-auto mb-6 max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/30">
                <img src={currentQ.questionImage} alt="Question" className="mx-auto max-h-[300px] w-auto object-contain" />
              </div>
            )}

            {currentQ.questionType === 'written' ? (
              <Textarea
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChange={(event) => updateWrittenAnswer(event.target.value)}
                placeholder="Type your answer here..."
                className="min-h-32"
              />
            ) : (
              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const isSelected = currentQ.questionType === 'multiple'
                    ? Array.isArray(currentAnswer) && currentAnswer.includes(index)
                    : currentAnswer === index;

                  return (
                    <button
                      key={index}
                      onClick={() => selectOption(index)}
                      className={`w-full rounded-xl border-2 px-5 py-4 text-left transition-all ${isSelected ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-accent/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="flex-1 space-y-2">
                          {option.text && <FormattedContent html={option.text} className="text-sm" />}
                          {option.imageUrl && <IntrinsicImage src={option.imageUrl} alt={`Option ${index + 1}`} loading="lazy" trimWhitespace className="border" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={goToPrevious} disabled={state.currentQuestion === 0}>Previous</Button>
            <Button size="sm" onClick={saveAndNext} disabled={state.currentQuestion === questions.length - 1}>Save & Next</Button>
            <Button variant="outline" size="sm" onClick={markForReview}>Mark for Review</Button>
            <Button variant="ghost" size="sm" onClick={clearResponse}>Clear</Button>
          </div>
        </div>

        <div className="hidden w-64 overflow-auto border-l border-border bg-card p-4 md:block">
          <h4 className="mb-3 text-sm font-semibold">Question Palette</h4>
          {availableSubjects.length > 1 && (
            <p className="mb-3 text-xs text-muted-foreground">Showing {selectedSubject === 'All' ? 'all subjects' : selectedSubject}</p>
          )}
          <div className="mb-4 grid grid-cols-5 gap-1.5">
            {filteredQuestionIndexes.map((index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`h-9 w-9 rounded-lg text-xs font-semibold ${index === state.currentQuestion ? 'ring-2 ring-primary ring-offset-1' : ''} ${STATUS_COLORS[state.statuses[index]]}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold">Submit Test?</h3>
            <p className="mt-2 text-sm text-muted-foreground">You have answered {answeredCount} questions.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSubmitDialog(false)}>Go Back</Button>
              <Button variant="destructive" className="flex-1" onClick={() => { setShowSubmitDialog(false); void handleSubmit(); }}>
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold">Exit Test?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Exiting the test will permanently cancel this attempt, and no progress will be saved. A fresh test will start if you try again later.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowExitDialog(false)}>Stay in Test</Button>
              <Button variant="destructive" className="flex-1" onClick={() => void handleExitTest()}>Exit & Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {!hasStartedSession && !loading && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 px-4 py-8">
          <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl min-w-0">
                <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Exam Instructions</div>
                <h2 className="mt-4 break-words text-3xl font-bold text-foreground">{hasSavedAttempt ? 'Resume Your Test' : 'Start Your Test'}</h2>
                <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
                  Review the paper details, marking scheme, colour coding, and rules before you begin. This board keeps the full test summary visible and easy to scan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-full xl:max-w-[560px]">
                {[
                  { label: 'Questions', value: questions.length },
                  { label: 'Duration', value: formatDurationLabel(testInfo?.duration || 0) },
                  { label: 'Total Marks', value: testInfo?.totalMarks || 0 },
                  { label: 'Subjects', value: availableSubjects.length || 1 },
                ].map((item) => (
                  <div key={item.label} className="flex min-h-[122px] min-w-0 flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="min-h-[2.75rem] break-words text-xs uppercase tracking-[0.2em] text-muted-foreground sm:min-h-[3rem]">{item.label}</p>
                    <p className="mt-4 break-words text-2xl font-bold leading-none text-foreground sm:text-3xl">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-border bg-muted/10 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Exam Overview
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Question Types</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3"><span>Single Correct</span><span className="font-semibold">{questionTypeSummary.single}</span></div>
                        <div className="flex items-center justify-between gap-3"><span>Multiple Select</span><span className="font-semibold">{questionTypeSummary.multiple}</span></div>
                        <div className="flex items-center justify-between gap-3"><span>Written</span><span className="font-semibold">{questionTypeSummary.written}</span></div>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Test Structure</p>
                      <div className="mt-3 space-y-3 text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                          <span className="text-muted-foreground">Test Name</span>
                          <span className="font-semibold text-foreground text-left sm:text-right">{testInfo?.testName || 'Practice Test'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                          <span className="text-muted-foreground">Section Filter</span>
                          <span className="font-semibold text-foreground text-left sm:text-right">{availableSubjects.length > 1 ? 'Enabled' : 'Single Subject'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                          <span className="text-muted-foreground">Question Palette</span>
                          <span className="font-semibold text-foreground text-left sm:text-right">Visible</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                          <span className="text-muted-foreground">Question Order</span>
                          <span className="font-semibold text-foreground text-left sm:text-right">{testInfo?.shuffleQuestions ? 'Randomized' : 'Fixed'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                          <span className="text-muted-foreground">Option Order</span>
                          <span className="font-semibold text-foreground text-left sm:text-right">{testInfo?.shuffleOptions ? 'Randomized' : 'Fixed'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-muted/10 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Marking Scheme
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="hidden rounded-2xl border border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.4fr)_110px_110px] sm:gap-3">
                      <span>Subject</span><span>Correct</span><span>Wrong</span>
                    </div>
                    {markingRows.map((subject) => (
                      <div key={subject.name} className="grid gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-foreground sm:grid-cols-[minmax(0,1.4fr)_110px_110px]">
                        <div className="min-w-0 break-words">
                          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground sm:hidden">Subject</span>
                          <div>{subject.name}</div>
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground sm:hidden">Correct</span>
                          <div>+{subject.marksPerQuestion}</div>
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground sm:hidden">Wrong</span>
                          <div>-{subject.negativeMarksPerQuestion ?? 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {multipleModeLabels.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Multiple-correct scoring modes:</span>{' '}
                      <span className="break-words">{multipleModeLabels.join(', ')}</span>
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-border bg-muted/10 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Colour Coding Guide
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {PALETTE_GUIDE.map((item) => (
                      <div key={item.status} className="min-w-0 rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-start gap-3">
                          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${STATUS_COLORS[item.status]}`}>1</span>
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-foreground">{item.label}</p>
                            <p className="break-words text-xs leading-5 text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Exam Rules and Monitoring
                  </div>
                  <div className="mt-4 space-y-3">
                    {EXAM_RULES.map((rule) => (
                      <div key={rule} className="min-w-0 rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                        <p className="break-words whitespace-normal">{rule}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-muted/10 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    What You Should Do
                  </div>
                  <div className="mt-4 space-y-3">
                    {STUDENT_CHECKLIST.map((item) => (
                      <div key={item} className="min-w-0 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                        <p className="break-words whitespace-normal">{item}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-primary/20 bg-primary/[0.06] p-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="instruction-declaration"
                      checked={instructionsAccepted}
                      onCheckedChange={(checked) => setInstructionsAccepted(checked === true)}
                      className="mt-1"
                    />
                    <label htmlFor="instruction-declaration" className="min-w-0 text-sm leading-6 text-foreground">
                      <span className="break-words">
                        I have read the exam details, marking scheme, colour coding, and exam rules. I understand the tab-switch warning policy and I am ready to begin the test.
                      </span>
                    </label>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {instructionsAccepted ? (
                      <Button className="flex-1" onClick={() => void handleStartSession()}>
                        <Maximize2 className="mr-2 h-4 w-4" />
                        {hasSavedAttempt ? 'Resume Test' : 'Start Test'}
                      </Button>
                    ) : (
                      <div className="flex-1 rounded-2xl border border-dashed border-primary/30 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                        Tick the declaration checkbox to unlock the start button.
                      </div>
                    )}
                    <Button variant="outline" className="sm:w-52" onClick={() => navigate('/exams')}>Back to Exams</Button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
