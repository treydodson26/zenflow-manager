import { useEffect, useMemo } from "react";
import { Mail, MessageSquare, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Types
interface StageTemplate {
  subject?: string;
  preview: string;
  channel: "email" | "whatsapp";
}

interface StageConfig {
  day: number;
  title: string;
  template: StageTemplate;
}

interface IntroCustomer {
  id: string;
  name: string;
  email: string;
  startedAt: string; // ISO date
  daysLeft: number;
  tags?: string[];
}

// Mock data (replace with Supabase queries later)
const STAGES: StageConfig[] = [
  {
    day: 0,
    title: "Day 0",
    template: {
      channel: "email",
      subject: "Welcome to Talo Yoga 🌿",
      preview:
        "Hi {{first_name}}, Welcome to Talo Yoga! We're excited you're here. Here are tips to make the most of your intro month…",
    },
  },
  {
    day: 7,
    title: "Day 7",
    template: {
      channel: "whatsapp",
      preview:
        "Hi {{first_name}}! This is Emily from Talo Yoga — checking in to see how your first week went. Can I help book your next class?",
    },
  },
  {
    day: 10,
    title: "Day 10",
    template: {
      channel: "email",
      subject: "A Little About Talo Yoga — and Making the Most of Your Intro",
      preview:
        "We're so glad you've stepped into the space with us. Here’s a little more about our community and suggested next classes…",
    },
  },
  {
    day: 14,
    title: "Day 14",
    template: {
      channel: "whatsapp",
      preview:
        "Hi {{first_name}}, you're halfway through your intro! Any favorites so far? Happy to recommend classes based on what you liked.",
    },
  },
  {
    day: 28,
    title: "Day 28",
    template: {
      channel: "email",
      subject: "From Intro to Ritual — Your Path Forward at Talo 🌿",
      preview:
        "It's been so lovely having you with us this month. Here are membership options and next steps tailored to you…",
    },
  },
];

const MOCK_CUSTOMERS: Record<number, IntroCustomer[]> = {
  0: [],
  7: [],
  10: [],
  14: [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      startedAt: "2025-07-19",
      daysLeft: 5,
      tags: [],
    },
    {
      id: "2",
      name: "Jodie Ortiz",
      email: "jodie.ortiz@gmail.com",
      startedAt: "2025-07-18",
      daysLeft: 9,
      tags: ["Classpass"],
    },
    {
      id: "3",
      name: "Marcus Chen",
      email: "marcus@example.com",
      startedAt: "2025-07-19",
      daysLeft: 10,
    },
  ],
  28: [
    {
      id: "4",
      name: "Trey Dodson",
      email: "trey@example.com",
      startedAt: "2025-07-20",
      daysLeft: 3,
      tags: ["Class Pass"],
    },
  ],
};

function ensureMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function StageCard({ config, customers }: { config: StageConfig; customers: IntroCustomer[] }) {
  const isEmail = config.template.channel === "email";
  const Icon = isEmail ? Mail : MessageSquare;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-9 w-9 rounded-md border flex items-center justify-center", isEmail ? "bg-primary/5" : "bg-accent/10")}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-base font-semibold leading-none">
                {config.title}
              </CardTitle>
              <div className="text-xs text-muted-foreground capitalize">{isEmail ? "Email" : "WhatsApp"}</div>
            </div>
          </div>
          <Badge variant="secondary">{customers.length} customers</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/40 p-4">
          {config.template.subject && (
            <div className="mb-2 text-sm">
              <span className="text-muted-foreground">Subject:</span>{" "}
              <span className="font-medium">{config.template.subject}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2">{config.template.preview}</p>
        </div>

        {customers.length === 0 ? (
          <div className="border border-dashed rounded-md text-sm text-muted-foreground p-8 text-center">
            No customers at this stage
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((c) => (
              <div key={c.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium leading-none">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Started: {new Date(c.startedAt).toLocaleDateString()}</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span>{c.daysLeft} days left</span>
                      {c.tags?.length ? (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          {c.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant={isEmail ? "default" : "secondary"}>
                    {isEmail ? "Send Email" : "Send WhatsApp"}
                  </Button>
                  <Button size="sm" variant="ghost">…</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntroOffers() {
  // SEO
  useEffect(() => {
    document.title = "Intro Offers – Nurture Sequence | Talo Yoga";
    ensureMeta("description", "Track intro offer customers across Day 0, 7, 10, 14, and 28 with templates and quick-send actions.");

    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/intro-offers";
  }, []);

  const data = useMemo(() => MOCK_CUSTOMERS, []);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Intro Offers – Nurture Sequence</h1>
        <p className="text-sm text-muted-foreground">Track customers through their 30‑day intro journey across 5 touchpoints.</p>
      </header>

      <section className="grid gap-4">
        {STAGES.map((stage) => (
          <StageCard key={stage.day} config={stage} customers={data[stage.day] || []} />
        ))}
      </section>
    </main>
  );
}
