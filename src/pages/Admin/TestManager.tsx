import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Edit, CheckCircle2, XCircle, LayoutGrid } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Test {
    _id: string;
    title: string;
    exam: string;
    subject: string;
    durationMinutes: number;
    totalMarks: number;
    isPublished: boolean;
    _count?: { questions: number };
}

const EXAM_CONFIG: Record<string, { label: string, subjects: string[] }> = {
    "mhtcet": {
        label: "MHT CET",
        subjects: ["Physics", "Chemistry", "Maths", "Biology", "Full Length PCM", "Full Length PCB"]
    },
    "mah-bba-bca-cet": {
        label: "MAH BBA/BCA CET",
        subjects: ["English Language", "Reasoning", "General Awareness", "Computer Knowledge", "Full Length"]
    },
    "jee": {
        label: "JEE Main",
        subjects: ["Physics", "Chemistry", "Maths", "Full Length"]
    },
    "neet": {
        label: "NEET",
        subjects: ["Physics", "Chemistry", "Biology", "Full Length"]
    }
};

const TestManager = () => {
    const [tests, setTests] = useState<Test[]>([]);
    const [newTest, setNewTest] = useState({ 
        title: "", 
        exam: "mhtcet", 
        subject: "", 
        durationMinutes: 60, 
        totalMarks: 100 
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTests();
    }, []);

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

    const handleCreateTest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTest.subject) return toast({ title: "Please select a subject" });
        try {
            const { data } = await api.post("/admin/tests", newTest);
            setTests([data, ...tests]);
            setNewTest({ ...newTest, title: "", subject: "" });
            toast({ title: "Test created successfully" });
        } catch (error) {
            toast({ title: "Failed to create test", variant: "destructive" });
        }
    };

    const togglePublish = async (id: string, current: boolean) => {
        try {
            await api.put(`/admin/tests/${id}/publish`, { isPublished: !current });
            setTests(tests.map(t => t._id === id ? { ...t, isPublished: !current } : t));
        } catch (error) {
            toast({ title: "Update failed", variant: "destructive" });
        }
    };

    const deleteTest = async (id: string) => {
        if (!confirm("Are you sure? All questions in this test will be deleted.")) return;
        try {
            await api.delete(`/admin/tests/${id}`);
            setTests(tests.filter(t => t._id !== id));
        } catch (error) {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    // Group tests by exam
    const groupedByExam = tests.reduce((acc, test) => {
        const exam = test.exam || 'other';
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
                    <h1 className="text-2xl font-bold">Mock Test Manager</h1>
                </div>
                <Link to="/admin"><Button variant="outline">Back to Stats</Button></Link>
            </div>

            <Card className="bg-muted/50 border-dashed border-2">
              <CardContent className="p-6">
                <form onSubmit={handleCreateTest} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Test Title</label>
                        <Input 
                            placeholder="e.g. Mock Test 1" 
                            value={newTest.title} 
                            onChange={e => setNewTest({ ...newTest, title: e.target.value })} 
                            required 
                            className="bg-background border-none shadow-sm"
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Select Exam</label>
                        <Select value={newTest.exam} onValueChange={(val) => setNewTest({...newTest, exam: val, subject: ""})}>
                            <SelectTrigger className="bg-background border-none shadow-sm">
                                <SelectValue placeholder="Exam" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(EXAM_CONFIG).map(([key, cfg]) => (
                                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Subject / Category</label>
                        <Select value={newTest.subject} onValueChange={(val) => setNewTest({...newTest, subject: val})}>
                            <SelectTrigger className="bg-background border-none shadow-sm">
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {EXAM_CONFIG[newTest.exam]?.subjects.map(sub => (
                                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Duration (Min)</label>
                        <Input 
                            type="number" 
                            value={newTest.durationMinutes} 
                            onChange={e => setNewTest({ ...newTest, durationMinutes: parseInt(e.target.value) })} 
                            required 
                            className="bg-background border-none shadow-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Total Marks</label>
                        <Input 
                            type="number" 
                            value={newTest.totalMarks} 
                            onChange={e => setNewTest({ ...newTest, totalMarks: parseInt(e.target.value) })} 
                            required 
                            className="bg-background border-none shadow-sm"
                        />
                    </div>

                    <Button type="submit" className="w-full h-10 shadow-lg hover:shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Create</Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-8">
                {Object.entries(groupedByExam).length > 0 ? Object.entries(groupedByExam).map(([examKey, examTests]) => (
                    <div key={examKey} className="space-y-4">
                        <div className="flex items-center gap-2">
                             <h2 className="text-lg font-bold px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs uppercase tracking-widest leading-none">
                                {EXAM_CONFIG[examKey]?.label || examKey}
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
                                                <Link to={`/admin/tests/${test._id}/questions`}>
                                                    <Button variant="secondary" size="icon" className="h-8 w-8"><Edit className="h-4 w-4 text-muted-foreground" /></Button>
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
                        No tests created yet. Use the form above to start.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestManager;
