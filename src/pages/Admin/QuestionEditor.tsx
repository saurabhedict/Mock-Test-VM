import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function QuestionEditor() {
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  
  const navigate = useNavigate();

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSave = async () => {
    if (!exam || !subject || !question || options.some(o => !o)) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await axios.post("http://localhost:5000/api/admin/questions", 
        { exam, subject, question, options, correctAnswer, explanation, difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Question created successfully");
        navigate("/admin/tests");
      }
    } catch (error) {
      toast.error("Failed to create question");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Add New Question</h1>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Exam Category</Label>
            <Input value={exam} onChange={e => setExam(e.target.value)} placeholder="e.g., JEE" />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Physics" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Question Text</Label>
          <Textarea 
            value={question} 
            onChange={e => setQuestion(e.target.value)} 
            placeholder="Enter the main question..."
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label>Options</Label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input 
                type="radio" 
                name="correctOption"
                checked={correctAnswer === idx}
                onChange={() => setCorrectAnswer(idx)}
              />
              <Input 
                value={opt} 
                onChange={e => handleOptionChange(idx, e.target.value)} 
                placeholder={`Option ${idx + 1}`} 
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Explanation</Label>
          <Textarea 
            value={explanation} 
            onChange={e => setExplanation(e.target.value)} 
            placeholder="Why is this answer correct?"
          />
        </div>

        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/tests")}>Cancel</Button>
          <Button onClick={handleSave}>Save Question</Button>
        </div>
      </div>
    </div>
  );
}
