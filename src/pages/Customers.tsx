import { useEffect, useMemo, useState } from "react";
import { Search, X, Users as UsersIcon } from "lucide-react";
import CustomerCard, { GalleryCustomer } from "@/components/customers/CustomerCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IntroOffers from "./IntroOffers";
import ImportArketa from "./ImportArketa";
import { CustomerGridSkeleton, ErrorState, EmptyState } from "@/components/ui/loading-skeletons";
import { supabase } from "@/integrations/supabase/client";

function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Transform customer data from Supabase to gallery format
function transformCustomerData(customers: any[]): GalleryCustomer[] {
  return customers.map((customer) => {
    const daysSinceLastSeen = customer.last_seen 
      ? Math.floor((Date.now() - new Date(customer.last_seen).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    // Calculate current day for intro offers
    const currentDay = customer.intro_start_date 
      ? Math.floor((Date.now() - new Date(customer.intro_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const statusLabels = {
      intro_trial: "Intro Offer",
      active: "Member", 
      inactive: "Inactive",
      prospect: "Prospect",
      drop_in: "Drop-in"
    };
    
    return {
      id: customer.id.toString(),
      name: customer.client_name || `${customer.first_name} ${customer.last_name}`,
      email: customer.client_email,
      status: customer.status === "intro_trial" ? "intro" : 
              customer.status === "active" ? "member" :
              customer.status === "drop_in" ? "drop-in" : "inactive",
      statusLabel: statusLabels[customer.status as keyof typeof statusLabels] || "Unknown",
      currentDay: customer.status === "intro_trial" ? currentDay : 0,
      classesThisWeek: 0, // TODO: Calculate from bookings
      daysSinceLastVisit: daysSinceLastSeen,
      tags: customer.tags ? customer.tags.split(",").map((t: string) => t.trim()) : [],
      photo: undefined
    };
  });
}

type Filter = "all" | "intro" | "active" | "attention";

export default function CustomersGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<GalleryCustomer[]>([]);

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setCustomers(transformCustomerData(data || []));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomers();
  }, []);
  
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
    const all = customers.length;
    const intro = customers.filter((s) => s.status === "intro").length;
    const active = customers.filter((s) => s.status === "member").length;
    const attention = customers.filter((s) => s.daysSinceLastVisit > 14 || (s.status === "intro" && s.currentDay >= 25)).length;
    return { all, intro, active, attention };
  }, [customers]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = [...customers];
    if (filter === "intro") list = list.filter((s) => s.status === "intro");
    if (filter === "active") list = list.filter((s) => s.status === "member");
    if (filter === "attention") list = list.filter((s) => s.daysSinceLastVisit > 14 || (s.status === "intro" && s.currentDay >= 25));
    if (!term) return list;
    return list.filter((s) => [s.name, s.email].some((v) => v.toLowerCase().includes(term)));
  }, [searchTerm, filter, customers]);

  const clearFilters = () => { setSearchTerm(""); setFilter("all"); };

  const totalStudents = customers.length;

  const prospects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = customers.filter((s) => s.status === "inactive" || (s as any).status === "prospect");
    if (!term) return list;
    return list.filter((s) => [s.name, s.email].some((v) => v.toLowerCase().includes(term)));
  }, [searchTerm, customers]);

  const dropins = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = customers.filter((s) => s.status === "drop-in");
    if (!term) return list;
    return list.filter((s) => [s.name, s.email].some((v) => v.toLowerCase().includes(term)));
  }, [searchTerm, customers]);

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
          <TabsTrigger value="import">Import</TabsTrigger>
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

          {/* Loading state */}
          {loading && <CustomerGridSkeleton rows={8} />}

          {/* Error state */}
          {error && <ErrorState title="Failed to load prospects" message={error} />}

          {/* Grid */}
          {!loading && !error && (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {prospects.map((s) => (
                <CustomerCard key={s.id} customer={s} onMessage={handleMessage} onMore={handleMoreOptions} />
              ))}
            </section>
          )}

          {/* Empty state */}
          {!loading && !error && prospects.length === 0 && (
            <EmptyState
              title="No prospects found"
              message={searchTerm ? `No prospects match "${searchTerm}"` : "No prospects to display"}
              actionLabel="Clear search"
              onAction={clearSearch}
            />
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

          {/* Loading state */}
          {loading && <CustomerGridSkeleton rows={8} />}

          {/* Error state */}
          {error && <ErrorState title="Failed to load drop-ins" message={error} />}

          {/* Grid */}
          {!loading && !error && (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dropins.map((s) => (
                <CustomerCard key={s.id} customer={s} onMessage={handleMessage} onMore={handleMoreOptions} />
              ))}
            </section>
          )}

          {/* Empty state */}
          {!loading && !error && dropins.length === 0 && (
            <EmptyState
              title="No drop-ins found"
              message={searchTerm ? `No drop-ins match "${searchTerm}"` : "No drop-in customers to display"}
              actionLabel="Clear search"
              onAction={clearSearch}
            />
          )}
        </TabsContent>

        <TabsContent value="intro">
          <IntroOffers embedded />
        </TabsContent>

        <TabsContent value="import">
          <ImportArketa embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
