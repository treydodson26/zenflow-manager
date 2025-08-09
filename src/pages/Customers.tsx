import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "Active" | "Lead" | "Churned";
  lastSeen?: string; // ISO
  totalSpend?: number;
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: "1", name: "Ava Patel", email: "ava.patel@example.com", phone: "(555) 201-3412", status: "Active", lastSeen: "2025-07-30T14:12:00Z", totalSpend: 420 },
  { id: "2", name: "Liam Chen", email: "liam.chen@example.com", phone: "(555) 555-9932", status: "Lead", lastSeen: "2025-07-18T10:00:00Z", totalSpend: 0 },
  { id: "3", name: "Sofia Rossi", email: "sofia.rossi@example.com", phone: "(555) 777-1234", status: "Active", lastSeen: "2025-08-02T09:45:00Z", totalSpend: 275 },
  { id: "4", name: "Noah Garcia", email: "noah.garcia@example.com", phone: "(555) 888-4455", status: "Churned", lastSeen: "2025-06-12T16:20:00Z", totalSpend: 130 },
  { id: "5", name: "Mia Müller", email: "mia.mueller@example.com", phone: "(555) 333-8842", status: "Active", lastSeen: "2025-08-01T18:05:00Z", totalSpend: 510 },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Customers() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    // SEO
    document.title = "Customers | Talo Yoga Studio Manager";
    ensureMeta("description", "Customers: browse, search, and open detailed customer profiles.");

    const href = `${window.location.origin}/customers`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href;
  }, []);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter((c) =>
      [c.name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-1">Manage all studio customers and leads.</p>
      </header>

      <main>
        <section aria-labelledby="customers-section">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle id="customers-section" className="text-lg">Customer Directory</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="w-72"
                  aria-label="Search customers"
                />
                <Badge variant="secondary" className="whitespace-nowrap">
                  {data.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right">Last active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((c) => (
                      <TableRow key={c.id} className="">
                        <TableCell>
                          <Link to={`/customer/${c.id}`} className="underline-offset-2 hover:underline">
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{c.email}</TableCell>
                        <TableCell className="hidden lg:table-cell">{c.phone ?? "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={c.status === "Active" ? "default" : c.status === "Lead" ? "outline" : "secondary"}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatDate(c.lastSeen)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
