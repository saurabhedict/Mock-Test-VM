import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  ArrowLeft,
  Home,
  RefreshCw,
  Trash2,
  PlayCircle,
  History,
  Clock3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Attempt {
  _id: string;
  user: { name: string; email: string } | null;
  test: { title: string };
  score: number;
  status: string;
  terminationReason?: string;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
  totalMarks?: number;
}

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const matchesSearch = (attempt: Attempt, search: string) => {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  return (
    attempt.user?.name?.toLowerCase().includes(normalized) ||
    attempt.user?.email?.toLowerCase().includes(normalized) ||
    attempt.test?.title?.toLowerCase().includes(normalized) ||
    false
  );
};

export default function Monitoring() {
  const [liveAttempts, setLiveAttempts] = useState<Attempt[]>([]);
  const [historyAttempts, setHistoryAttempts] = useState<Attempt[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchAttempts = useCallback(async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    try {
      const { data } = await api.get("/admin/attempts");
      setLiveAttempts(data.liveAttempts || []);
      setHistoryAttempts(data.historyAttempts || []);
      setSelectedIds((current) =>
        current.filter((id) => (data.historyAttempts || []).some((attempt: Attempt) => attempt._id === id))
      );
    } catch {
      toast.error("Failed to load monitoring data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAttempts();
    const interval = window.setInterval(() => {
      fetchAttempts();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchAttempts]);

  const filteredLive = useMemo(
    () => liveAttempts.filter((attempt) => matchesSearch(attempt, search)),
    [liveAttempts, search]
  );
  const filteredHistory = useMemo(
    () => historyAttempts.filter((attempt) => matchesSearch(attempt, search)),
    [historyAttempts, search]
  );

  const allVisibleHistorySelected =
    filteredHistory.length > 0 && filteredHistory.every((attempt) => selectedIds.includes(attempt._id));

  const toggleSelection = (attemptId: string) => {
    setSelectedIds((current) =>
      current.includes(attemptId)
        ? current.filter((id) => id !== attemptId)
        : [...current, attemptId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleHistorySelected) {
      setSelectedIds((current) => current.filter((id) => !filteredHistory.some((attempt) => attempt._id === id)));
      return;
    }

    setSelectedIds((current) => [...new Set([...current, ...filteredHistory.map((attempt) => attempt._id)])]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      const { data } = await api.delete("/admin/attempts", { data: { ids: selectedIds } });
      setHistoryAttempts((current) => current.filter((attempt) => !selectedIds.includes(attempt._id)));
      setSelectedIds([]);
      toast.success(`Deleted ${data.deletedCount || 0} history item(s)`);
    } catch {
      toast.error("Failed to delete selected history items");
    } finally {
      setDeleting(false);
    }
  };

  const handleTerminateLive = async (attemptId: string) => {
    if (!window.confirm("Are you sure you want to terminate and clear this live test?")) return;
    setTerminating(attemptId);
    try {
      await api.delete(`/admin/attempts/${attemptId}/live`);
      setLiveAttempts((current) => current.filter((attempt) => attempt._id !== attemptId));
      toast.success("Live test terminated and cleared");
    } catch {
      toast.error("Failed to terminate live test");
    } finally {
      setTerminating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Monitoring</h1>
          <p className="text-muted-foreground text-sm">
            Track active test sessions in real time and manage completed attempt history.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => fetchAttempts(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Link to="/"><Button variant="outline"><Home className="mr-2 h-4 w-4" /> Home</Button></Link>
          <Link to="/admin"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button></Link>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student or test..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Live Tests</h2>
                <p className="text-xs text-muted-foreground">{filteredLive.length} active session(s)</p>
              </div>
            </div>
            <Badge variant="secondary">{filteredLive.length}</Badge>
          </div>

          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLive.length > 0 ? (
                filteredLive.map((attempt) => (
                  <TableRow key={attempt._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{attempt.user?.name || "N/A"}</span>
                        <span className="text-[10px] text-muted-foreground">{attempt.user?.email || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{attempt.test?.title || "Deleted Test"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(attempt.startedAt)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDateTime(attempt.lastActivityAt || attempt.startedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleTerminateLive(attempt._id)}
                        disabled={terminating === attempt._id}
                        title="Terminate and Clear Live Test"
                      >
                        {terminating === attempt._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No ongoing tests match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>

        <section className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Test History</h2>
                <p className="text-xs text-muted-foreground">{filteredHistory.length} completed item(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allVisibleHistorySelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-border"
                />
                Select All
              </label>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0 || deleting}
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete Selected
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="w-12">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((attempt) => (
                  <TableRow key={attempt._id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(attempt._id)}
                        onChange={() => toggleSelection(attempt._id)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{attempt.user?.name || "N/A"}</span>
                        <span className="text-[10px] text-muted-foreground">{attempt.user?.email || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{attempt.test?.title || "Deleted Test"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {attempt.score ?? "—"}{attempt.totalMarks ? ` / ${attempt.totalMarks}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={attempt.status === "AUTO_SUBMITTED" ? "destructive" : "secondary"}>
                          {attempt.status === "AUTO_SUBMITTED" ? "Auto Submitted" : "Completed"}
                        </Badge>
                        {attempt.terminationReason && (
                          <span className="text-[10px] text-muted-foreground">{attempt.terminationReason}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(attempt.completedAt || attempt.startedAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No history items match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
