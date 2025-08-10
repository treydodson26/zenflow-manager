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
}

interface Props {
  customer: GalleryCustomer;
  onMessage?: (id: string) => void;
  onMore?: (id: string) => void;
}

export default function CustomerCard({ customer, onMessage, onMore }: Props) {
  const navigate = useNavigate();

  const progress = Math.min(100, Math.max(0, (customer.currentDay / 30) * 100));

  const handleCardClick = () => navigate(`/customer/${customer.id}`);
  const handleMsg = (e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onMessage?.(customer.id); };
  const handleView = (e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); navigate(`/customer/${customer.id}`); };

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
              <img src={customer.photo} alt={`Profile photo of ${customer.name}`} className="w-12 h-12 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-1 ring-border">
                <span className="font-semibold text-sm">
                  {customer.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{customer.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
          </div>
        </div>
        <div className="flex items-center">
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
          <p className="text-xl font-semibold">{customer.classesThisWeek}</p>
          <p className="text-xs text-muted-foreground">Classes this week</p>
        </div>
        <div className="text-right pl-4 border-l border-border/60">
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
        <Button onClick={handleView} className="flex-1">
          <Eye className="w-4 h-4" />
          Open
        </Button>
        <Button onClick={handleMsg} variant="outline">
          <MessageCircle className="w-4 h-4" />
          Message
        </Button>
      </div>
    </div>
  );
}
