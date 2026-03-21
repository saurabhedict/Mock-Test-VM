import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface Test {
  _id: string;
  exam: string;
  subject: string;
  totalQuestions: number;
  duration: number;
}

export default function TestManager() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await axios.get("http://localhost:5000/api/admin/tests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTests(res.data.tests);
      }
    } catch (error) {
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await axios.delete(`http://localhost:5000/api/admin/tests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success("Test deleted successfully");
        setTests(tests.filter(t => t._id !== id));
      }
    } catch (error) {
      toast.error("Failed to delete test");
    }
  };

  const createPlaceholderTest = async () => {
    const exam = prompt("Enter Exam Name (e.g., JEE):");
    const subject = prompt("Enter Subject Name (e.g., Physics):");
    if (!exam || !subject) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await axios.post("http://localhost:5000/api/admin/tests", 
        { exam, subject, totalQuestions: 0, duration: 60 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Test created");
        fetchTests();
      }
    } catch (error) {
      toast.error("Failed to create test");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading tests...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Manager</h1>
          <p className="text-muted-foreground">Manage and organize specific tests.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/questions/new">
            <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
          </Link>
          <Button onClick={createPlaceholderTest}><Plus className="mr-2 h-4 w-4" /> New Test</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Duration (mins)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No tests found.
                </TableCell>
              </TableRow>
            ) : tests.map(test => (
              <TableRow key={test._id}>
                <TableCell className="font-medium">{test.exam}</TableCell>
                <TableCell>{test.subject}</TableCell>
                <TableCell>{test.totalQuestions || 0}</TableCell>
                <TableCell>{test.duration}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(test._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
