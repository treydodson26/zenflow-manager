import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/loading-skeletons";

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

// Stage configurations for intro offer journey
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
        "We're so glad you've stepped into the space with us. Here's a little more about our community and suggested next classes…",
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

// Transform intro offer customer data from Supabase
function transformIntroCustomers(data: any[]): Record<number, IntroCustomer[]> {
  console.log('transformIntroCustomers called with:', data);
  
  const customersByStage: Record<number, IntroCustomer[]> = {
    0: [], 7: [], 10: [], 14: [], 28: []
  };
  
  data.forEach((customer) => {
    console.log('Processing customer:', customer.client_name, 'start_date:', customer.intro_start_date);
    
    // If no intro_start_date, assume they're at Day 0
    if (!customer.intro_start_date) {
      const introCustomer: IntroCustomer = {
        id: customer.id.toString(),
        name: customer.client_name || `${customer.first_name} ${customer.last_name}`,
        email: customer.client_email,
        startedAt: new Date().toISOString(), // Use current date if no start date
        daysLeft: 30,
        tags: customer.tags ? customer.tags.split(",").map((t: string) => t.trim()) : []
      };
      customersByStage[0].push(introCustomer);
      return;
    }
    
    const startDate = new Date(customer.intro_start_date);
    const currentDay = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const endDate = customer.intro_end_date ? new Date(customer.intro_end_date) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(0, Math.floor((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    
    console.log('Customer', customer.client_name, 'is on day', currentDay, 'with', daysLeft, 'days left');
    
    // Determine which stage this customer is in
    let stage = 0;
    if (currentDay >= 28) stage = 28;
    else if (currentDay >= 14) stage = 14;
    else if (currentDay >= 10) stage = 10;
    else if (currentDay >= 7) stage = 7;
    else stage = 0;
    
    console.log('Assigning customer', customer.client_name, 'to stage', stage);
    
    const introCustomer: IntroCustomer = {
      id: customer.id.toString(),
      name: customer.client_name || `${customer.first_name} ${customer.last_name}`,
      email: customer.client_email,
      startedAt: customer.intro_start_date,
      daysLeft,
      tags: customer.tags ? customer.tags.split(",").map((t: string) => t.trim()) : []
    };
    
    customersByStage[stage].push(introCustomer);
  });
  
  console.log('Final customersByStage:', customersByStage);
  return customersByStage;
}

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

export default function IntroOffers({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<Record<number, IntroCustomer[]>>({
    0: [], 7: [], 10: [], 14: [], 28: []
  });

  // Fetch intro offer customers from Supabase
  useEffect(() => {
    const fetchIntroCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching intro customers...');
        
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('status', 'intro_trial')
          .order('intro_start_date', { ascending: false });
        
        console.log('Raw data from Supabase:', data);
        console.log('Error from Supabase:', error);
        
        if (error) throw error;
        
        const transformedData = transformIntroCustomers(data || []);
        console.log('Transformed data:', transformedData);
        setCustomerData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load intro customers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIntroCustomers();
  }, []);

  // SEO (skip when embedded in a tab)
  useEffect(() => {
    if (embedded) return;
    document.title = "Intro Offers – Nurture Sequence | Talo Yoga";
    ensureMeta("description", "Track intro offer customers across Day 0, 7, 10, 14, and 28 with templates and quick-send actions.");

    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/intro-offers";
  }, [embedded]);

  if (loading) {
    return (
      <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Intro Offers – Nurture Sequence</h1>
          <p className="text-sm text-muted-foreground">Track customers through their 30‑day intro journey across 5 touchpoints.</p>
        </header>
        <section className="grid gap-4">
          {STAGES.map((stage) => (
            <Card key={stage.day} className="overflow-hidden">
              <CardHeader className="gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl px-4 py-6">
        <ErrorState 
          title="Failed to load intro customers" 
          message={error}
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Intro Offers – Nurture Sequence</h1>
        <p className="text-sm text-muted-foreground">Track customers through their 30‑day intro journey across 5 touchpoints.</p>
      </header>

      <section className="grid gap-4">
        {STAGES.map((stage) => (
          <StageCard key={stage.day} config={stage} customers={customerData[stage.day] || []} />
        ))}
      </section>
    </main>
  );
}