import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImagePlus, Trash, Save, PlusCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Question {
  _id?: string;
  question: string;
  questionImage?: string;
  options: { text: string; imageUrl?: string }[];
  correctAnswer: number;
  explanation?: string;
}

const QuestionEditor = () => {
  const { testId } = useParams<{ testId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [testId]);

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get(`/admin/tests/${testId}/questions`);
      setQuestions(data);
    } catch (error) {
      toast({ title: "Failed to load questions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
        correctAnswer: 0,
        explanation: "",
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updates };
    setQuestions(next);
  };

  const handleImageUpload = async (index: number, type: 'question' | number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = data.url;
      if (type === 'question') {
        updateQuestion(index, { questionImage: url });
      } else {
        const nextOptions = [...questions[index].options];
        nextOptions[type] = { ...nextOptions[type], imageUrl: url };
        updateQuestion(index, { options: nextOptions });
      }
      toast({ title: "Image uploaded" });
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const saveQuestion = async (index: number) => {
    const q = questions[index];
    setSavingId(String(index));
    try {
      const { data } = await api.post(`/admin/tests/${testId}/questions`, {
        questionId: q._id,
        ...q
      });
      const next = [...questions];
      next[index] = data;
      setQuestions(next);
      toast({ title: "Question saved" });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/admin/tests">
          <Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Questions</h1>
      </div>

      {questions.map((q, qIdx) => (
        <Card key={qIdx} className="overflow-hidden shadow-sm border border-border">
          <CardHeader className="bg-muted/50 p-4 border-b flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Question {qIdx + 1}</CardTitle>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => saveQuestion(qIdx)} disabled={savingId === String(qIdx)}>
                    {savingId === String(qIdx) ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-1"/> }
                    Save {q._id ? "Update" : "New"}
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8 hover:bg-red-50" onClick={() => {
                    if (confirm("Remove this question?")) setQuestions(questions.filter((_, i) => i !== qIdx));
                }}>
                    <Trash className="h-4 w-4" />
                </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase">Question Text</label>
              <Textarea 
                placeholder="Enter question text here..." 
                value={q.question} 
                onChange={e => updateQuestion(qIdx, { question: e.target.value })} 
              />
              <div className="flex items-center gap-4">
                <Input 
                   type="file" 
                   accept="image/*" 
                   className="hidden" 
                   id={`q-img-${qIdx}`} 
                   onChange={e => e.target.files?.[0] && handleImageUpload(qIdx, 'question', e.target.files[0])} 
                />
                <Button variant="outline" size="sm" asChild>
                    <label htmlFor={`q-img-${qIdx}`} className="cursor-pointer">
                        <ImagePlus className="h-4 w-4 mr-2" /> {q.questionImage ? "Change Image" : "Add Image"}
                    </label>
                </Button>
                {q.questionImage && <img src={q.questionImage} alt="Preview" className="h-20 object-contain rounded border" />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="space-y-2 p-3 border rounded-lg bg-card/50">
                   <div className="flex justify-between items-center">
                    <label className="text-xs font-bold">Option {oIdx + 1}</label>
                    <input 
                        type="radio" 
                        name={`correct-${qIdx}`} 
                        checked={q.correctAnswer === oIdx} 
                        onChange={() => updateQuestion(qIdx, { correctAnswer: oIdx })}
                    />
                   </div>
                   <Input 
                        placeholder={`Option ${oIdx + 1}`} 
                        value={opt.text} 
                        onChange={e => {
                            const next = [...q.options];
                            next[oIdx] = { ...next[oIdx], text: e.target.value };
                            updateQuestion(qIdx, { options: next });
                        }}
                    />
                    <div className="flex items-center gap-2 mt-1">
                        <Input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           id={`opt-img-${qIdx}-${oIdx}`} 
                           onChange={e => e.target.files?.[0] && handleImageUpload(qIdx, oIdx, e.target.files[0])} 
                        />
                        <button className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors flex items-center">
                           <label htmlFor={`opt-img-${qIdx}-${oIdx}`} className="cursor-pointer flex items-center"><ImagePlus className="h-3 w-3 mr-1" /> Add Image</label>
                        </button>
                        {opt.imageUrl && <img src={opt.imageUrl} alt="Preview" className="h-8 w-8 object-cover rounded border" />}
                    </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-semibold uppercase">Explanation (Optional)</label>
              <Textarea 
                placeholder="Why is this the correct answer?" 
                value={q.explanation} 
                onChange={e => updateQuestion(qIdx, { explanation: e.target.value })} 
                className="h-20"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="link" className="w-full border-2 border-dashed h-20 text-muted-foreground rounded-xl flex items-center gap-2 hover:bg-accent/10" onClick={handleAddQuestion}>
        <PlusCircle className="h-6 w-6" /> Add New Question
      </Button>
    </div>
  );
};

export default QuestionEditor;
