import { useEffect, useMemo, useState } from "react";
import { Search, X, Users as UsersIcon } from "lucide-react";
import CustomerCard, { GalleryCustomer } from "@/components/customers/CustomerCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IntroOffers from "./IntroOffers";

function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const MOCK: GalleryCustomer[] = [
  { id: "1", name: "Ava Patel", email: "ava.patel@example.com", status: "intro", statusLabel: "Intro Offer", currentDay: 12, classesThisWeek: 2, daysSinceLastVisit: 1, tags: ["Morning", "Beginner"], photo: undefined },
  { id: "2", name: "Liam Chen", email: "liam.chen@example.com", status: "member", statusLabel: "Member", currentDay: 0, classesThisWeek: 3, daysSinceLastVisit: 0, tags: ["Evening", "Vinyasa"], photo: undefined },
  { id: "3", name: "Sofia Rossi", email: "sofia.rossi@example.com", status: "drop-in", statusLabel: "Drop-in", currentDay: 0, classesThisWeek: 1, daysSinceLastVisit: 9, tags: ["Hatha"], photo: undefined },
  { id: "4", name: "Noah Garcia", email: "noah.garcia@example.com", status: "inactive", statusLabel: "Inactive", currentDay: 0, classesThisWeek: 0, daysSinceLastVisit: 22, tags: ["Restorative"], photo: undefined },
  { id: "5", name: "Mia Müller", email: "mia.mueller@example.com", status: "intro", statusLabel: "Intro Offer", currentDay: 26, classesThisWeek: 2, daysSinceLastVisit: 3, tags: ["Prenatal", "Morning"], photo: undefined },
  { id: "6", name: "Jon Park", email: "jon.park@example.com", status: "member", statusLabel: "Member", currentDay: 0, classesThisWeek: 4, daysSinceLastVisit: 2, tags: ["Power", "Evening"], photo: undefined },
];

type Filter = "all" | "intro" | "active" | "attention";

export default function CustomersGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // SEO
  useEffect(() => {
    document.title = "Customers Gallery | Talo Yoga";
    ensureMeta("description", "Browse your studio community. Filter intro offers, active members, and those needing attention.");
    const href = `${window.location.origin}/customers`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = href;
  }, []);

  // Derived counts and filtering
  const counts = useMemo(() => {
    const all = MOCK.length;
    const intro = MOCK.filter((s) => s.status === "intro").length;
    const active = MOCK.filter((s) => s.status === "member").length;
    const attention = MOCK.filter((s) => s.daysSinceLastVisit > 14 || (s.status === "intro" && s.currentDay >= 25)).length;
    return { all, intro, active, attention };
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = [...MOCK];
    if (filter === "intro") list = list.filter((s) => s.status === "intro");
    if (filter === "active") list = list.filter((s) => s.status === "member");
    if (filter === "attention") list = list.filter((s) => s.daysSinceLastVisit > 14 || (s.status === "intro" && s.currentDay >= 25));
    if (!term) return list;
    return list.filter((s) => [s.name, s.email].some((v) => v.toLowerCase().includes(term)));
  }, [searchTerm, filter]);

  const clearFilters = () => { setSearchTerm(""); setFilter("all"); };

  const totalStudents = MOCK.length;

  const prospects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = MOCK.filter((s) => s.status === "inactive" || (s as any).status === "prospect");
    if (!term) return list;
    return list.filter((s) => [s.name, s.email].some((v) => v.toLowerCase().includes(term)));
  }, [searchTerm]);

  const dropins = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = MOCK.filter((s) => s.status === "drop-in");
    if (!term) return list;
    return list.filter((s) => [s.name, s.email].some((v) => v.toLowerCase().includes(term)));
  }, [searchTerm]);

  const clearSearch = () => setSearchTerm("");

  const handleMessage = (id: string) => { /* TODO: open message modal */ };
  const handleMoreOptions = (id: string) => { /* TODO: open dropdown */ };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-2 animate-fade-in">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Your Studio Community</h1>
        <p className="text-muted-foreground">{totalStudents} students on their wellness journey with you</p>
      </header>

      <Tabs defaultValue="intro" className="space-y-6">
        <TabsList>
          <TabsTrigger value="intro">Intro Offer</TabsTrigger>
          <TabsTrigger value="dropins">Drop-Ins</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects">
          {/* Search Bar */}
          <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm border mb-6 animate-fade-in">
            <div className="flex items-center gap-5 flex-wrap lg:flex-nowrap">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search prospects"
                />
              </div>
              {searchTerm && (
                <button onClick={clearSearch} className="text-sm text-foreground/70 hover:text-foreground font-medium flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {prospects.map((s) => (
              <CustomerCard key={s.id} customer={s} onMessage={handleMessage} onMore={handleMoreOptions} />
            ))}
          </section>

          {/* Empty state */}
          {prospects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <UsersIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No prospects found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchTerm ? `No prospects match "${searchTerm}"` : "Try a different search"}
              </p>
              <button onClick={clearSearch} className="mt-4 px-4 py-2 text-sm text-primary hover:underline">
                Clear search
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dropins">
          {/* Search Bar */}
          <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm border mb-6 animate-fade-in">
            <div className="flex items-center gap-5 flex-wrap lg:flex-nowrap">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search drop-ins"
                />
              </div>
              {searchTerm && (
                <button onClick={clearSearch} className="text-sm text-foreground/70 hover:text-foreground font-medium flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dropins.map((s) => (
              <CustomerCard key={s.id} customer={s} onMessage={handleMessage} onMore={handleMoreOptions} />
            ))}
          </section>

          {/* Empty state */}
          {dropins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <UsersIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No drop-ins found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchTerm ? `No drop-ins match "${searchTerm}"` : "Try a different search"}
              </p>
              <button onClick={clearSearch} className="mt-4 px-4 py-2 text-sm text-primary hover:underline">
                Clear search
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="intro">
          <IntroOffers embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
