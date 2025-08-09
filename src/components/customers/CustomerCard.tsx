import { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, MoreVertical } from "lucide-react";

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
}

interface Props {
  customer: GalleryCustomer;
  onMessage?: (id: string) => void;
  onMore?: (id: string) => void;
}

export default function CustomerCard({ customer, onMessage, onMore }: Props) {
  const navigate = useNavigate();

  const getEngagement = (d: number) => {
    if (d <= 7) return { dot: "bg-[hsl(var(--primary))]", label: "active" };
    if (d <= 14) return { dot: "bg-[hsl(var(--accent))]", label: "cooling" };
    return { dot: "bg-muted", label: "inactive" };
  };
  const engagement = getEngagement(customer.daysSinceLastVisit);
  const progress = Math.min(100, Math.max(0, (customer.currentDay / 30) * 100));

  const handleCardClick = () => navigate(`/customer/${customer.id}`);
  const handleMsg = (e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onMessage?.(customer.id); };
  const handleMore = (e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onMore?.(customer.id); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
      className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-ring/30 hover-scale animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            {customer.photo ? (
              <img src={customer.photo} alt={customer.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="font-semibold text-sm">
                  {customer.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-card ${engagement.dot}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{customer.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            customer.status === "intro"
              ? "bg-primary/10 text-primary"
              : customer.status === "member"
              ? "bg-[hsl(var(--ring))]/10 text-[hsl(var(--ring))]"
              : customer.status === "drop-in"
              ? "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {customer.status === "intro" ? `Day ${customer.currentDay}` : customer.statusLabel}
        </span>
      </div>

      {customer.status === "intro" && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium">Journey Progress</span>
            <span className="text-xs text-muted-foreground">{customer.currentDay} of 30</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-[hsl(var(--ring))] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold">{customer.classesThisWeek}</p>
          <p className="text-xs text-muted-foreground">Classes this week</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {customer.daysSinceLastVisit === 0
              ? "Today"
              : customer.daysSinceLastVisit === 1
              ? "Yesterday"
              : `${customer.daysSinceLastVisit}d ago`}
          </p>
          <p className="text-xs text-muted-foreground">Last visit</p>
        </div>
      </div>

      {customer.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {customer.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
              {tag}
            </span>
          ))}
          {customer.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">+{customer.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleMsg}
          className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Message
        </button>
        <button
          onClick={handleMore}
          className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
