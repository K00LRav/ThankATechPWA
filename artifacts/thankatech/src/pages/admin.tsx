import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Wrench, Briefcase, Heart, DollarSign, Trash2, ShieldCheck, Loader2, ClipboardList, Check, X, Phone, Mail, MapPin, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react";

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

// ─── Shared: Search + Pagination bar ─────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={15} />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-primary text-white" : "border hover:bg-muted"}`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-1.5 rounded-lg border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((search: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: "50", q: search });
    apiFetch(`/api/admin/users?${params}`)
      .then((data: any) => {
        setUsers(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load("", 1); }, [load]);

  function handleSearch(v: string) {
    setQ(v);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v, 1), 300);
  }

  function handlePage(p: number) {
    setPage(p);
    load(q, p);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user and their profile? This cannot be undone.")) return;
    await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load(q, page);
  }

  async function toggleAdmin(id: string, cur: boolean) {
    await apiFetch(`/api/admin/users/${id}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !cur }),
    });
    setUsers(u => u.map(x => x.id === id ? { ...x, isAdmin: !cur } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground shrink-0">
          {total} user{total !== 1 ? "s" : ""}
          {q && ` matching "${q}"`}
        </p>
        <div className="w-full sm:w-72">
          <SearchBar value={q} onChange={handleSearch} placeholder="Search by name or email…" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{q ? "No users match your search" : "No users yet"}</p>
        </div>
      ) : (
        <>
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
          <Pager page={page} totalPages={totalPages} onChange={handlePage} />
        </>
      )}
    </div>
  );
}

// ─── Technicians Tab ─────────────────────────────────────────────────────────
function TechniciansTab() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((search: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: "50", q: search });
    apiFetch(`/api/admin/technicians?${params}`)
      .then((data: any) => {
        setTechs(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load("", 1); }, [load]);

  function handleSearch(v: string) {
    setQ(v);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v, 1), 300);
  }

  function handlePage(p: number) {
    setPage(p);
    load(q, p);
  }

  async function deleteTech(id: number) {
    if (!confirm("Remove this technician? Their profile will be deleted.")) return;
    await apiFetch(`/api/admin/technicians/${id}`, { method: "DELETE" });
    load(q, page);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground shrink-0">
          {total} technician{total !== 1 ? "s" : ""}
          {q && ` matching "${q}"`}
        </p>
        <div className="w-full sm:w-72">
          <SearchBar value={q} onChange={handleSearch} placeholder="Search by name, specialty, or city…" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : techs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wrench size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{q ? "No technicians match your search" : "No technicians yet"}</p>
        </div>
      ) : (
        <>
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
          <Pager page={page} totalPages={totalPages} onChange={handlePage} />
        </>
      )}
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

// ─── Claim Requests Tab ───────────────────────────────────────────────────────
function ClaimRequestsTab() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/claim-requests").then(setClaims).finally(() => setLoading(false));
  }, []);

  async function approve(id: number) {
    setActing(id);
    try {
      await apiFetch(`/api/admin/claim-requests/${id}/approve`, { method: "POST" });
      setClaims(c => c.map(x => x.id === id ? { ...x, status: "approved" } : x));
    } finally { setActing(null); }
  }

  async function reject(id: number) {
    if (!confirm("Reject this claim request?")) return;
    setActing(id);
    try {
      await apiFetch(`/api/admin/claim-requests/${id}/reject`, { method: "POST" });
      setClaims(c => c.map(x => x.id === id ? { ...x, status: "rejected" } : x));
    } finally { setActing(null); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  const pending = claims.filter(c => c.status === "pending");
  const reviewed = claims.filter(c => c.status !== "pending");

  const statusBadge = (status: string) => {
    if (status === "approved") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><Check size={11} />Approved</span>;
    if (status === "rejected") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><X size={11} />Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
  };

  const ClaimRow = ({ c, showActions }: { c: any; showActions: boolean }) => (
    <div className="border rounded-xl p-5 space-y-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">{c.claimantName}</span>
            {statusBadge(c.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Submitted {fmtDate(c.createdAt)}</p>
        </div>
        {showActions && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => approve(c.id)}
              disabled={acting === c.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {acting === c.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Approve
            </button>
            <button
              onClick={() => reject(c.id)}
              disabled={acting === c.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive text-destructive text-xs font-medium hover:bg-destructive/5 disabled:opacity-50 transition-colors"
            >
              <X size={12} />
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Claimant</p>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={13} className="text-muted-foreground shrink-0" />
            <a href={`mailto:${c.claimantEmail}`} className="text-primary hover:underline truncate">{c.claimantEmail}</a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={13} className="text-muted-foreground shrink-0" />
            <a href={`tel:${c.claimantPhone}`} className="hover:underline">{c.claimantPhone}</a>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profile Being Claimed</p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wrench size={13} className="text-muted-foreground shrink-0" />
            <a href={`/technician/${c.technicianId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              {c.techName || `Technician #${c.technicianId}`}
              <ExternalLink size={11} />
            </a>
          </div>
          {c.techSpecialty && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">{c.techSpecialty}</Badge>
            </div>
          )}
          {c.techServiceArea && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">{c.techServiceArea}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {claims.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No claim requests yet</p>
          <p className="text-sm">Requests will appear here when technicians submit them.</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            Pending Review
            <span className="text-xs font-normal bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{pending.length}</span>
          </h3>
          {pending.map(c => <ClaimRow key={c.id} c={c} showActions={true} />)}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
            Previously Reviewed
            <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{reviewed.length}</span>
          </h3>
          {reviewed.map(c => <ClaimRow key={c.id} c={c} showActions={false} />)}
        </div>
      )}
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
        <Tabs defaultValue="claims">
          <TabsList className="mb-6">
            <TabsTrigger value="claims" className="flex items-center gap-2">
              <ClipboardList size={15} />Claims
              {stats?.pendingClaims > 0 && (
                <span className="ml-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {stats.pendingClaims}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2"><Users size={15} />Users</TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center gap-2"><Wrench size={15} />Technicians</TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2"><Briefcase size={15} />Jobs</TabsTrigger>
            <TabsTrigger value="thanks" className="flex items-center gap-2"><Heart size={15} />Thanks & Tips</TabsTrigger>
          </TabsList>
          <TabsContent value="claims"><ClaimRequestsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="technicians"><TechniciansTab /></TabsContent>
          <TabsContent value="jobs"><JobsTab /></TabsContent>
          <TabsContent value="thanks"><ThanksTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
