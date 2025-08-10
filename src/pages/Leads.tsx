import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

export default function Leads() {
  const [timeframe, setTimeframe] = useState("all");
  const [program, setProgram] = useState("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Pipeline Dashboard | Talo Yoga";
    ensureMeta("description", "Pipeline dashboard showing lead stages, conversion metrics, and week-over-week trends.");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = `${window.location.origin}/leads`;
  }, []);

  // Mock counts per stage (would come from Supabase)
  const counts = useMemo(() => ({
    prospects: 12,
    intro_0_7: 8,
    intro_8_14: 6,
    intro_15_28: 4,
    offer_sent: 3,
    membership_purchased: 2,
    active_member: 1,
  }), [timeframe, program, dayFilter]);

  const conversions = [
    { from: "Prospect", to: "First Class Booked", rate: 0.6 },
    { from: "First Class", to: "Intro Package Purchase", rate: 0.7 },
    { from: "Intro Day 7", to: "Still Active", rate: 0.8 },
    { from: "Intro Day 14", to: "Still Active", rate: 0.75 },
    { from: "Intro Complete", to: "Membership Offer", rate: 0.5 },
    { from: "Offer", to: "Membership Purchased", rate: 0.4 },
  ];

  const leads = useMemo(() => (
    [
      { id: "1", name: "Ava Patel", email: "ava.patel@example.com", type: "prospect", introDays: 0, lastClass: null },
      { id: "2", name: "Liam Chen", email: "liam.chen@example.com", type: "intro", introDays: 6, lastClass: "2025-08-08" },
      { id: "3", name: "Sofia Rossi", email: "sofia.rossi@example.com", type: "intro", introDays: 12, lastClass: "2025-08-05" },
      { id: "4", name: "Noah Garcia", email: "noah.garcia@example.com", type: "intro", introDays: 21, lastClass: "2025-08-01" },
    ]
  ), []);

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
              <StatCard key={s.key} title={s.label} value={String((counts as any)[s.key])} subtitle="Leads" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leads.map((l) => (
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
                      <Button size="sm" onClick={() => toast({ title: "Day 0 Email queued", description: `Email prepared for ${l.name}` })}>Send Day 0 Email</Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => toast({ title: "WhatsApp sent", description: `Message sent to ${l.name}` })}>Send WhatsApp</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
