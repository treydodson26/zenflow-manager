import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, MoreVertical, X, Users as UsersIcon, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import SendMessageDialog from "@/components/customers/SendMessageDialog";
import EnhancedStudentCard from "@/components/students/EnhancedStudentCard";

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
  totalLifetimeValue: number;
  joinDate: string;
  lastClassDate?: string;
  segment: string;
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
    totalLifetimeValue: 289,
    joinDate: new Date().toISOString(),
    lastClassDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    segment: "Intro Offer",
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
    totalLifetimeValue: 1250,
    joinDate: new Date().toISOString(),
    lastClassDate: new Date().toISOString(),
    segment: "VIP Member",
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
    totalLifetimeValue: 125,
    joinDate: new Date().toISOString(),
    lastClassDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    segment: "Drop-in Only",
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
    totalLifetimeValue: 89,
    joinDate: new Date().toISOString(),
    lastClassDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    segment: "Needs Attention",
  },
];

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "intro" | "active" | "attention">("all");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

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
            totalLifetimeValue: Number(c.total_lifetime_value ?? 0),
            joinDate: (c.intro_signup_date ?? new Date().toISOString()) as string,
            lastClassDate: c.last_class_date,
            segment: status === "intro" ? "Intro Offer" : status === "member" ? "Active Member" : "Prospect",
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

  const handleMessage = useCallback((student: Student) => {
    setSelectedStudents([student]);
    setShowMessageDialog(true);
  }, []);

  const handleBulkMessage = useCallback(() => {
    if (selectedStudents.length === 0) {
      toast({ title: "No students selected", description: "Please select students to message" });
      return;
    }
    setShowMessageDialog(true);
  }, [selectedStudents]);

  const toggleStudentSelection = useCallback((student: Student) => {
    setSelectedStudents(prev => 
      prev.find(s => s.id === student.id) 
        ? prev.filter(s => s.id !== student.id)
        : [...prev, student]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedStudents([]);
  }, []);

  const totalStudents = students.length;


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

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-900">
                  {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                </span>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear selection
                </Button>
              </div>
              <Button size="sm" onClick={handleBulkMessage}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Selected
              </Button>
            </div>
          </div>
        )}

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
              <EnhancedStudentCard 
                key={student.id} 
                student={student}
                onMessage={handleMessage}
                onSelect={toggleStudentSelection}
                isSelected={selectedStudents.some(s => s.id === student.id)}
                showSelection={true}
              />
            ))}
          </div>
        )}

        {/* Message Dialog */}
        <SendMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          customer={selectedStudents.length > 0 ? {
            id: parseInt(selectedStudents[0].id),
            name: selectedStudents[0].name,
            email: selectedStudents[0].email,
            phone: selectedStudents[0].phone
          } : {
            id: 0,
            name: "",
            email: "",
            phone: ""
          }}
        />
      </main>
    </div>
  );
}

