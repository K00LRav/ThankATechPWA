import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Wrench, Briefcase, Heart, DollarSign, Trash2, ShieldCheck, Loader2, TrendingUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function fmt$(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/users").then(setUsers).finally(() => setLoading(false));
  }, []);

  async function deleteUser(id: string) {
    if (!confirm("Delete this user and their profile? This cannot be undone.")) return;
    await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setUsers(u => u.filter(x => x.id !== id));
  }

  async function toggleAdmin(id: string, cur: boolean) {
    await apiFetch(`/api/admin/users/${id}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !cur }),
    });
    setUsers(u => u.map(x => x.id === id ? { ...x, isAdmin: !cur } : x));
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{users.length} total users</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["Name", "Email", "Type", "Joined", "Admin", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                <td className="px-4 py-3">
                  {u.userType ? (
                    <Badge variant={u.userType === "technician" ? "default" : "secondary"} className="capitalize">
                      {u.userType}
                    </Badge>
                  ) : <span className="text-muted-foreground text-xs">no profile</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleAdmin(u.id, u.isAdmin)}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${u.isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    <ShieldCheck size={12} />
                    {u.isAdmin ? "Admin" : "Make admin"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteUser(u.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Technicians Tab ─────────────────────────────────────────────────────────
function TechniciansTab() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/technicians").then(setTechs).finally(() => setLoading(false));
  }, []);

  async function deleteTech(id: number) {
    if (!confirm("Remove this technician? Their profile will be deleted.")) return;
    await apiFetch(`/api/admin/technicians/${id}`, { method: "DELETE" });
    setTechs(t => t.filter(x => x.id !== id));
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{techs.length} technicians</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["ID", "Name", "Specialty", "Location", "Rate", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {techs.map(t => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">#{t.id}</td>
                <td className="px-4 py-3 font-medium">{t.fullName}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{t.specialty}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.serviceArea || "—"}</td>
                <td className="px-4 py-3">{t.hourlyRate ? `$${t.hourlyRate}/hr` : "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteTech(t.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Jobs Tab ────────────────────────────────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/jobs").then(setJobs).finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{jobs.length} jobs</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["ID", "Description", "Status", "Tech ID", "Customer ID", "Created"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map(j => (
              <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">#{j.id}</td>
                <td className="px-4 py-3 max-w-xs truncate">{j.description || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[j.status] ?? "bg-muted"}`}>
                    {j.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">#{j.technicianId}</td>
                <td className="px-4 py-3 text-muted-foreground">#{j.customerId}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(j.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Thanks Tab ──────────────────────────────────────────────────────────────
function ThanksTab() {
  const [thanks, setThanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/thanks").then(setThanks).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{thanks.length} thank messages</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["ID", "Message", "Tip", "Tech ID", "Customer ID", "Sent"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {thanks.map(t => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">#{t.id}</td>
                <td className="px-4 py-3 max-w-xs truncate">{t.message}</td>
                <td className="px-4 py-3">
                  {t.tipAmount ? (
                    <span className="text-green-600 font-medium">{fmt$(t.tipAmount)}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">#{t.technicianId}</td>
                <td className="px-4 py-3 text-muted-foreground">#{t.customerId}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/admin/me")
      .then(() => {
        setIsAdmin(true);
        return apiFetch("/api/admin/stats");
      })
      .then(setStats)
      .catch(() => setIsAdmin(false));
  }, [user]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck size={40} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">Sign in required</h2>
        <p className="text-muted-foreground">You must be signed in to access this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck size={40} className="text-destructive" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin access.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-16">
      <div className="bg-foreground text-background py-8 px-4">
        <div className="container mx-auto max-w-6xl flex items-center gap-3">
          <ShieldCheck size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Admin Dashboard</h1>
            <p className="text-background/60 text-sm">ThankATech platform management</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Stats overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-blue-100 text-blue-600" />
            <StatCard icon={Wrench} label="Technicians" value={stats.totalTechnicians} color="bg-amber-100 text-amber-600" />
            <StatCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs} color="bg-purple-100 text-purple-600" />
            <StatCard icon={Heart} label="Thanks Sent" value={stats.totalThanks} color="bg-rose-100 text-rose-600" />
            <StatCard icon={DollarSign} label="Tips Paid Out" value={fmt$(stats.totalTipsAmount)} color="bg-green-100 text-green-600" />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2"><Users size={15} />Users</TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center gap-2"><Wrench size={15} />Technicians</TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2"><Briefcase size={15} />Jobs</TabsTrigger>
            <TabsTrigger value="thanks" className="flex items-center gap-2"><Heart size={15} />Thanks & Tips</TabsTrigger>
          </TabsList>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="technicians"><TechniciansTab /></TabsContent>
          <TabsContent value="jobs"><JobsTab /></TabsContent>
          <TabsContent value="thanks"><ThanksTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
