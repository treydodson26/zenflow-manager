import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerGroupSection from "@/components/communication/CustomerGroupSection";
import UnifiedInbox from "@/components/communication/UnifiedInbox";
import EnhancedUnifiedInbox from "@/components/communication/EnhancedUnifiedInbox";
import DirectMessage from "@/components/communication/DirectMessage";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, Heart, Clock, TrendingUp, Send } from "lucide-react";

interface Customer {
  id: string;  // Changed to string to match Supabase clients table
  first_name: string;
  last_name: string;
  client_email: string;
  phone_number?: string;
  pipeline_segment?: string;
  is_intro_offer?: boolean;
  intro_day?: number;
  days_since_registration?: number;
  total_classes_attended?: number;
  first_seen?: string;
  last_seen?: string;
}

interface CustomerGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  customers: Customer[];
  sections: {
    title: string;
    description: string;
    customers: Customer[];
    messageType: 'welcome' | 'checkin' | 'conversion' | 'reengagement' | 'nurture';
  }[];
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

export default function CommunicationHub() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SEO
  useEffect(() => {
    document.title = "Communication Hub | Talo Yoga";
    ensureMeta("description", "Manage customer communication campaigns with smart segmentation and automated nurture sequences.");
    const href = `${window.location.origin}/communication`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = href;
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('first_seen', { ascending: false });

        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Organize customers into groups and sections
  const customerGroups: CustomerGroup[] = [
    {
      title: "Intro Offer Members",
      icon: Heart,
      customers: customers.filter(c => c.is_intro_offer),
      sections: [
        {
          title: "Day 0 - Welcome",
          description: "New intro offer members who just joined",
          customers: customers.filter(c => c.is_intro_offer && (c.intro_day === 0 || c.intro_day === undefined)),
          messageType: 'welcome'
        },
        {
          title: "Day 7 - First Week Check-in",
          description: "Members in their first week",
          customers: customers.filter(c => c.is_intro_offer && c.intro_day === 7),
          messageType: 'checkin'
        },
        {
          title: "Day 14 - Mid-point Engagement",
          description: "Members at the two-week milestone",
          customers: customers.filter(c => c.is_intro_offer && c.intro_day === 14),
          messageType: 'nurture'
        },
        {
          title: "Day 28 - Final Conversion Push",
          description: "Members approaching intro offer expiration",
          customers: customers.filter(c => c.is_intro_offer && c.intro_day === 28),
          messageType: 'conversion'
        }
      ]
    },
    {
      title: "Trial Users",
      icon: TrendingUp,
      customers: customers.filter(c => c.pipeline_segment === 'trial_user'),
      sections: [
        {
          title: "Recent Trial",
          description: "Attended within last 7 days",
          customers: customers.filter(c => 
            c.pipeline_segment === 'trial_user' && 
            (c.days_since_registration || 0) <= 7
          ),
          messageType: 'conversion'
        },
        {
          title: "Warm Trial",
          description: "Attended 8-30 days ago",
          customers: customers.filter(c => 
            c.pipeline_segment === 'trial_user' && 
            (c.days_since_registration || 0) > 7 && (c.days_since_registration || 0) <= 30
          ),
          messageType: 'reengagement'
        },
        {
          title: "Cold Trial",
          description: "Attended 30+ days ago",
          customers: customers.filter(c => 
            c.pipeline_segment === 'trial_user' && 
            (c.days_since_registration || 0) > 30
          ),
          messageType: 'reengagement'
        }
      ]
    },
    {
      title: "Fresh Leads",
      icon: Users,
      customers: customers.filter(c => c.pipeline_segment?.includes('fresh_lead')),
      sections: [
        {
          title: "Hot Leads",
          description: "Signed up 0-2 days ago",
          customers: customers.filter(c => c.pipeline_segment === 'fresh_lead_hot'),
          messageType: 'welcome'
        },
        {
          title: "Warm Leads",
          description: "Signed up 3-7 days ago",
          customers: customers.filter(c => c.pipeline_segment === 'fresh_lead_warm'),
          messageType: 'nurture'
        },
        {
          title: "Cold Leads",
          description: "Signed up 7+ days ago",
          customers: customers.filter(c => c.pipeline_segment === 'fresh_lead_cold'),
          messageType: 'reengagement'
        }
      ]
    },
    {
      title: "No-Show Prospects",
      icon: Clock,
      customers: customers.filter(c => c.pipeline_segment === 'no_show_prospect'),
      sections: [
        {
          title: "Recent No-Shows",
          description: "Booked but never attended within last 14 days",
          customers: customers.filter(c => 
            c.pipeline_segment === 'no_show_prospect' && 
            (c.days_since_registration || 0) <= 14
          ),
          messageType: 'reengagement'
        },
        {
          title: "Extended No-Shows",
          description: "No-shows from 14+ days ago",
          customers: customers.filter(c => 
            c.pipeline_segment === 'no_show_prospect' && 
            (c.days_since_registration || 0) > 14
          ),
          messageType: 'reengagement'
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive text-lg font-medium mb-2">Error loading customers</div>
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Communication Hub</h1>
        <p className="text-muted-foreground">
          Manage targeted communication campaigns across all customer segments
        </p>
      </header>

      <Tabs defaultValue="intro" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="intro" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Intro Offer
          </TabsTrigger>
          <TabsTrigger value="trial" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trial Users
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Fresh Leads
          </TabsTrigger>
          <TabsTrigger value="noshows" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            No-Shows
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send Direct
          </TabsTrigger>
        </TabsList>

        {customerGroups.map((group, index) => (
          <TabsContent key={index} value={index === 0 ? "intro" : index === 1 ? "trial" : index === 2 ? "leads" : "noshows"}>
            <CustomerGroupSection 
              group={group}
              onCustomersUpdated={() => {
                // Refresh customers after sending messages
                const fetchCustomers = async () => {
                  const { data } = await supabase.from('clients').select('*');
                  if (data) setCustomers(data);
                };
                fetchCustomers();
              }}
            />
          </TabsContent>
        ))}

        <TabsContent value="inbox">
          <EnhancedUnifiedInbox />
        </TabsContent>

        <TabsContent value="direct">
          <div className="flex justify-center pt-8">
            <DirectMessage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}