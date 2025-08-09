import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Mail, MessageCircle, Calendar, Star, Phone, ChevronRight } from "lucide-react";

// Mock data until real data is wired
const MOCK = {
  id: 1,
  first_name: "Emily",
  last_name: "Carter",
  email: "emily.carter@example.com",
  phone: "+1 555-0123",
  status: "intro", // prospect | drop-in | member
  current_day: 14,
  total_days: 30,
  engagement: "high" as "high" | "medium" | "low",
  total_classes: 18,
  total_lifetime_value: 342.5,
  member_since: "2024-05-02T00:00:00.000Z",
  last_seen: "2025-08-01T15:20:00.000Z",
  notes: "Loves morning vinyasa. Mild wrist sensitivity – offer modifications.",
  journey: {
    classes_this_month: 4,
    next_class: {
      date: "2025-08-12T09:00:00.000Z",
      title: "Vinyasa Flow",
      instructor: "Mia"
    },
    conversion_score: 78,
  },
  communications: [
    { id: "c1", type: "email" as const, subject: "Welcome to Talo Yoga!", at: "2025-08-01T10:00:00.000Z", status: "opened" },
    { id: "c2", type: "whatsapp" as const, subject: "How was your first class?", at: "2025-08-03T12:20:00.000Z", status: "replied" },
    { id: "c3", type: "email" as const, subject: "Your intro – Day 14 check‑in", at: "2025-08-08T08:00:00.000Z", status: "scheduled" },
  ],
  classes: [
    { id: "k1", date: "2025-07-30T14:00:00.000Z", title: "Gentle Flow", instructor: "Ava", status: "attended" },
    { id: "k2", date: "2025-07-28T14:00:00.000Z", title: "Power Yoga", instructor: "Noah", status: "cancelled" },
    { id: "k3", date: "2025-07-25T09:00:00.000Z", title: "Vinyasa Flow", instructor: "Mia", status: "no‑show" },
  ],
  membership: {
    package: "Intro Offer",
    expires: "2025-08-30T00:00:00.000Z",
    purchases: [
      { id: "p1", item: "Intro Offer", date: "2025-07-30T00:00:00.000Z", price: 49 },
    ],
    upgrade_suggestions: ["Monthly Unlimited", "10‑Class Pack"],
  },
  engagement_metrics: {
    classes_per_week: 2.0,
    response_rate: 66,
    referrals: 1,
    tags: ["Prenatal", "Morning person"],
  },
};

function useCustomerMock(id?: string) {
  // In future: fetch with Supabase using id
  return MOCK;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function timeSince(iso?: string) {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatDateShort(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function EngagementDots({ level }: { level: "high" | "medium" | "low" }) {
  const active = level === "high" ? 3 : level === "medium" ? 2 : 1;
  const color = (i: number) => (i <= active ? (level === "low" ? "bg-destructive" : level === "medium" ? "bg-secondary" : "bg-primary") : "bg-muted");
  return (
    <div className="flex items-center gap-1" aria-label={`Engagement ${level}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${color(i)}`} />
      ))}
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const customer = useCustomerMock(id);

  const fullName = `${customer.first_name} ${customer.last_name}`;

  // SEO: title, meta description, canonical, JSON‑LD (Person)
  useEffect(() => {
    document.title = `${fullName} – Customer Detail | Talo Yoga`;

    const desc = `Customer detail for ${fullName}: journey stage, engagement, classes, and communications.`;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;

    const canonicalHref = `${window.location.origin}/customer/${id ?? customer.id}`;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalHref;

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: fullName,
      email: customer.email,
      telephone: customer.phone,
      memberOf: { '@type': 'Organization', name: 'Talo Yoga' },
    } as const;
    let script = document.getElementById("ld-person") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "ld-person";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(ld);

    return () => {
      // optional cleanup not strictly necessary in SPA
    };
  }, [fullName, id, customer.email, customer.phone, customer.id]);

  const journeyBadge = useMemo(() => {
    const stage = customer.status;
    if (stage === "intro") return <Badge>Intro Day {customer.current_day} of {customer.total_days}</Badge>;
    if (stage === "member") return <Badge variant="secondary">Active Member</Badge>;
    if (stage === "drop-in") return <Badge variant="outline">Drop‑in</Badge>;
    return <Badge variant="outline">Prospect</Badge>;
  }, [customer]);

  const onSendMessage = () => {
    toast({ title: "Message sent", description: `Queued message to ${fullName}.` });
  };
  const onAddNote = () => {
    toast({ title: "Note saved", description: "Your note has been added." });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback aria-label={`${fullName} avatar`}>
                    {customer.first_name[0]}
                    {customer.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold leading-tight">Customer: {fullName}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {journeyBadge}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs">
                          <span>Engagement</span>
                          <EngagementDots level={customer.engagement} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>High = likely to convert/retain</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/customers" className="hidden sm:block">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2" /> Back to all customers
                  </Button>
                </Link>
                <Button onClick={onSendMessage}>
                  <Mail className="mr-2" /> Send Message
                </Button>
                <Button variant="secondary" onClick={onAddNote}>
                  <Star className="mr-2" /> Add Note
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Metric label="Total Classes" value={String(customer.total_classes)} />
              <Metric label="Total Spent" value={formatCurrency(customer.total_lifetime_value)} />
              <Metric label="Member Since" value={formatDateShort(customer.member_since)} />
              <Metric label="Last Visit" value={timeSince(customer.last_seen)} />
              <Metric label="Email" value={customer.email} />
              <Metric label="Phone" value={customer.phone} />
            </div>

            {customer.notes && (
              <CardDescription className="pt-1">
                <span className="font-medium">Notes:</span> {customer.notes}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Journey Overview */}
            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Journey Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Tile title="Current Stage" subtitle={
                    customer.status === "intro"
                      ? `Intro Day ${customer.current_day} of ${customer.total_days}`
                      : customer.status === "member"
                      ? "Active Member"
                      : customer.status === "drop-in"
                      ? "Drop‑in"
                      : "Prospect"
                  } icon={<Calendar />} />

                  <Tile title="Classes this month" subtitle={`${customer.journey.classes_this_month}`} icon={<Calendar />} />

                  <Tile title="Next class" subtitle={customer.journey.next_class ? `${customer.journey.next_class.title} • ${formatDateShort(customer.journey.next_class.date)}` : "—"} icon={<Calendar />} />

                  <Tile title="Conversion score" subtitle={`${customer.journey.conversion_score}%`} icon={<Star />} />
                </div>
              </CardContent>
            </Card>

            {/* Communication Timeline */}
            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Communication Timeline</CardTitle>
                <CardDescription>Most recent first</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customer.communications.length === 0 && (
                    <div className="text-sm text-muted-foreground">No communications yet – consider sending a welcome message.</div>
                  )}
                  {customer.communications.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        {c.type === "email" ? <Mail /> : <MessageCircle />}
                        <div>
                          <div className="font-medium">{c.subject}</div>
                          <div className="text-xs text-muted-foreground">{formatDateShort(c.at)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === "replied" ? "secondary" : c.status === "opened" ? "default" : "outline"}>{c.status}</Badge>
                        {c.status === "scheduled" && (
                          <Button size="sm" variant="outline" onClick={() => toast({ title: "Message scheduled", description: "This message will send automatically." })}>
                            View <ChevronRight className="ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Class History */}
            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Class History</CardTitle>
                <CardDescription>Recent activity</CardDescription>
              </CardHeader>
              <CardContent>
                {customer.classes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No classes attended yet – Send welcome message.</div>
                ) : (
                  <div className="w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Instructor</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.classes.map((k) => (
                          <TableRow key={k.id}>
                            <TableCell>{formatDateShort(k.date)}</TableCell>
                            <TableCell>{k.title}</TableCell>
                            <TableCell>{k.instructor}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={k.status === "attended" ? "secondary" : k.status === "cancelled" ? "outline" : "destructive"}>{k.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-3">
                  <Button variant="link">View Full History</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => toast({ title: `Day ${customer.current_day} message sent`, description: "Template applied and queued." })}>
                  Send Day {customer.current_day} Message
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => toast({ title: "WhatsApp composed", description: "Opening WhatsApp composer (mock)." })}>
                  <MessageCircle className="mr-2" /> Send Custom WhatsApp
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast({ title: "Email composed", description: "Opening email composer (mock)." })}>
                  <Mail className="mr-2" /> Send Custom Email
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast({ title: "Call scheduled", description: "We’ll remind you 10 minutes before (mock)." })}>
                  <Phone className="mr-2" /> Schedule Call
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Membership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Current package</div>
                  <div className="text-right">{customer.membership.package}</div>
                  <div className="text-muted-foreground">Expiration</div>
                  <div className="text-right">{formatDateShort(customer.membership.expires)}</div>
                </div>
                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Purchase history</div>
                  <div className="space-y-1 text-sm">
                    {customer.membership.purchases.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span>{p.item}</span>
                        <span className="text-muted-foreground">{formatDateShort(p.date)} • {formatCurrency(p.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Upgrade opportunities</div>
                  <div className="flex flex-wrap gap-2">
                    {customer.membership.upgrade_suggestions.map((u) => (
                      <Badge key={u} variant="outline">{u}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Classes / week</span>
                  <span className="font-medium">{customer.engagement_metrics.classes_per_week.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Response rate</span>
                  <span className="font-medium">{customer.engagement_metrics.response_rate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Referrals</span>
                  <span className="font-medium">{customer.engagement_metrics.referrals}</span>
                </div>
                <div className="pt-1">
                  <div className="text-sm text-muted-foreground mb-1">Community tags</div>
                  <div className="flex flex-wrap gap-2">
                    {customer.engagement_metrics.tags.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Tile({ title, subtitle, icon }: { title: string; subtitle: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3 flex items-start gap-3">
      {icon && <div className="mt-0.5">{icon}</div>}
      <div>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-sm font-medium">{subtitle}</div>
      </div>
    </div>
  );
}
