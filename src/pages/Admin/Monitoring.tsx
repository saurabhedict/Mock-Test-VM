import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";

interface Attempt {
  _id: string;
  userName: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  createdAt: string;
}

export default function Monitoring() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await axios.get("http://localhost:5000/api/admin/attempts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setAttempts(res.data.attempts);
        }
      } catch (error) {
        toast.error("Failed to load recent attempts");
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading monitor...</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Monitoring</h1>
        <p className="text-muted-foreground">View the latest test attempts across the platform.</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Test Title</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Time Taken</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No recent attempts.
                </TableCell>
              </TableRow>
            ) : attempts.map(attempt => (
              <TableRow key={attempt._id}>
                <TableCell className="font-medium">{attempt.userName}</TableCell>
                <TableCell>{attempt.testTitle}</TableCell>
                <TableCell>{attempt.score} / {attempt.totalQuestions}</TableCell>
                <TableCell>{Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s</TableCell>
                <TableCell>{format(new Date(attempt.createdAt), "PPp")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
