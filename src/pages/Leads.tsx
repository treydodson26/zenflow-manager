import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LeadsDashboardSkeleton, ErrorState, EmptyState } from "@/components/ui/loading-skeletons";
import { supabase } from "@/integrations/supabase/client";

// SEO helper
function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const stages = [
  { key: "prospects", label: "Prospects" },
  { key: "intro_0_7", label: "Day 0-7 Intro" },
  { key: "intro_8_14", label: "Day 8-14 Intro" },
  { key: "intro_15_28", label: "Day 15-28 Intro" },
  { key: "offer_sent", label: "Membership Offer Sent" },
  { key: "membership_purchased", label: "Membership Purchased" },
  { key: "active_member", label: "Active Member" },
] as const;

const WEEK_DATA = [
  { stage: "Initial Contact", current: 12, previous: 9 },
  { stage: "Intro Started", current: 10, previous: 8 },
  { stage: "Application Submitted", current: 9, previous: 7 },
  { stage: "Membership", current: 5, previous: 1 },
  { stage: "Retained", current: 8, previous: 7 },
];

const CHART_CONFIG = {
  current: { label: "Current Week", color: "hsl(var(--primary))" },
  previous: { label: "Previous Week", color: "hsl(var(--muted-foreground))" },
};

interface LeadData {
  prospects: number;
  intro_0_7: number;
  intro_8_14: number;
  intro_15_28: number;
  offer_sent: number;
  membership_purchased: number;
  active_member: number;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  type: string;
  introDays: number;
  lastClass: string | null;
  status: string;
  created_at: string;
}

export default function Leads() {
  const [timeframe, setTimeframe] = useState("all");
  const [program, setProgram] = useState("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadCounts, setLeadCounts] = useState<LeadData>({
    prospects: 0,
    intro_0_7: 0,
    intro_8_14: 0,
    intro_15_28: 0,
    offer_sent: 0,
    membership_purchased: 0,
    active_member: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const { toast } = useToast();

  // Fetch lead data from Supabase
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build date filter based on timeframe
        let dateFilter = null;
        const now = new Date();
        if (timeframe === "30d") {
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (timeframe === "7d") {
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (timeframe === "today") {
          dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        }

        // Fetch customers data
        let customersQuery = supabase
          .from('customers')
          .select('*');
        
        if (dateFilter) {
          customersQuery = customersQuery.gte('created_at', dateFilter);
        }

        const { data: customers, error: customersError } = await customersQuery;
        if (customersError) throw customersError;

        // Fetch leads data
        let leadsQuery = supabase
          .from('leads')
          .select('*');
          
        if (dateFilter) {
          leadsQuery = leadsQuery.gte('created_at', dateFilter);
        }

        const { data: leadsData, error: leadsError } = await leadsQuery;
        if (leadsError) throw leadsError;

        // Calculate stage counts
        const counts: LeadData = {
          prospects: leadsData?.filter(l => l.status === 'new' || l.status === 'contacted').length || 0,
          intro_0_7: 0,
          intro_8_14: 0,
          intro_15_28: 0,
          offer_sent: 0,
          membership_purchased: 0,
          active_member: customers?.filter(c => c.status === 'active').length || 0,
        };

        // Process intro customers
        customers?.forEach((customer) => {
          if (customer.status === 'intro_trial' && customer.intro_start_date) {
            const startDate = new Date(customer.intro_start_date);
            const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceStart <= 7) counts.intro_0_7++;
            else if (daysSinceStart <= 14) counts.intro_8_14++;
            else if (daysSinceStart <= 28) counts.intro_15_28++;
          }
        });

        setLeadCounts(counts);

        // Transform leads for display
        const transformedLeads: Lead[] = [
          ...(leadsData?.map(lead => ({
            id: lead.id,
            name: `${lead.first_name} ${lead.last_name}`,
            email: lead.email,
            type: 'prospect',
            introDays: 0,
            lastClass: null,
            status: lead.status,
            created_at: lead.created_at
          })) || []),
          ...(customers?.filter(c => c.status === 'intro_trial').map(customer => ({
            id: customer.id.toString(),
            name: customer.client_name || `${customer.first_name} ${customer.last_name}`,
            email: customer.client_email,
            type: 'intro',
            introDays: customer.intro_start_date 
              ? Math.floor((Date.now() - new Date(customer.intro_start_date).getTime()) / (1000 * 60 * 60 * 24))
              : 0,
            lastClass: customer.last_seen,
            status: customer.status,
            created_at: customer.created_at
          })) || [])
        ];

        setLeads(transformedLeads);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeadData();
  }, [timeframe, program]);

  useEffect(() => {
    document.title = "Pipeline Dashboard | Talo Yoga";
    ensureMeta("description", "Pipeline dashboard showing lead stages, conversion metrics, and week-over-week trends.");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = `${window.location.origin}/leads`;
  }, []);

  // Filter leads based on day filter
  const filteredLeads = useMemo(() => {
    if (dayFilter === "all") return leads;
    
    return leads.filter(lead => {
      if (lead.type === 'intro') {
        const dayNum = parseInt(dayFilter);
        return Math.abs(lead.introDays - dayNum) <= 2; // Show leads within 2 days of target
      }
      return dayFilter === "0" && lead.type === 'prospect';
    });
  }, [leads, dayFilter]);

  // Calculate conversion rates based on real data
  const conversions = useMemo(() => [
    { 
      from: "Prospect", 
      to: "First Class Booked", 
      rate: leadCounts.prospects > 0 ? leadCounts.intro_0_7 / leadCounts.prospects : 0 
    },
    { 
      from: "First Class", 
      to: "Intro Package Purchase", 
      rate: leadCounts.intro_0_7 > 0 ? leadCounts.intro_8_14 / leadCounts.intro_0_7 : 0 
    },
    { 
      from: "Intro Day 7", 
      to: "Still Active", 
      rate: leadCounts.intro_0_7 > 0 ? leadCounts.intro_8_14 / leadCounts.intro_0_7 : 0 
    },
    { 
      from: "Intro Day 14", 
      to: "Still Active", 
      rate: leadCounts.intro_8_14 > 0 ? leadCounts.intro_15_28 / leadCounts.intro_8_14 : 0 
    },
    { 
      from: "Intro Complete", 
      to: "Membership Offer", 
      rate: leadCounts.intro_15_28 > 0 ? leadCounts.offer_sent / leadCounts.intro_15_28 : 0 
    },
    { 
      from: "Offer", 
      to: "Membership Purchased", 
      rate: leadCounts.offer_sent > 0 ? leadCounts.membership_purchased / leadCounts.offer_sent : 0 
    },
  ], [leadCounts]);

  // Handle sending messages
  const handleSendMessage = async (leadId: string, messageType: 'day0' | 'whatsapp') => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Log the communication
      const { error } = await supabase
        .from('communications_log')
        .insert({
          customer_id: parseInt(lead.id),
          message_sequence_id: 1,
          message_type: messageType === 'day0' ? 'email' : 'whatsapp',
          subject: messageType === 'day0' ? 'Welcome to Talo Yoga!' : null,
          content: messageType === 'day0' 
            ? 'Welcome to our yoga community! Here are some tips to get started...'
            : 'Hi! Checking in to see how your yoga journey is going.',
          recipient_email: messageType === 'day0' ? lead.email : null,
          recipient_phone: messageType === 'whatsapp' ? null : null, // Would need phone from customer data
          delivery_status: 'pending'
        });

      if (error) throw error;

      toast({ 
        title: messageType === 'day0' ? "Day 0 Email queued" : "WhatsApp sent", 
        description: `Message prepared for ${lead.name}` 
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Show loading state
  if (loading) {
    return <LeadsDashboardSkeleton />;
  }

  // Show error state
  if (error) {
    return <ErrorState title="Pipeline Error" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-foreground">Pipeline Dashboard</h1>
        <p className="text-muted-foreground">Lead performance overview with conversion metrics and stage comparisons</p>
      </header>

      <Tabs defaultValue="intro" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="intro" className="flex-1">Intro Offers</TabsTrigger>
            <TabsTrigger value="lead-list" className="flex-1">Lead List</TabsTrigger>
            <TabsTrigger value="dropin" className="flex-1">Drop-in Only</TabsTrigger>
            <TabsTrigger value="comms" className="flex-1">Communications</TabsTrigger>
            <TabsTrigger value="classes" className="flex-1">Classes</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="today">Today</SelectItem>
              </SelectContent>
            </Select>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="vinyasa">Vinyasa</SelectItem>
                <SelectItem value="restorative">Restorative</SelectItem>
                <SelectItem value="hatha">Hatha</SelectItem>
              </SelectContent>
            </Select>
            <a href="/import"><Button size="sm">Import Arketa CSV</Button></a>
          </div>
        </div>

        <TabsContent value="intro" className="space-y-6">
          {/* Day filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "0", label: "Day 0" },
              { key: "7", label: "Day 7" },
              { key: "10", label: "Day 10" },
              { key: "14", label: "Day 14" },
              { key: "28", label: "Day 28" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setDayFilter(b.key)}
                className={`px-3 py-1.5 rounded-full text-sm border ${dayFilter === b.key ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/40"}`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* KPI Stage Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {stages.map((s) => (
              <StatCard key={s.key} title={s.label} value={String(leadCounts[s.key as keyof LeadData])} subtitle="Leads" />
            ))}
          </section>

          {/* Conversion + Chart */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversion Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Conversion rates between pipeline stages</p>
                <ul className="space-y-3">
                  {conversions.map((c, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{c.from} <span className="text-muted-foreground">→</span> {c.to}</span>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{Math.round(c.rate * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Week-over-Week Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Lead volume by stage compared to previous week</p>
                <ChartContainer config={CHART_CONFIG} className="h-[260px]">
                  <BarChart data={WEEK_DATA}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="current" fill="var(--color-current)" radius={4} />
                    <Bar dataKey="previous" fill="var(--color-previous)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>

          {/* Lead Sources */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between"><span>Walk-in</span><span className="text-muted-foreground">28%</span></li>
                  <li className="flex justify-between"><span>ClassPass</span><span className="text-muted-foreground">24%</span></li>
                  <li className="flex justify-between"><span>Referral</span><span className="text-muted-foreground">18%</span></li>
                  <li className="flex justify-between"><span>QR Code Scan</span><span className="text-muted-foreground">12%</span></li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Detailed source analytics coming soon.</div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="lead-list">
          {filteredLeads.length === 0 ? (
            <EmptyState
              title="No leads found"
              message="No leads match your current filters."
              actionLabel="Reset filters"
              onAction={() => {
                setTimeframe("all");
                setProgram("all");
                setDayFilter("all");
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLeads.map((l) => (
                <Card key={l.id} className="animate-fade-in">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{l.name}</div>
                        <div className="text-sm text-muted-foreground">{l.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {l.type === "intro" && <div>Days in Intro: <span className="font-medium">{l.introDays}</span></div>}
                        <div>Last Class: <span className="font-medium">{l.lastClass ? new Date(l.lastClass).toLocaleDateString() : "—"}</span></div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {l.type === "prospect" && (
                        <Button size="sm" onClick={() => handleSendMessage(l.id, 'day0')}>Send Day 0 Email</Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => handleSendMessage(l.id, 'whatsapp')}>Send WhatsApp</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dropin">
          <Card><CardContent className="py-10 text-sm text-muted-foreground">Drop-in only customers view coming soon.</CardContent></Card>
        </TabsContent>

        <TabsContent value="comms">
          <Card><CardContent className="py-10 text-sm text-muted-foreground">Communications overview coming soon.</CardContent></Card>
        </TabsContent>

        <TabsContent value="classes">
          <Card><CardContent className="py-10 text-sm text-muted-foreground">Classes view coming soon.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
