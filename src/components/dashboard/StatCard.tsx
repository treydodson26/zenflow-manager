import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export const StatCard = ({ title, value, subtitle }: StatCardProps) => {
  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {subtitle && <div className="text-sm text-accent mt-2">{subtitle}</div>}
      </CardContent>
    </Card>
  );
};

export default StatCard;
