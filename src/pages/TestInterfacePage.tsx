import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Send, ChevronLeft, ChevronRight, Flag, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getQuestionsForTest, type Question } from '@/data/questions';
import { examConfigs, getAllTests } from '@/data/exams';

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
  const questions = getQuestionsForTest(testId || '');
  const allTests = examConfigs.flatMap(e => getAllTests(e.examId));
  const testInfo = allTests.find(t => t.testId === testId);

  const [state, setState] = useState<TestState>(() => {
    // Try to resume from localStorage
    const saved = localStorage.getItem(`test_${testId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const statuses: Record<number, QuestionStatus> = {};
    const answers: Record<number, number | null> = {};
    questions.forEach((_, i) => {
      statuses[i] = i === 0 ? 'not-answered' : 'not-visited';
      answers[i] = null;
    });
    return { answers, statuses, currentQuestion: 0, tabSwitchCount: 0, startTime: Date.now() };
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    const duration = (testInfo?.duration || 60) * 60;
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    return Math.max(0, duration - elapsed);
  });

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-save
  useEffect(() => {
    localStorage.setItem(`test_${testId}`, JSON.stringify(state));
  }, [state, testId]);

  // Timer
  useEffect(() => {
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
  }, []);

  // Anti-cheating: tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setState(prev => {
          const count = prev.tabSwitchCount + 1;
          if (count >= 3) {
            toast.error('You switched tabs 3 times. Test auto-submitted.');
            setTimeout(() => handleSubmit(), 500);
          } else {
            toast.warning(`Warning ${count}/3: Tab switch detected! Test will be auto-submitted after 3 switches.`);
          }
          return { ...prev, tabSwitchCount: count };
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Anti-cheating: disable right click, copy, paste, dev tools
  useEffect(() => {
    const preventDefault = (e: Event) => { e.preventDefault(); toast.warning('This action is disabled during the exam.'); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
        toast.warning('Developer tools are disabled during the exam.');
      }
    };
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fullscreen
  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
  }, []);

  useEffect(() => {
    enterFullscreen();
    const handleFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSubmit = useCallback(() => {
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
  }, [state.answers, timeLeft, testId, questions, navigate, testInfo]);

  const selectOption = (optionIndex: number) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentQuestion]: optionIndex },
      statuses: { ...prev.statuses, [prev.currentQuestion]: 'answered' },
    }));
  };

  const saveAndNext = () => {
    if (state.currentQuestion < questions.length - 1) {
      setState(prev => {
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
    if (state.currentQuestion > 0) {
      setState(prev => ({ ...prev, currentQuestion: prev.currentQuestion - 1 }));
    }
  };

  const markForReview = () => {
    setState(prev => ({
      ...prev,
      statuses: { ...prev.statuses, [prev.currentQuestion]: 'marked' },
    }));
    saveAndNext();
  };

  const clearResponse = () => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentQuestion]: null },
      statuses: { ...prev.statuses, [prev.currentQuestion]: 'not-answered' },
    }));
  };

  const goToQuestion = (index: number) => {
    setState(prev => ({
      ...prev,
      currentQuestion: index,
      statuses: { ...prev.statuses, [index]: prev.statuses[index] === 'not-visited' ? 'not-answered' : prev.statuses[index] },
    }));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[state.currentQuestion];
  if (!currentQ) return null;

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
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="font-display font-bold text-foreground text-sm">
            Mock<span className="text-primary">Prep</span>
          </span>
          <span className="text-sm text-muted-foreground hidden sm:block">{testInfo?.testName || 'Mock Test'}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">Candidate: Student</span>
          <Button size="sm" variant="destructive" onClick={() => setShowSubmitDialog(true)} className="gap-1">
            <Send className="h-3.5 w-3.5" /> Submit Test
          </Button>
        </div>
      </div>

      {!isFullscreen && (
        <div className="bg-accent/50 px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-accent-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Fullscreen recommended for exam experience</span>
          <Button size="sm" variant="outline" onClick={enterFullscreen}>Enter Fullscreen</Button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Question */}
        <div className="flex-1 flex flex-col overflow-auto p-6">
          <div className="flex-1">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                {state.currentQuestion + 1}
              </span>
              <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded bg-muted">{currentQ.subject}</span>
            </div>

            <h3 className="text-lg font-medium text-foreground leading-relaxed mb-6">{currentQ.question}</h3>

            <div className="space-y-3">
              {currentQ.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => selectOption(i)}
                  className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${
                    state.answers[state.currentQuestion] === i
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/50'
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      state.answers[state.currentQuestion] === i
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm">{option}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={goToPrevious} disabled={state.currentQuestion === 0} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button size="sm" onClick={saveAndNext} disabled={state.currentQuestion === questions.length - 1} className="gap-1">
              Save & Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={markForReview} className="gap-1">
              <Flag className="h-3.5 w-3.5" /> Mark for Review
            </Button>
            <Button variant="ghost" size="sm" onClick={clearResponse} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>

        {/* Right Panel - Question Palette */}
        <div className="w-64 border-l border-border bg-card p-4 overflow-auto hidden md:block">
          <h4 className="font-semibold text-foreground text-sm mb-3">Question Palette</h4>

          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`h-9 w-9 rounded-lg text-xs font-semibold transition-all ${
                  i === state.currentQuestion ? 'ring-2 ring-ring ring-offset-1' : ''
                } ${statusColors[state.statuses[i]]}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-status-answered" />
              <span className="text-muted-foreground">Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-status-not-answered" />
              <span className="text-muted-foreground">Not Answered ({notAnsweredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-status-not-visited" />
              <span className="text-muted-foreground">Not Visited ({Object.values(state.statuses).filter(s => s === 'not-visited').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-status-marked" />
              <span className="text-muted-foreground">Marked ({markedCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg mx-4">
            <h3 className="text-lg font-display font-bold text-foreground">Submit Test?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You have answered {answeredCount} out of {questions.length} questions.
              {markedCount > 0 && ` ${markedCount} questions are marked for review.`}
            </p>
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
