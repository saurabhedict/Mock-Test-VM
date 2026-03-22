import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Send, ChevronLeft, ChevronRight, Flag, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getQuestionsForTest, type Question } from '@/data/questions';
import { examConfigs, getAllTests } from '@/data/exams';
import api from '@/services/api';

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked';

interface TestState {
  answers: Record<number, number | null>;
  statuses: Record<number, QuestionStatus>;
  currentQuestion: number;
  tabSwitchCount: number;
  startTime: number;
}

export default function TestInterfacePage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [testInfo, setTestInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<TestState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    const fetchTestData = async () => {
      const staticQuestions = getQuestionsForTest(testId || '');
      const allStaticTests = examConfigs.flatMap(e => getAllTests(e.examId));
      const staticTestInfo = allStaticTests.find(t => t.testId === testId);

      let finalQuestions = [];
      let finalTestInfo = null;

      if (staticQuestions.length > 0 && staticTestInfo) {
        finalQuestions = staticQuestions;
        finalTestInfo = staticTestInfo;
      } else {
        try {
          const { data } = await api.get(`/tests/${testId}`);
          finalQuestions = data.questions.map((q: any) => ({
            id: q._id,
            question: q.question,
            questionImage: q.questionImage,
            options: q.options.map((o: any) => ({ text: o.text, imageUrl: o.imageUrl })),
            correctAnswer: q.correctAnswer,
            subject: q.subject,
            explanation: q.explanation
          }));
          finalTestInfo = {
            testName: data.title,
            duration: data.durationMinutes,
            totalMarks: data.totalMarks
          };
        } catch (error) {
          toast.error("Failed to load test data");
          navigate('/exams');
          return;
        }
      }

      setQuestions(finalQuestions);
      setTestInfo(finalTestInfo);

      // Initialize State
      const saved = localStorage.getItem(`test_${testId}`);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          setState(parsed);
          const duration = (finalTestInfo?.duration || 60) * 60;
          const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
          setTimeLeft(Math.max(0, duration - elapsed));
        } catch { 
            initializeNewState(finalQuestions, finalTestInfo);
        }
      } else {
        initializeNewState(finalQuestions, finalTestInfo);
      }
      setLoading(false);
    };

    const initializeNewState = (qs: any[], info: any) => {
        const statuses: Record<number, QuestionStatus> = {};
        const answers: Record<number, number | null> = {};
        qs.forEach((_, i) => {
          statuses[i] = i === 0 ? 'not-answered' : 'not-visited';
          answers[i] = null;
        });
        const newState = { answers, statuses, currentQuestion: 0, tabSwitchCount: 0, startTime: Date.now() };
        setState(newState);
        setTimeLeft((info?.duration || 60) * 60);
    };

    fetchTestData();
  }, [testId, navigate]);

  // Timer
  useEffect(() => {
    if (loading || !state) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, state]);

  // Auto-save
  useEffect(() => {
    if (state) localStorage.setItem(`test_${testId}`, JSON.stringify(state));
  }, [state, testId]);

  // Anti-cheating
  useEffect(() => {
    if (loading) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setState(prev => {
          if (!prev) return prev;
          const count = prev.tabSwitchCount + 1;
          if (count >= 3) {
            toast.error('You switched tabs 3 times. Test auto-submitted.');
            setTimeout(() => handleSubmit(), 500);
          } else {
            toast.warning(`Warning ${count}/3: Tab switch detected!`);
          }
          return { ...prev, tabSwitchCount: count };
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loading]);

  const handleSubmit = useCallback(() => {
    if (!state) return;
    localStorage.removeItem(`test_${testId}`);
    const resultData = {
      testId,
      answers: state.answers,
      questions,
      timeTaken: (testInfo?.duration || 60) * 60 - timeLeft,
    };
    localStorage.setItem(`result_${testId}`, JSON.stringify(resultData));
    if (document.fullscreenElement) document.exitFullscreen?.();
    navigate(`/results/${testId}`);
  }, [state, timeLeft, testId, questions, navigate, testInfo]);

  const selectOption = (optionIndex: number) => {
    setState(prev => prev ? ({
      ...prev,
      answers: { ...prev.answers, [prev.currentQuestion]: optionIndex },
      statuses: { ...prev.statuses, [prev.currentQuestion]: 'answered' },
    }) : null);
  };

  const saveAndNext = () => {
    if (state && state.currentQuestion < questions.length - 1) {
      setState(prev => {
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
      setState(prev => prev ? ({ ...prev, currentQuestion: prev.currentQuestion - 1 }) : null);
    }
  };

  const markForReview = () => {
    setState(prev => prev ? ({
      ...prev,
      statuses: { ...prev.statuses, [prev.currentQuestion]: 'marked' },
    }) : null);
    saveAndNext();
  };

  const clearResponse = () => {
    setState(prev => prev? ({
      ...prev,
      answers: { ...prev.answers, [prev.currentQuestion]: null },
      statuses: { ...prev.statuses, [prev.currentQuestion]: 'not-answered' },
    }) : null);
  };

  const goToQuestion = (index: number) => {
    setState(prev => prev ? ({
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

  if (loading || !state) return <div className="h-screen flex items-center justify-center">Loading test...</div>;

  const currentQ = questions[state.currentQuestion];
  const statusColors: Record<QuestionStatus, string> = {
    'not-visited': 'bg-status-not-visited text-primary-foreground',
    'not-answered': 'bg-status-not-answered text-primary-foreground',
    'answered': 'bg-status-answered text-primary-foreground',
    'marked': 'bg-status-marked text-primary-foreground',
  };

  const answeredCount = Object.values(state.statuses).filter(s => s === 'answered').length;
  const markedCount = Object.values(state.statuses).filter(s => s === 'marked').length;
  const notAnsweredCount = Object.values(state.statuses).filter(s => s === 'not-answered').length;

  return (
    <div className="h-screen flex flex-col bg-background select-none">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="font-display font-bold text-foreground text-sm">Vidyarthi Mitra Test Portal</span>
          <span className="text-sm text-muted-foreground hidden sm:block">{testInfo?.testName}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
        <Button size="sm" variant="destructive" onClick={() => setShowSubmitDialog(true)}>Submit Test</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-auto p-6">
          <div className="flex-1">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                {state.currentQuestion + 1}
              </span>
              <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded bg-muted">{currentQ.subject}</span>
            </div>
            <h3 className="text-lg font-medium text-foreground leading-relaxed mb-6">{currentQ.question}</h3>
            
            {currentQ.questionImage && (
              <div className="mb-6 rounded-xl overflow-hidden border border-border bg-muted/30 max-w-2xl mx-auto">
                <img src={currentQ.questionImage} alt="Question" className="max-h-[300px] w-auto mx-auto object-contain" />
              </div>
            )}

            <div className="space-y-3">
              {currentQ.options.map((option: any, i: number) => {
                const optText = typeof option === 'string' ? option : option.text;
                const optImg = typeof option === 'string' ? null : option.imageUrl;
                
                return (
                  <button
                    key={i}
                    onClick={() => selectOption(i)}
                    className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${
                      state.answers[state.currentQuestion] === i ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${state.answers[state.currentQuestion] === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{String.fromCharCode(65 + i)}</span>
                      <div className="flex-1 space-y-2">
                        {optText && <span className="text-sm block">{optText}</span>}
                        {optImg && <img src={optImg} alt={`Option ${i+1}`} className="max-h-32 w-auto rounded border" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={goToPrevious} disabled={state.currentQuestion === 0}>Previous</Button>
            <Button size="sm" onClick={saveAndNext} disabled={state.currentQuestion === questions.length - 1}>Save & Next</Button>
            <Button variant="outline" size="sm" onClick={markForReview}>Mark for Review</Button>
            <Button variant="ghost" size="sm" onClick={clearResponse}>Clear</Button>
          </div>
        </div>
        <div className="w-64 border-l border-border bg-card p-4 overflow-auto hidden md:block">
           <h4 className="font-semibold text-sm mb-3">Question Palette</h4>
           <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`h-9 w-9 rounded-lg text-xs font-semibold ${i === state.currentQuestion ? 'ring-2 ring-primary ring-offset-1' : ''} ${statusColors[state.statuses[i]]}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-bold">Submit Test?</h3>
            <p className="mt-2 text-sm text-muted-foreground">You have answered {answeredCount} questions.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSubmitDialog(false)}>Go Back</Button>
              <Button variant="destructive" className="flex-1" onClick={handleSubmit}>Submit Test</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
