import { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GalleryCustomer {
  id: string;
  name: string;
  email: string;
  photo?: string;
  status: "intro" | "member" | "drop-in" | "inactive";
  statusLabel: string;
  currentDay: number;
  classesThisWeek: number;
  daysSinceLastVisit: number;
  tags: string[];
  totalLifetimeValue?: number;
  firstContactDate?: string;
  lastInteractionDate?: string;
}

interface Props {
  customer: GalleryCustomer;
  onMessage?: (id: string) => void;
  onMore?: (id: string) => void;
}

export default function CustomerCard({ customer, onMessage, onMore }: Props) {
  const navigate = useNavigate();

  const handleCardClick = () => navigate(`/customer/${customer.id}`);

  const formatCurrency = (amount?: number) => {
    if (!amount) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getStatusColor = () => {
    switch (customer.status) {
      case "intro":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "member":
        return "bg-green-50 text-green-700 border-green-200";
      case "drop-in":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusDot = () => {
    switch (customer.status) {
      case "intro":
      case "member":
        return "bg-green-500";
      case "drop-in":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-gray-300 relative"
    >
      {/* Status dot indicator */}
      <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${getStatusDot()}`} />
      
      {/* Header with avatar and name */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative">
          {customer.photo ? (
            <img 
              src={customer.photo} 
              alt={`Profile photo of ${customer.name}`} 
              className="w-12 h-12 rounded-full object-cover" 
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="font-semibold text-gray-600 text-sm">
                {customer.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">{customer.name}</h3>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {customer.statusLabel}
          </div>
        </div>
      </div>

      {/* LTV Amount */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(customer.totalLifetimeValue)}
        </div>
        <div className="text-sm text-gray-500">LTV</div>
      </div>

      {/* Dates grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm font-medium text-gray-900">First Contact</div>
          <div className="text-sm text-gray-500">{formatDate(customer.firstContactDate)}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">Last Interaction</div>
          <div className="text-sm text-gray-500">{formatDate(customer.lastInteractionDate)}</div>
        </div>
      </div>

      {/* Tags if available */}
      {customer.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-4">
          {customer.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
              {tag}
            </span>
          ))}
          {customer.tags.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
              +{customer.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
