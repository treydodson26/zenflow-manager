import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Mail, MessageCircle, Calendar, Star, Phone, ChevronRight, AlertTriangle, Send, Users, Tag, Edit3 } from "lucide-react";
import CustomerAIChat from "@/components/chat/CustomerAIChat";

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
  first_class_date: "2024-07-15T09:00:00.000Z",
  preferred_instructor: "Mia",
  source: "Instagram",
  home_studio: "Palo Alto",
  emergency_contact: "Taylor Carter • +1 (555) 098‑7654",
  injuries: "None listed",
  birthday: "1993-08-25T00:00:00.000Z",
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
    classes_remaining: { used: 2, total: 5 },
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

  const daysRemaining = useMemo(() => {
    const exp = customer.membership?.expires ? new Date(customer.membership.expires).getTime() : 0;
    return Math.max(0, Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [customer.membership?.expires]);

  const noShowCount = useMemo(() => customer.classes.filter((k) => k.status === "no‑show").length, [customer.classes]);
  const cancelledCount = useMemo(() => customer.classes.filter((k) => k.status === "cancelled").length, [customer.classes]);
  const favoriteTitle = useMemo(() => {
    const freq: Record<string, number> = {};
    customer.classes.filter((k) => k.status === "attended").forEach((k) => {
      freq[k.title] = (freq[k.title] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [customer.classes]);
  const favoriteTime = useMemo(() => {
    const buckets = { Morning: 0, Afternoon: 0, Evening: 0 } as Record<string, number>;
    customer.classes.filter((k) => k.status === "attended").forEach((k) => {
      const h = new Date(k.date).getHours();
      if (h < 12 && h >= 5) buckets.Morning++;
      else if (h < 17) buckets.Afternoon++;
      else buckets.Evening++;
    });
    return Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [customer.classes]);
  const attendedCount = useMemo(() => customer.classes.filter((k) => k.status === "attended").length, [customer.classes]);
  const bookedCount = useMemo(() => customer.classes.length, [customer.classes]);
  const showRate = useMemo(() => (bookedCount ? Math.round((attendedCount / bookedCount) * 100) : 0), [attendedCount, bookedCount]);
  const lastAttended = useMemo(() => {
    return customer.classes
      .filter((k) => k.status === "attended")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [customer.classes]);

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
    if (stage === "intro") {
      const d = customer.current_day;
      const cls = d >= 28 ? "bg-destructive/15 text-destructive" : d >= 21 ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      return <Badge className={cls}>Intro Day {d} of {customer.total_days}</Badge>;
    }
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
                  <h1 className="text-xl font-semibold leading-tight">{fullName}</h1>
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
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a href={`mailto:${customer.email}`} aria-label={`Email ${fullName}`} className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs">
                      <Mail className="h-3 w-3" />
                      <span>{customer.email}</span>
                    </a>
                    <a href={`tel:${customer.phone}`} aria-label={`Call ${fullName}`} className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button className="bg-primary text-primary-foreground" onClick={() => toast({ title: "Converted to Member", description: `${fullName} marked as member (mock)` })}>
                  Convert to Member
                </Button>
                <Button variant="secondary" onClick={() => toast({ title: "Intro extended", description: "Extended by 7 days (mock)" })}>Extend Intro Offer</Button>
                <Button variant="outline" onClick={() => toast({ title: "Private session added", description: "Added to schedule (mock)" })}>Add Private Session</Button>

                <Link to="/customers" className="hidden sm:block">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2" /> Back to all customers
                  </Button>
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Contact</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64">
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">Contact</div>
                      <div className="flex items-center justify-between">
                        <span>Email</span>
                        <a className="text-primary" href={`mailto:${customer.email}`}>{customer.email}</a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Phone</span>
                        <a className="text-primary" href={`tel:${customer.phone}`}>{customer.phone}</a>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button onClick={onSendMessage}>
                  <Mail className="mr-2" /> Send Message
                </Button>
                <Button variant="secondary" onClick={onAddNote}>
                  <Star className="mr-2" /> Add Note
                </Button>
              </div>
            </div>

          </CardHeader>
        </Card>

        {daysRemaining <= 3 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Intro offer expiring in {daysRemaining} days</AlertTitle>
            <AlertDescription>Send a conversion offer to encourage membership.</AlertDescription>
          </Alert>
        )}

        {customer.classes.length === 0 && (
          <Alert>
            <AlertTitle>No classes attended yet</AlertTitle>
            <AlertDescription>Send a welcome message to help them get started.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <CustomerAIChat customer={customer} />
            </div>
            <Tabs defaultValue="classes" className="w-full">


              <TabsContent value="timeline">
                <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
                  <CardHeader>
                    <CardTitle>Communication Log</CardTitle>
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
              </TabsContent>

              <TabsContent value="classes">
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
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Tile title="Favorites" subtitle={`${favoriteTitle} • ${favoriteTime}`} />
                      <Tile title="No‑shows" subtitle={`${noShowCount}`} />
                      <Tile title="Cancellations" subtitle={`${cancelledCount}`} />
                    </div>
                    <div className="mt-3">
                      <Button variant="link">View Full History</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="purchases">
                <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
                  <CardHeader>
                    <CardTitle>Purchases</CardTitle>
                    <CardDescription>History & upgrades</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1 text-sm">
                      {customer.membership.purchases.map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span>{p.item}</span>
                          <span className="text-muted-foreground">{formatDateShort(p.date)} • {formatCurrency(p.price)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <div className="text-sm font-medium mb-1">Upgrade opportunities</div>
                      <div className="flex flex-wrap gap-2">
                        {customer.membership.upgrade_suggestions.map((u) => (
                          <Badge key={u} variant="outline">{u === "10‑Class Pack" ? "Monthly Unlimited" : u}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details">
                <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
                  <CardHeader>
                    <CardTitle>Profile & Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-20">
            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" aria-label="Send Day 14 Conversion Offer" onClick={() => toast({ title: "Day 14 conversion offer sent", description: "Offer template queued." })}>
                  <Send className="mr-2" /> Send Day 14 Conversion Offer
                </Button>
                <Button variant="secondary" className="w-full" aria-label="Send Day 14 WhatsApp Check-in" onClick={() => toast({ title: "WhatsApp check-in queued", description: "Day 14 WhatsApp prepared." })}>
                  <MessageCircle className="mr-2" /> Send Day 14 WhatsApp Check-in
                </Button>
                <Button variant="outline" className="w-full" aria-label="Add to Prenatal Community" onClick={() => toast({ title: "Added to Prenatal Community", description: `${fullName} tagged & added.` })}>
                  <Users className="mr-2" /> Add to Prenatal Community
                </Button>
                <Button variant="outline" className="w-full" aria-label="Log Manual Outreach" onClick={() => toast({ title: "Outreach logged", description: "Manual outreach recorded (mock)." })}>
                  <Edit3 className="mr-2" /> Log Manual Outreach
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Membership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Current Status</div>
                  <div className="text-right">{customer.membership.package}</div>

                  <div className="text-muted-foreground">Expiration</div>
                  <div className={`text-right ${daysRemaining <= 3 ? "text-destructive font-medium" : ""}`}>{formatDateShort(customer.membership.expires)}</div>

                  <div className="text-muted-foreground">Classes Remaining</div>
                  <div className="text-right">
                    {customer.membership.classes_remaining
                      ? `${Math.max(0, customer.membership.classes_remaining.total - customer.membership.classes_remaining.used)} of ${customer.membership.classes_remaining.total}`
                      : "—"}
                  </div>

                  <div className="text-muted-foreground">First Class Date</div>
                  <div className="text-right">{formatDateShort(customer.first_class_date)}</div>

                  <div className="text-muted-foreground">Preferred Instructor</div>
                  <div className="text-right">{customer.preferred_instructor || "—"}</div>

                  <div className="text-muted-foreground">Source</div>
                  <div className="text-right">{customer.source || "—"}</div>

                  <div className="text-muted-foreground">Home Studio</div>
                  <div className="text-right">{customer.home_studio || "—"}</div>

                  <div className="text-muted-foreground">Emergency Contact</div>
                  <div className="text-right">{customer.emergency_contact || "—"}</div>

                  <div className="text-muted-foreground">Injuries/Modifications</div>
                  <div className="text-right">{customer.injuries || "—"}</div>

                  <div className="text-muted-foreground">Birthday</div>
                  <div className="text-right">{formatDateShort(customer.birthday)}</div>
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
                      <Badge key={u} variant="outline">{u === "10‑Class Pack" ? "Monthly Unlimited" : u}</Badge>
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
