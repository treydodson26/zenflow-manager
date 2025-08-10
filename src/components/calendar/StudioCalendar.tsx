import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type StudioClass = {
  id: string;
  title: string;
  time: string; // e.g. 6:00 PM
  instructor: string;
  capacity: number;
  booked: number;
  date: string; // ISO date
  type?: "vinyasa" | "restorative" | "hatha" | "power";
};

const TYPE_COLORS: Record<string, string> = {
  vinyasa: "bg-primary",
  restorative: "bg-emerald-500",
  hatha: "bg-amber-500",
  power: "bg-pink-500",
};

interface StudioCalendarProps { classes?: StudioClass[] }

export default function StudioCalendar({ classes }: StudioCalendarProps) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const data = useMemo<StudioClass[]>(() => {
    if (classes?.length) return classes;
    const today = new Date();
    const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);
    return [
      { id: "1", title: "Vinyasa", time: "6:00 PM", instructor: "Alice", capacity: 20, booked: 12, date: iso(today), type: "vinyasa" },
      { id: "2", title: "Restorative", time: "7:30 PM", instructor: "Michael", capacity: 16, booked: 15, date: iso(today), type: "restorative" },
      { id: "3", title: "Hatha", time: "9:00 AM", instructor: "Sarah", capacity: 18, booked: 10, date: iso(new Date(today.getTime() + 86400000)), type: "hatha" },
      { id: "4", title: "Power", time: "12:00 PM", instructor: "Jon", capacity: 22, booked: 8, date: iso(new Date(today.getTime() + 2*86400000)), type: "power" },
    ];
  }, [classes]);

  const selectedISO = selected ? selected.toISOString().slice(0, 10) : "";
  const dayClasses = data.filter((c) => c.date === selectedISO);

  // Day modifiers: show small dots for days with classes
  const modifiers: Record<string, Date[]> = {
    hasClass: Array.from(new Set(data.map((c) => c.date))).map((iso) => new Date(iso)),
  };

  const modifiersStyles = {
    hasClass: { position: "relative" as const },
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="relative">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            className={cn("rounded-md border")}
            modifiers={modifiers as any}
            modifiersStyles={modifiersStyles as any}
          />
          {/* dot indicators */}
          <style>{`
            .rdp-day_hasClass:not(.rdp-day_selected)::after {
              content: '';
              position: absolute;
              bottom: 6px;
              left: 50%;
              transform: translateX(-50%);
              width: 6px;
              height: 6px;
              border-radius: 9999px;
              background: hsl(var(--primary));
            }
          `}</style>
        </div>

        <div className="space-y-3">
          {dayClasses.length === 0 ? (
            <div className="text-sm text-muted-foreground">No classes on this day.</div>
          ) : (
            <ul className="space-y-3">
              {dayClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                  <div className="flex items-center gap-3">
                    <span className={cn("inline-block w-2.5 h-2.5 rounded-full", TYPE_COLORS[c.type || "vinyasa"])}/> 
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.title} • {c.time}</div>
                      <div className="text-xs text-muted-foreground">{c.instructor}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{c.booked}/{c.capacity} booked</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
