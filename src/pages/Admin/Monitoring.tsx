import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Attempt {
  _id: string;
  user: { name: string; email: string };
  test: { title: string };
  score: number;
  status: string;
  completedAt?: string;
}

const Monitoring = () => {
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchAttempts = async () => {
            try {
                const { data } = await api.get("/admin/attempts");
                setAttempts(data);
            } catch (error) {
                console.error("Fetch attempts error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttempts();
    }, []);

    const filtered = attempts.filter(a => 
        (a.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
        a.test?.title?.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
    );

    return (
        <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                   <h1 className="text-2xl font-bold">Live Monitoring</h1>
                   <p className="text-muted-foreground text-sm">Recent test attempts by students</p>
                </div>
                <Link to="/admin"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button></Link>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by student or test..." 
                    className="pl-10" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>

            <div className="border rounded-xl bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Test Name</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Completed On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? filtered.map((a) => (
                            <TableRow key={a._id} className="hover:bg-accent/5 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{a.user?.name || "N/A"}</span>
                                        <span className="text-[10px] text-muted-foreground">{a.user?.email || "N/A"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm">{a.test?.title || "Deleted Test"}</TableCell>
                                <TableCell className="font-mono text-sm">{a.score ?? "TBD"}</TableCell>
                                <TableCell>
                                    <Badge variant={a.status === "COMPLETED" ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                                        {a.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "In Progress"}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No attempts found matching your search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default Monitoring;
