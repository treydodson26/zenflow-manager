import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, MessageCircle, FileText, TrendingUp, Clock } from "lucide-react";
import CustomerNotes from "@/components/customers/CustomerNotes";

interface ContextLibraryProps {
  customer: {
    id: number;
    classes: Array<{
      id: string;
      date: string;
      title: string;
      instructor: string;
      status: string;
    }>;
    communications: Array<{
      id: string;
      type: "email" | "whatsapp";
      subject: string;
      at: string;
      status: string;
    }>;
    membership: {
      purchases: Array<{
        id: string;
        item: string;
        date: string;
        price: number;
      }>;
    };
    engagement_metrics: {
      classes_per_week: number;
      response_rate: number;
      referrals: number;
      tags: string[];
    };
  };
}

export default function ContextLibrary({ customer }: ContextLibraryProps) {
  const [activeTab, setActiveTab] = useState("attendance");

  const formatDateShort = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: "USD" 
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "attended":
        return <Badge className="bg-green-100 text-green-800">Attended</Badge>;
      case "cancelled":
        return <Badge className="bg-yellow-100 text-yellow-800">Cancelled</Badge>;
      case "no‑show":
        return <Badge className="bg-red-100 text-red-800">No-show</Badge>;
      case "opened":
        return <Badge className="bg-blue-100 text-blue-800">Opened</Badge>;
      case "replied":
        return <Badge className="bg-green-100 text-green-800">Replied</Badge>;
      case "scheduled":
        return <Badge className="bg-gray-100 text-gray-800">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="attendance" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Classes
        </TabsTrigger>
        <TabsTrigger value="purchases" className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Purchases
        </TabsTrigger>
        <TabsTrigger value="communications" className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Notes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="attendance" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Class Attendance History
            </CardTitle>
            <CardDescription>
              Track of all booked and attended classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customer.classes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No classes booked yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.classes.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell>{formatDateShort(classItem.date)}</TableCell>
                      <TableCell className="font-medium">{classItem.title}</TableCell>
                      <TableCell>{classItem.instructor}</TableCell>
                      <TableCell>{getStatusBadge(classItem.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="purchases" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Purchase History
            </CardTitle>
            <CardDescription>
              All packages and services purchased
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customer.membership.purchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No purchases yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.membership.purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{formatDateShort(purchase.date)}</TableCell>
                      <TableCell className="font-medium">{purchase.item}</TableCell>
                      <TableCell>{formatCurrency(purchase.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="communications" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Communication History
            </CardTitle>
            <CardDescription>
              All emails and messages sent to this customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customer.communications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No communications yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.communications.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>{formatDateShort(comm.at)}</TableCell>
                      <TableCell>
                        <Badge variant={comm.type === "email" ? "default" : "secondary"}>
                          {comm.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{comm.subject}</TableCell>
                      <TableCell>{getStatusBadge(comm.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notes" className="space-y-4">
        <CustomerNotes customerId={customer.id} />
      </TabsContent>
    </Tabs>
  );
}