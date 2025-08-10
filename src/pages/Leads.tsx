import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import StatCard from "@/components/dashboard/StatCard";

// SEO helper
function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const stages = [
  { key: "new_inquiry", label: "New Inquiry" },
  { key: "initial_contact", label: "Initial Contact" },
  { key: "tour_scheduled", label: "Tour Scheduled" },
  { key: "application_started", label: "Application Started" },
  { key: "application_submitted", label: "Application Submitted" },
  { key: "approved", label: "Approved" },
  { key: "enrolled", label: "Enrolled" },
] as const;

const WEEK_DATA = [
  { stage: "Initial Contact", current: 12, previous: 9 },
  { stage: "Application Started", current: 10, previous: 8 },
  { stage: "Application Submitted", current: 9, previous: 7 },
  { stage: "Approved", current: 5, previous: 1 },
  { stage: "Enrolled", current: 8, previous: 7 },
];

const CHART_CONFIG = {
  current: { label: "Current Week", color: "hsl(var(--primary))" },
  previous: { label: "Previous Week", color: "hsl(var(--muted-foreground))" },
};

export default function Leads() {
  const [timeframe, setTimeframe] = useState("all");
  const [program, setProgram] = useState("all");

  useEffect(() => {
    document.title = "Pipeline Dashboard | Talo Yoga";
    ensureMeta("description", "Pipeline dashboard showing lead stages, conversion metrics, and week-over-week trends.");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = `${window.location.origin}/leads`;
  }, []);

  // Mock counts per stage (would come from Supabase)
  const counts = useMemo(() => ({
    new_inquiry: 2,
    initial_contact: 2,
    tour_scheduled: 2,
    application_started: 2,
    application_submitted: 2,
    approved: 1,
    enrolled: 1,
  }), [timeframe, program]);

  const conversions = [
    { from: "New Inquiry", to: "Initial Contact", rate: 1.0 },
    { from: "Initial Contact", to: "Tour Scheduled", rate: 1.0 },
    { from: "Tour Scheduled", to: "Application Started", rate: 1.0 },
    { from: "Application Started", to: "Application Submitted", rate: 1.0 },
    { from: "Application Submitted", to: "Approved", rate: 0.5 },
    { from: "Approved", to: "Enrolled", rate: 1.0 },
  ];

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-foreground">Pipeline Dashboard</h1>
        <p className="text-muted-foreground">Lead performance overview with conversion metrics and stage comparisons</p>
      </header>

      <Tabs defaultValue="pipeline" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="pipeline" className="flex-1">Pipeline</TabsTrigger>
            <TabsTrigger value="lead-list" className="flex-1">Lead List</TabsTrigger>
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
          </div>
        </div>

        <TabsContent value="pipeline" className="space-y-6">
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
                  <li className="flex justify-between"><span>Website</span><span className="text-muted-foreground">45%</span></li>
                  <li className="flex justify-between"><span>Instagram</span><span className="text-muted-foreground">30%</span></li>
                  <li className="flex justify-between"><span>Referral</span><span className="text-muted-foreground">15%</span></li>
                  <li className="flex justify-between"><span>Walk-in</span><span className="text-muted-foreground">10%</span></li>
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
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">A compact lead list view can go here next.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
