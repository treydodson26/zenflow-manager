import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

export type TrendPoint = { x: string | number; y: number };

interface KPITrendCardProps {
  title: string;
  value: string;
  change?: string; // e.g. +5%
  trend?: TrendPoint[];
  actionLabel?: string;
  onAction?: () => void;
}

export default function KPITrendCard({ title, value, change, trend, actionLabel, onAction }: KPITrendCardProps) {
  return (
    <Card className="hover-scale shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
          <span>{title}</span>
          {change && (
            <span className={change.startsWith("-") ? "text-destructive text-xs" : "text-emerald-600 dark:text-emerald-400 text-xs"}>{change}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {trend && trend.length > 0 && (
          <div className="h-14 -ml-2 -mr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <Bar dataKey="y" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {actionLabel && (
          <Button size="sm" variant="secondary" onClick={onAction}>{actionLabel}</Button>
        )}
      </CardContent>
    </Card>
  );
}
