import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { CustomerDetailSkeleton, ErrorState } from "@/components/ui/loading-skeletons";
import { supabase } from "@/integrations/supabase/client";
import SendMessageDialog from "@/components/customers/SendMessageDialog";
import CustomerProfileHeader from "@/components/customer-profile/CustomerProfileHeader";
import ContextLibrary from "@/components/customer-profile/ContextLibrary";
import FredAssistant from "@/components/customer-profile/FredAssistant";

// Mock data until real data is wired
const MOCK = {
  id: 1,
  first_name: "Emily",
  last_name: "Carter",
  email: "emily.carter@example.com",
  phone: "+1 555-0123",
  avatar_url: "https://i.pravatar.cc/128?u=emily.carter@example.com",
  status: "intro",
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

function useCustomerData(id?: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any>(MOCK);
  
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) {
        setCustomer(MOCK);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', parseInt(id))
          .single();
        
        if (error) throw error;
        
        const transformedCustomer = {
          ...MOCK,
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.client_email,
          phone: data.phone_number,
          status: data.status === 'intro_trial' ? 'intro' : 
                  data.status === 'active' ? 'member' :
                  data.status === 'drop_in' ? 'drop-in' : 'prospect',
          current_day: data.intro_start_date 
            ? Math.floor((Date.now() - new Date(data.intro_start_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          total_lifetime_value: data.total_lifetime_value || 0,
          last_seen: data.last_seen,
          notes: data.notes || '',
        };
        
        setCustomer(transformedCustomer);
      } catch (err) {
        console.error('Failed to load customer:', err);
        setCustomer(MOCK);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
  }, [id]);
  
  return { customer, loading, error };
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { customer, loading, error } = useCustomerData(id);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  // Show loading state
  if (loading) {
    return <CustomerDetailSkeleton />;
  }

  // Show error state
  if (error) {
    return <ErrorState title="Customer Not Found" message="Failed to load customer details." />;
  }

  const fullName = `${customer.first_name} ${customer.last_name}`;
  const daysSinceLastVisit = customer.last_seen 
    ? Math.floor((Date.now() - new Date(customer.last_seen).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  // SEO
  useEffect(() => {
    document.title = `${fullName} – Customer Profile | Talo Yoga`;
  }, [fullName]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Customer Profile Header */}
      <CustomerProfileHeader customer={customer} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Context Library - Left Side */}
        <div className="lg:col-span-2">
          <ContextLibrary customer={customer} />
        </div>

        {/* Fred AI Assistant - Right Side */}
        <div className="lg:col-span-1">
          <FredAssistant 
            customer={{
              ...customer,
              daysSinceLastVisit
            }} 
          />
        </div>
      </div>

      {/* Message Dialog */}
      <SendMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        customer={{
          id: customer.id,
          name: fullName,
          email: customer.email,
          phone: customer.phone
        }}
      />
    </div>
  );
}