import { ArrowLeft, Star, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CustomerProfileHeaderProps {
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    status: string;
    current_day: number;
    total_lifetime_value: number;
    last_seen?: string;
    notes?: string;
    membership?: {
      expires?: string;
    };
    classes: any[];
  };
}

export default function CustomerProfileHeader({ customer }: CustomerProfileHeaderProps) {
  const fullName = `${customer.first_name} ${customer.last_name}`;
  
  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  };

  const timeSince = (iso?: string) => {
    if (!iso) return "-";
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const daysRemaining = customer.membership?.expires 
    ? Math.max(0, Math.ceil((new Date(customer.membership.expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const getStatusInfo = () => {
    switch (customer.status) {
      case "intro":
        return { label: `Intro Day ${customer.current_day} of 30`, color: "bg-blue-600" };
      case "member":
        return { label: "Active Member", color: "bg-green-600" };
      case "drop-in":
        return { label: "Drop-in", color: "bg-yellow-600" };
      default:
        return { label: "Prospect", color: "bg-gray-600" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-4">
      {/* Dark Header Section */}
      <div className="bg-slate-900 text-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/students">
            <Button variant="secondary" className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back to students
            </Button>
          </Link>
          <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">
            View Resources
          </Button>
        </div>

        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20 ring-2 ring-green-500">
            <AvatarImage src={customer.avatar_url} alt={`${fullName} avatar`} />
            <AvatarFallback className="bg-slate-700 text-white text-xl">
              {customer.first_name[0]}{customer.last_name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{fullName}</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-400">On Track</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-8 mt-4">
              <div>
                <div className="text-sm text-slate-400">Stage</div>
                <div className={`${statusInfo.color} text-white px-3 py-1 rounded-full text-sm font-medium inline-block mt-1`}>
                  {statusInfo.label}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400">LTV</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(customer.total_lifetime_value || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Last Contact</div>
                <div className="text-white mt-1">{timeSince(customer.last_seen)}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="text-sm text-slate-400 mb-2">Bio</div>
          <div className="text-white">
            {customer.notes || `Yoga student at Talo Yoga. ${customer.status === 'intro' ? 'Currently in intro offer period.' : 'Active member of our community.'}`}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {daysRemaining <= 3 && daysRemaining > 0 && (
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
    </div>
  );
}