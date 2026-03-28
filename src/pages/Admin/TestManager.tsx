import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Edit, CheckCircle2, XCircle, LayoutGrid, BookOpen, MinusCircle, Pencil, Home } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { mergeExamCatalog, type DynamicExam } from "@/lib/examCatalog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Test {
  _id: string;
  title: string;
  exam: string;
  subject: string;
  subjects?: string[];
  durationMinutes: number;
  totalMarks: number;
  isPublished: boolean;
  _count?: { questions: number };
}

interface ExamFormSubject {
  name: string;
  questionCount: number;
  marksPerQuestion: number;
  negativeMarksPerQuestion: number;
}

const emptyExamSubject = (): ExamFormSubject => ({
  name: "",
  questionCount: 0,
  marksPerQuestion: 1,
  negativeMarksPerQuestion: 0,
});

const TestManager = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [exams, setExams] = useState<DynamicExam[]>([]);
  const [newTest, setNewTest] = useState({
    title: "",
    exam: "",
    subject: "",
    subjects: [] as string[],
    durationMinutes: 60,
    totalMarks: 100,
  });
  const [newExam, setNewExam] = useState({
    id: "",
    name: "",
    shortName: "",
    description: "",
    icon: "📝",
    durationMinutes: 60,
    subjects: [emptyExamSubject()],
  });
  const [loading, setLoading] = useState(true);
  const [savingExam, setSavingExam] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingTestId, setSavingTestId] = useState<string | null>(null);
  const examCatalog = mergeExamCatalog(exams);

  useEffect(() => {
    fetchTests();
    fetchExams();
  }, []);

  useEffect(() => {
    if (!newTest.exam && examCatalog.length > 0) {
      hydrateTestForm(examCatalog[0].examId);
    }
  }, [examCatalog, newTest.exam]);

  const fetchTests = async () => {
    try {
      const { data } = await api.get("/admin/tests");
      setTests(data);
    } catch (error) {
      toast({ title: "Failed to load tests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const { data } = await api.get("/admin/exams");
      setExams(data);
    } catch (error) {
      toast({ title: "Failed to load exams", variant: "destructive" });
    }
  };

  const hydrateTestForm = (examId: string) => {
    if (!examId) return;
    const exam = examCatalog.find((item) => item.examId === examId);
    const firstSubject = exam?.subjects[0]?.subjectName || "";

    setNewTest((prev) => ({
      ...prev,
      exam: examId,
      subject: firstSubject,
      subjects: firstSubject ? [firstSubject] : [],
      durationMinutes: exam?.durationMinutes || prev.durationMinutes,
      totalMarks: exam?.totalMarks || prev.totalMarks,
    }));
  };

  const selectedExam = examCatalog.find((exam) => exam.examId === newTest.exam);
  const selectedExamSubjects = selectedExam?.subjects.map((subject) => subject.subjectName) || [];

  const updateExamSubject = (index: number, updates: Partial<ExamFormSubject>) => {
    setNewExam((prev) => ({
      ...prev,
      subjects: prev.subjects.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, ...updates } : subject
      ),
    }));
  };

  const addExamSubject = () => {
    setNewExam((prev) => ({
      ...prev,
      subjects: [...prev.subjects, emptyExamSubject()],
    }));
  };

  const removeExamSubject = (index: number) => {
    setNewExam((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, subjectIndex) => subjectIndex !== index),
    }));
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExam(true);

    const validSubjects = newExam.subjects.filter((subject) => subject.name.trim());
    if (validSubjects.length === 0) {
      setSavingExam(false);
      return toast({ title: "Add at least one subject", variant: "destructive" });
    }

    try {
      const payload = {
        ...newExam,
        subjects: validSubjects,
      };
      const { data } = newExam.id
        ? await api.put(`/admin/exams/${newExam.id}`, payload)
        : await api.post("/admin/exams", payload);

      setExams((prev) =>
        newExam.id ? prev.map((exam) => (exam._id === data._id ? data : exam)) : [data, ...prev]
      );
      setNewExam({
        id: "",
        name: "",
        shortName: "",
        description: "",
        icon: "📝",
        durationMinutes: 60,
        subjects: [emptyExamSubject()],
      });
      const firstSubject = data.subjects[0]?.name || "";
      setNewTest((prev) => ({
        ...prev,
        exam: data.examId,
        subject: firstSubject,
        subjects: firstSubject ? [firstSubject] : [],
        durationMinutes: data.durationMinutes || prev.durationMinutes,
        totalMarks: data.totalMarks || prev.totalMarks,
      }));
      toast({ title: newExam.id ? "Exam blueprint updated successfully" : "Exam blueprint created successfully" });
    } catch (error: any) {
      toast({ title: error?.response?.data?.msg || "Failed to create exam", variant: "destructive" });
    } finally {
      setSavingExam(false);
    }
  };

  const handleEditExam = (exam: DynamicExam) => {
    setNewExam({
      id: exam._id,
      name: exam.examName,
      shortName: exam.shortName,
      description: exam.description || "",
      icon: exam.icon || "📝",
      durationMinutes: exam.durationMinutes,
      subjects: exam.subjects.map((subject) => ({
        name: subject.name,
        questionCount: subject.questionCount,
        marksPerQuestion: subject.marksPerQuestion,
        negativeMarksPerQuestion: subject.negativeMarksPerQuestion ?? 0,
      })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetExamForm = () => {
    setNewExam({
      id: "",
      name: "",
      shortName: "",
      description: "",
      icon: "📝",
      durationMinutes: 60,
      subjects: [emptyExamSubject()],
    });
  };

  const handleDeleteExam = async (exam: DynamicExam) => {
    if (!confirm(`Delete exam "${exam.shortName}"? This only works when no tests use it.`)) return;
    try {
      await api.delete(`/admin/exams/${exam._id}`);
      setExams((prev) => prev.filter((item) => item._id !== exam._id));
      if (newExam.id === exam._id) {
        resetExamForm();
      }
      toast({ title: "Exam deleted successfully" });
    } catch (error: any) {
      toast({ title: error?.response?.data?.msg || "Failed to delete exam", variant: "destructive" });
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTest.subject) return toast({ title: "Please select a subject" });

    try {
      const { data } = await api.post("/admin/tests", newTest);
      setTests([data, ...tests]);
      setNewTest((prev) => ({ ...prev, title: "", subject: "", subjects: [] }));
      toast({ title: "Test created successfully" });
    } catch (error) {
      toast({ title: "Failed to create test", variant: "destructive" });
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    try {
      await api.put(`/admin/tests/${id}/publish`, { isPublished: !current });
      setTests(tests.map((t) => (t._id === id ? { ...t, isPublished: !current } : t)));
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Are you sure? All questions in this test will be deleted.")) return;
    try {
      await api.delete(`/admin/tests/${id}`);
      setTests(tests.filter((t) => t._id !== id));
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const openRenameDialog = (test: Test) => {
    setEditingTest(test);
    setEditingTitle(test.title);
  };

  const closeRenameDialog = () => {
    if (savingTestId) return;
    setEditingTest(null);
    setEditingTitle("");
  };

  const saveTestTitle = async () => {
    if (!editingTest) return;

    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      toast({ title: "Test title is required", variant: "destructive" });
      return;
    }

    setSavingTestId(editingTest._id);
    try {
      const { data } = await api.put(`/admin/tests/${editingTest._id}`, { title: nextTitle });
      setTests((current) => current.map((test) => (test._id === editingTest._id ? data : test)));
      toast({ title: "Test renamed successfully" });
      setEditingTest(null);
      setEditingTitle("");
    } catch (error: any) {
      toast({ title: error?.response?.data?.msg || "Rename failed", variant: "destructive" });
    } finally {
      setSavingTestId(null);
    }
  };

  const groupedByExam = tests.reduce((acc, test) => {
    const exam = test.exam || "other";
    if (!acc[exam]) acc[exam] = [];
    acc[exam].push(test);
    return acc;
  }, {} as Record<string, Test[]>);

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Exam and Mock Test Manager</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/"><Button variant="outline"><Home className="mr-2 h-4 w-4" /> Home</Button></Link>
          <Link to="/admin"><Button variant="outline">Back to Stats</Button></Link>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{newExam.id ? "Edit Exam" : "Create New Exam"}</h2>
              <p className="text-sm text-muted-foreground">
                Add a reusable exam blueprint with its own subjects, duration, and marking rules.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateExam} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Exam Name</label>
                <Input value={newExam.name} onChange={(e) => setNewExam({ ...newExam, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Short Name</label>
                <Input value={newExam.shortName} onChange={(e) => setNewExam({ ...newExam, shortName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Icon</label>
                <Input value={newExam.icon} onChange={(e) => setNewExam({ ...newExam, icon: e.target.value })} maxLength={4} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Duration (Min)</label>
                <Input
                  type="number"
                  value={newExam.durationMinutes}
                  onChange={(e) => setNewExam({ ...newExam, durationMinutes: parseInt(e.target.value || "0") })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Description</label>
              <Input
                value={newExam.description}
                onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                placeholder="Describe this exam"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Subjects and Marking</label>
                <Button type="button" variant="outline" size="sm" onClick={addExamSubject}>
                  <Plus className="mr-2 h-4 w-4" /> Add Subject
                </Button>
              </div>

              {newExam.subjects.map((subject, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 items-end rounded-xl border bg-background p-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Subject Name</label>
                    <Input value={subject.name} onChange={(e) => updateExamSubject(index, { name: e.target.value })} placeholder="Physics" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Questions</label>
                    <Input
                      type="number"
                      value={subject.questionCount}
                      onChange={(e) => updateExamSubject(index, { questionCount: parseInt(e.target.value || "0") })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Marks / Question</label>
                    <Input
                      type="number"
                      value={subject.marksPerQuestion}
                      onChange={(e) => updateExamSubject(index, { marksPerQuestion: parseInt(e.target.value || "0") })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Negative Marking</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={subject.negativeMarksPerQuestion}
                      onChange={(e) => updateExamSubject(index, { negativeMarksPerQuestion: parseFloat(e.target.value || "0") })}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" disabled={newExam.subjects.length === 1} onClick={() => removeExamSubject(index)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="shadow-lg hover:shadow-primary/20" disabled={savingExam}>
                {newExam.id ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {savingExam ? "Saving..." : newExam.id ? "Update Exam Blueprint" : "Save Exam Blueprint"}
              </Button>
              {newExam.id && (
                <Button type="button" variant="outline" onClick={resetExamForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Existing Exam Blueprints</h2>
            <p className="text-sm text-muted-foreground">Edit structure, timing, and subject rules for dynamic exams created from admin.</p>
          </div>

          <div className="space-y-3">
            {exams.length > 0 ? exams.map((exam) => (
              <div key={exam._id} className="rounded-xl border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{exam.icon}</span>
                    <span className="font-semibold">{exam.shortName}</span>
                    <span className="text-xs text-muted-foreground">({exam.examId})</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{exam.description || exam.examName}</p>
                  <div className="text-xs text-muted-foreground">
                    {exam.durationMinutes} min • {exam.totalQuestions} questions • {exam.totalMarks} marks • {exam.subjects.length} subjects
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {exam.subjects.some((subject) => (subject.negativeMarksPerQuestion ?? 0) > 0)
                      ? `Negative marking enabled in ${exam.subjects.filter((subject) => (subject.negativeMarksPerQuestion ?? 0) > 0).length} subject(s)`
                      : "No negative marking"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleEditExam(exam)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-red-600" onClick={() => handleDeleteExam(exam)}>
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground">No custom exam blueprints created yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 border-dashed border-2">
        <CardContent className="p-6">
          <form onSubmit={handleCreateTest} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Test Title</label>
              <Input
                placeholder="e.g. Mock Test 1"
                value={newTest.title}
                onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                required
                className="bg-background border-none shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Select Exam</label>
              <Select value={newTest.exam} onValueChange={hydrateTestForm}>
                <SelectTrigger className="bg-background border-none shadow-sm">
                  <SelectValue placeholder="Exam" />
                </SelectTrigger>
                <SelectContent>
                  {examCatalog.map((exam) => (
                    <SelectItem key={exam.examId} value={exam.examId}>{exam.shortName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Subject / Category</label>
              <Select
                value={newTest.subject}
                onValueChange={(value) =>
                  setNewTest({
                    ...newTest,
                    subject: value,
                    subjects: value === "All Subjects" ? selectedExamSubjects : [value],
                  })
                }
              >
                <SelectTrigger className="bg-background border-none shadow-sm">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {selectedExamSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                  {selectedExamSubjects.length > 1 && <SelectItem value="All Subjects">All Subjects</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Duration (Min)</label>
              <Input
                type="number"
                value={newTest.durationMinutes}
                onChange={(e) => setNewTest({ ...newTest, durationMinutes: parseInt(e.target.value || "0") })}
                required
                className="bg-background border-none shadow-sm"
              />
              <p className="text-[11px] text-muted-foreground">Blueprint default is prefilled, but you can override it for this test.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Total Marks</label>
              <Input
                type="number"
                value={newTest.totalMarks}
                onChange={(e) => setNewTest({ ...newTest, totalMarks: parseInt(e.target.value || "0") })}
                required
                className="bg-background border-none shadow-sm"
              />
              <p className="text-[11px] text-muted-foreground">Use custom marks here if this test should differ from the exam blueprint.</p>
            </div>

            <Button type="submit" className="w-full h-10 shadow-lg hover:shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-8">
                {Object.entries(groupedByExam).length > 0 ? Object.entries(groupedByExam).map(([examKey, examTests]) => (
          <div key={examKey} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs uppercase tracking-widest leading-none">
                {examCatalog.find((exam) => exam.examId === examKey)?.shortName || examKey}
              </h2>
              <div className="h-[1px] flex-1 bg-border"></div>
            </div>

            <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[30%]">Test Title</TableHead>
                    <TableHead>Category / Subject</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examTests.map((test) => (
                    <TableRow key={test._id} className="hover:bg-accent/5">
                      <TableCell className="font-semibold">{test.title}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">{test.subject}</span>
                      </TableCell>
                      <TableCell>{test._count?.questions || 0}</TableCell>
                      <TableCell>
                        {test.isPublished ? (
                          <span className="flex items-center text-green-500 text-[10px] gap-1 uppercase font-black">
                            <CheckCircle2 className="h-3 w-3" /> Published
                          </span>
                        ) : (
                          <span className="flex items-center text-muted-foreground text-[10px] gap-1 uppercase font-black">
                            <XCircle className="h-3 w-3" /> Draft
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button
                          variant={test.isPublished ? "outline" : "default"}
                          size="sm"
                          className="h-8 text-[11px] px-3 font-bold"
                          onClick={() => togglePublish(test._id, test.isPublished)}
                        >
                          {test.isPublished ? "Unpublish" : "Publish Now"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] px-3 font-bold"
                          onClick={() => openRenameDialog(test)}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Rename
                        </Button>
                        <Link to={`/admin/tests/${test._id}/questions`}>
                          <Button variant="secondary" size="icon" className="h-8 w-8" title="Edit Questions">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => deleteTest(test._id)} className="h-8 w-8 text-destructive hover:text-red-600 hover:bg-red-50">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl text-muted-foreground">
            {loading ? "Loading tests..." : "No tests created yet. Use the forms above to start."}
          </div>
        )}
      </div>

      <Dialog open={Boolean(editingTest)} onOpenChange={(open) => !open && closeRenameDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Test</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground">Test Title</label>
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              placeholder="Enter test title"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveTestTitle();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRenameDialog} disabled={Boolean(savingTestId)}>
              Cancel
            </Button>
            <Button onClick={() => void saveTestTitle()} disabled={Boolean(savingTestId)}>
              {savingTestId ? "Saving..." : "Save Title"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestManager;
