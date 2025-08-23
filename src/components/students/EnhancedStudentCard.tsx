import { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Eye, DollarSign, Calendar, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export interface EnhancedStudent {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  status: "intro" | "member" | "drop-in" | "inactive";
  statusLabel: string;
  currentDay: number;
  classesThisWeek: number;
  daysSinceLastVisit: number;
  tags: string[];
  totalClasses: number;
  totalLifetimeValue: number;
  joinDate: string;
  lastClassDate?: string;
  segment: string;
}

interface Props {
  student: EnhancedStudent;
  onMessage?: (student: EnhancedStudent) => void;
  onSelect?: (student: EnhancedStudent) => void;
  isSelected?: boolean;
  showSelection?: boolean;
}

export default function EnhancedStudentCard({ 
  student, 
  onMessage, 
  onSelect, 
  isSelected = false,
  showSelection = false 
}: Props) {
  const navigate = useNavigate();

  const handleCardClick = () => navigate(`/customer/${student.id}`);

  const formatCurrency = (amount: number) => {
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
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getStatusVariant = () => {
    switch (student.status) {
      case "intro":
        return "default";
      case "member":
        return "secondary";
      case "drop-in":
        return "outline";
      default:
        return "destructive";
    }
  };

  const getEngagementStatus = () => {
    if (student.daysSinceLastVisit <= 7) return { color: "text-green-600", bg: "bg-green-50", label: "Active" };
    if (student.daysSinceLastVisit <= 14) return { color: "text-amber-600", bg: "bg-amber-50", label: "Cooling" };
    return { color: "text-red-600", bg: "bg-red-50", label: "At Risk" };
  };

  const engagement = getEngagementStatus();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 relative group">
      {showSelection && (
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect?.(student)}
            className="bg-white border-2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={handleCardClick}
        >
          <div className="relative">
            {student.photo ? (
              <img 
                src={student.photo} 
                alt={`Profile photo of ${student.name}`} 
                className="w-12 h-12 rounded-full object-cover" 
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="font-semibold text-gray-600 text-sm">
                  {student.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              engagement.color === 'text-green-600' ? 'bg-green-500' : 
              engagement.color === 'text-amber-600' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{student.name}</h3>
            <Badge variant={getStatusVariant()} className="text-xs">
              {student.statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Segment & LTV */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">{student.segment}</span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${engagement.bg} ${engagement.color}`}>
            {engagement.label}
          </div>
        </div>
        <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
          <DollarSign className="w-5 h-5" />
          {formatCurrency(student.totalLifetimeValue)}
        </div>
        <div className="text-sm text-gray-500">Lifetime Value</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">{formatDate(student.lastClassDate)}</div>
            <div className="text-xs text-gray-500">Last class</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">{student.totalClasses}</div>
            <div className="text-xs text-gray-500">Total classes</div>
          </div>
        </div>
      </div>

      {/* Progress for Intro students */}
      {student.status === "intro" && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-700">Journey Progress</span>
            <span className="text-xs text-gray-500">{student.currentDay} of 30</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(student.currentDay / 30) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {student.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {student.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
              {tag}
            </span>
          ))}
          {student.tags.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
              +{student.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onMessage?.(student);
          }}
          className="flex-1"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Message
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCardClick}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}