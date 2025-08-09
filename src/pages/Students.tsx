import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, MoreVertical, X, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  status: "intro" | "member" | "drop-in" | "inactive";
  statusLabel: string;
  currentDay: number;
  classesThisWeek: number;
  daysSinceLastVisit: number;
  tags: string[];
  totalClasses: number;
  joinDate: string; // ISO string
}

function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const MOCK_STUDENTS: Student[] = [
  {
    id: "1",
    name: "Ava Patel",
    email: "ava.patel@example.com",
    phone: "(555) 201-3412",
    status: "intro",
    statusLabel: "Intro Day 12",
    currentDay: 12,
    classesThisWeek: 2,
    daysSinceLastVisit: 2,
    tags: ["Morning", "Beginner"],
    totalClasses: 8,
    joinDate: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Liam Chen",
    email: "liam.chen@example.com",
    phone: "(555) 555-9932",
    status: "member",
    statusLabel: "Active Member",
    currentDay: 0,
    classesThisWeek: 3,
    daysSinceLastVisit: 0,
    tags: ["Evening", "Vinyasa"],
    totalClasses: 42,
    joinDate: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Sofia Rossi",
    email: "sofia.rossi@example.com",
    phone: "(555) 777-1234",
    status: "drop-in",
    statusLabel: "Drop-in",
    currentDay: 0,
    classesThisWeek: 1,
    daysSinceLastVisit: 7,
    tags: ["Restorative"],
    totalClasses: 5,
    joinDate: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Noah Garcia",
    email: "noah.garcia@example.com",
    phone: "(555) 888-4455",
    status: "inactive",
    statusLabel: "Inactive",
    currentDay: 0,
    classesThisWeek: 0,
    daysSinceLastVisit: 21,
    tags: ["Prenatal"],
    totalClasses: 3,
    joinDate: new Date().toISOString(),
  },
];

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "intro" | "active" | "attention">("all");

  // SEO
  useEffect(() => {
    document.title = "Students Gallery | Talo Yoga Studio Manager";
    ensureMeta("description", "Browse all studio students with search and filters.");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}/students`;
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch from Supabase (best‑effort, falls back to mock)
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select(
            "id, first_name, last_name, email, phone, intro_signup_date, current_sequence_day, sequence_status, total_classes, last_time_visited, total_visits, total_money_spent, metadata"
          )
          .limit(200);
        if (error || !data) throw error || new Error("No data");

        const mapped: Student[] = data.map((c: any) => {
          const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || "Unknown";
          const lastVisited = c.last_time_visited ? new Date(c.last_time_visited) : null;
          const daysSince = lastVisited ? Math.max(0, Math.round((Date.now() - lastVisited.getTime()) / (1000 * 60 * 60 * 24))) : 999;
          const seq = (c.sequence_status ?? "").toString().toLowerCase();
          let status: Student["status"] = "member";
          if (seq.includes("intro")) status = "intro";
          else if ((c.total_visits ?? 0) === 0) status = "drop-in"; // first timer/drop-in
          if (daysSince > 30) status = "inactive";

          return {
            id: String(c.id),
            name,
            email: c.email ?? "",
            phone: c.phone ?? "",
            status,
            statusLabel:
              status === "intro"
                ? `Intro Day ${Math.max(1, Math.min(30, Number(c.current_sequence_day ?? 1)))}`
                : status === "member"
                ? "Active Member"
                : status === "drop-in"
                ? "Drop-in"
                : "Inactive",
            currentDay: Number(c.current_sequence_day ?? 0),
            classesThisWeek: 0, // unknown from this table; could be computed from attendance
            daysSinceLastVisit: daysSince,
            tags: Array.isArray(c?.metadata?.tags) ? c.metadata.tags : [],
            totalClasses: Number(c.total_classes ?? c.total_visits ?? 0),
            joinDate: (c.intro_signup_date ?? new Date().toISOString()) as string,
          };
        });
        setStudents(mapped);
      } catch (e) {
        // keep mock
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const counts = useMemo(() => {
    const all = students.length;
    const intro = students.filter((s) => s.status === "intro").length;
    const active = students.filter((s) => s.status === "member").length;
    const attention = students.filter((s) => s.daysSinceLastVisit > 14 || s.status === "inactive").length;
    return { all, intro, active, attention };
  }, [students]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (filter === "intro") list = list.filter((s) => s.status === "intro");
    if (filter === "active") list = list.filter((s) => s.status === "member");
    if (filter === "attention") list = list.filter((s) => s.daysSinceLastVisit > 14 || s.status === "inactive");

    if (debouncedSearch) {
      list = list.filter((s) =>
        [s.name, s.email, s.phone].some((v) => v?.toLowerCase().includes(debouncedSearch))
      );
    }
    return list;
  }, [students, debouncedSearch, filter]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFilter("all");
  }, []);

  const handleMessage = useCallback((id: string) => {
    toast({ title: "Message", description: `Open messaging for student #${id}` });
  }, []);

  const handleMoreOptions = useCallback((id: string) => {
    toast({ title: "Actions", description: `Show more options for #${id}` });
  }, []);

  const totalStudents = students.length;

  const StudentCard = ({ student }: { student: Student }) => {
    const getEngagementStatus = (lastVisitDays: number) => {
      if (lastVisitDays <= 7) return { color: "bg-[var(--green-positive)]", status: "active" } as const;
      if (lastVisitDays <= 14) return { color: "bg-[var(--amber-warning)]", status: "cooling" } as const;
      return { color: "bg-gray-400", status: "inactive" } as const;
    };

    const engagement = getEngagementStatus(student.daysSinceLastVisit);
    const progressPercentage = (student.currentDay / 30) * 100;

    return (
      <div
        onClick={() => navigate(`/customer/${student.id}`)}
        className="bg-[var(--card-white)] rounded-xl shadow-sm border border-[var(--border-light)] p-6 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-[color:var(--sage-medium)]/30 hover-scale animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--sage-medium)]/10 flex items-center justify-center">
                  <span className="text-[color:var(--sage-medium)] font-semibold text-sm">
                    {student.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${engagement.color}`} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[color:var(--text-primary)] truncate">{student.name}</h3>
              <p className="text-xs text-[color:var(--text-secondary)] truncate">{student.email}</p>
            </div>
          </div>

          <span
            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              student.status === "intro"
                ? "bg-[color:var(--sage-medium)]/10 text-[color:var(--sage-medium)]"
                : student.status === "member"
                ? "bg-[color:var(--green-positive)]/10 text-[color:var(--green-positive)]"
                : student.status === "drop-in"
                ? "bg-amber-500/10 text-amber-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {student.status === "intro" ? `Day ${student.currentDay}` : student.statusLabel}
          </span>
        </div>

        {/* Progress Bar */}
        {student.status === "intro" && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-[color:var(--text-primary)]">Journey Progress</span>
              <span className="text-xs text-[color:var(--text-secondary)]">{student.currentDay} of 30</span>
            </div>
            <div className="h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[color:var(--sage-medium)] to-[color:var(--green-positive)] rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold text-[color:var(--text-primary)]">{student.classesThisWeek}</p>
            <p className="text-xs text-[color:var(--text-secondary)]">Classes this week</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[color:var(--text-primary)]">
              {student.daysSinceLastVisit === 0
                ? "Today"
                : student.daysSinceLastVisit === 1
                ? "Yesterday"
                : `${student.daysSinceLastVisit}d ago`}
            </p>
            <p className="text-xs text-[color:var(--text-secondary)]">Last visit</p>
          </div>
        </div>

        {/* Tags */}
        {student.tags && student.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {student.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-[var(--background-cream)] text-[color:var(--sage-medium)] rounded-full text-xs">
                {tag}
              </span>
            ))}
            {student.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-[var(--background-cream)] text-[color:var(--sage-medium)] rounded-full text-xs">
                +{student.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMessage(student.id);
            }}
            className="flex-1 px-3 py-2 bg-[var(--sidebar-bg)] text-white rounded-lg text-sm font-medium hover:bg-[#1F3530] transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMoreOptions(student.id);
            }}
            className="px-3 py-2 bg-[var(--background-cream)] text-[color:var(--sidebar-bg)] rounded-lg text-sm font-medium hover:bg-[#F0EBE5] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background-cream)]">
      <main className="p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-[color:var(--text-primary)] mb-2">Your Studio Community</h1>
          <p className="text-[color:var(--text-secondary)]">{totalStudents} students on their wellness journey with you</p>
        </header>

        {/* Filter Bar */}
        <section className="bg-[var(--card-white)] rounded-lg p-4 shadow-sm border border-[var(--border-light)] mb-8">
          <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-light)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--sage-medium)] focus:border-transparent placeholder-[color:var(--text-tertiary)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === "all"
                    ? "bg-[var(--sidebar-bg)] text-white"
                    : "bg-white border border-[var(--border-light)] text-[color:var(--text-secondary)] hover:bg-gray-50"
                }`}
              >
                All Students ({counts.all})
              </button>
              <button
                onClick={() => setFilter("intro")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === "intro"
                    ? "bg-[var(--sidebar-bg)] text-white"
                    : "bg-white border border-[var(--border-light)] text-[color:var(--text-secondary)] hover:bg-gray-50"
                }`}
              >
                Intro Offers ({counts.intro})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === "active"
                    ? "bg-[var(--sidebar-bg)] text-white"
                    : "bg-white border border-[var(--border-light)] text-[color:var(--text-secondary)] hover:bg-gray-50"
                }`}
              >
                Active Members ({counts.active})
              </button>
              <button
                onClick={() => setFilter("attention")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                  filter === "attention"
                    ? "bg-[var(--sidebar-bg)] text-white"
                    : "bg-white border border-[var(--border-light)] text-[color:var(--text-secondary)] hover:bg-gray-50"
                }`}
              >
                Need Attention ({counts.attention})
                {counts.attention > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"></span>}
              </button>
            </div>

            {(searchTerm || filter !== "all") && (
              <button
                onClick={clearFilters}
                className="text-sm text-[color:var(--sage-medium)] hover:text-[color:var(--sage-dark)] font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Grid */}
        {loading ? (
          <div className="text-sm text-[color:var(--text-secondary)]">Loading students…</div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-[var(--background-cream)] rounded-full flex items-center justify-center mb-4">
              <UsersIcon className="w-8 h-8 text-[color:var(--sage-medium)]" />
            </div>
            <h3 className="text-lg font-medium text-[color:var(--text-primary)] mb-2">No students found</h3>
            <p className="text-sm text-[color:var(--text-secondary)] text-center max-w-sm">
              {debouncedSearch ? `No students match "${searchTerm}"` : "Try adjusting your filters to see more students"}
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-sm text-[color:var(--sage-medium)] hover:text-[color:var(--sage-dark)] font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

