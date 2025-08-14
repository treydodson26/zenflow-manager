import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, DollarSign, Users, AlertTriangle, Download, SendHorizontal, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InstructorHubSkeleton, ErrorState } from "@/components/ui/loading-skeletons";

// Minimal Instructor Hub scaffolding with realtime-ready priority feed and payroll action
export default function InstructorHub() {
  const [period, setPeriod] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [priority, setPriority] = useState<string[]>([
    "Sarah needs substitute for tomorrow 10am prenatal class",
    "Payroll calculation due in 2 days",
  ]);
  const [payrollRows, setPayrollRows] = useState<Array<{ name: string; classes: number; students: number; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SEO and initial loading
  useEffect(() => {
    document.title = "Instructor Hub – Talo Yoga";
    const link = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", window.location.origin + "/instructor-hub");
    if (!link.parentNode) document.head.appendChild(link);
    
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // Supabase realtime: listen for coverage/substitute events
  useEffect(() => {
    const channel = supabase
      .channel("instructor-hub-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "substitute_requests" }, (payload) => {
        setPriority((p) => [
          `New substitute request created (status: ${payload.new?.status ?? "pending"})`,
          ...p,
        ]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const calcPayroll = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("calculate-teacher-payroll", {
        body: { pay_period: period },
      });
      if (error) throw error;
      const rows = (data?.rows ?? []) as Array<{ instructor: string; classes: number; students: number; total: number }>;
      setPayrollRows(rows.map((r) => ({ name: r.instructor, classes: r.classes, students: r.students, total: r.total })));
      toast({ title: "Payroll calculated", description: `Period ${period}` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Payroll failed", description: String(e?.message || e), variant: "destructive" as any });
    }
  };

  const monthOptions = useMemo(() => {
    const now = new Date();
    const arr: string[] = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      arr.push(d.toISOString().slice(0, 7));
    }
    return arr;
  }, []);

  // Show loading state
  if (loading) {
    return <InstructorHubSkeleton />;
  }

  // Show error state
  if (error) {
    return <ErrorState title="Instructor Hub Error" message={error} onRetry={() => setError(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Instructor Hub</h1>
        <p className="text-sm text-muted-foreground">Manage instructors, payroll, coverage, and certifications.</p>
      </header>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Instructors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Including substitutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes This Week</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payroll Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,420</div>
            <p className="text-xs text-muted-foreground">in 5 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uncovered Classes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority feed */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {priority.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="text-sm">{item}</div>
              <div className="flex gap-2">
                {item.toLowerCase().includes("sub") && (
                  <Button size="sm" variant="secondary">Find Sub</Button>
                )}
                {item.toLowerCase().includes("payroll") && (
                  <Button size="sm" onClick={calcPayroll}>Calculate Now</Button>
                )}
              </div>
            </div>
          ))}
          {priority.length === 0 && (
            <Alert>
              <AlertDescription>All clear. No urgent items right now.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="instructors">All Instructors</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="schedule">Schedule & Coverage</TabsTrigger>
          <TabsTrigger value="certs">Certifications</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Dashboard tab - quick Fred */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Fred suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Calculate this month's payroll",
                    "Who taught the most classes?",
                    "Find sub for tomorrow",
                  ].map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full cursor-pointer">
                      <Bot className="h-3 w-3 mr-1" /> {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Button variant="outline" onClick={calcPayroll}>
                  Calculate Payroll
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Instructors */}
        <TabsContent value="instructors">
          <Card>
            <CardHeader>
              <CardTitle>All Instructors</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Cert Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Classes (mo)</TableHead>
                    <TableHead>Avg Students</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["Sarah Mitchell", "Maria Lopez", "Tom Klein"].map((name, i) => (
                    <TableRow key={name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback>{name.split(" ").map(p=>p[0]).join("")}</AvatarFallback></Avatar>
                          <div className="font-medium">{name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{i === 0 ? "500-hour" : i === 1 ? "500-hour" : "200-hour"}</TableCell>
                      <TableCell>
                        <Badge variant={i === 2 ? "outline" : "default"}>{i === 2 ? "Substitute" : "Active"}</Badge>
                      </TableCell>
                      <TableCell>{[12, 8, 10][i]}</TableCell>
                      <TableCell>{[13, 16, 11][i]}</TableCell>
                      <TableCell>${[60, 60, 50][i]}</TableCell>
                      <TableCell>(650) 555-12{(i+1)*3}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary">Message</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Payroll for period</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="YYYY-MM" /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={calcPayroll}>Calculate</Button>
                <Button variant="outline"><Download className="h-4 w-4 mr-2" /> CSV</Button>
                <Button variant="secondary"><SendHorizontal className="h-4 w-4 mr-2" /> Export to Gusto</Button>
              </div>
            </CardHeader>
            <CardContent>
              {payrollRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">Run calculation to see results.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="text-right">Total Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.classes}</TableCell>
                        <TableCell>{r.students}</TableCell>
                        <TableCell className="text-right">${r.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-medium">TOTAL</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-semibold">
                        ${payrollRows.reduce((a, b) => a + b.total, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-sm gap-2">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                  <div key={d} className="font-medium text-center text-muted-foreground">{d}</div>
                ))}
                {["9am","10am","6pm"].flatMap((t, idx) => (
                  Array.from({ length: 7 }).map((_, day) => (
                    <div key={`${idx}-${day}`} className="min-h-[56px] rounded-md border flex items-center justify-center">
                      {idx === 0 && day === 5 ? (
                        <Badge variant="destructive">OPEN</Badge>
                      ) : idx === 1 && day === 2 ? (
                        <Badge variant="outline">OPEN</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Assigned</span>
                      )}
                    </div>
                  ))
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications */}
        <TabsContent value="certs">
          <Card>
            <CardHeader>
              <CardTitle>Instructor Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sarah M.</div>
                  <div className="text-sm text-muted-foreground">500-hour (Dec 2025), Prenatal, First Aid</div>
                </div>
                <Badge>Up to date</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Tom K.</div>
                  <div className="text-sm text-muted-foreground">200-hour (Nov 2024)</div>
                </div>
                <Badge variant="secondary">Expiring soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers This Month</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Most Classes</div>
                <div className="font-medium">Sarah - 18</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Highest Attendance</div>
                <div className="font-medium">Maria - 16 avg</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Best Retention</div>
                <div className="font-medium">Sarah - 89%</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
