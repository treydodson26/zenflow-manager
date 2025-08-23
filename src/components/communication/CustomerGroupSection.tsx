import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import MessageComposer from "./MessageComposer";
import { Mail, MessageSquare, Users } from "lucide-react";

interface Customer {
  id: string;  // Changed to string to match clients table
  first_name: string;
  last_name: string;
  client_email: string;
  phone_number?: string;
  pipeline_segment?: string;
  is_intro_offer?: boolean;
  intro_day?: number;
  days_since_registration?: number;
  total_classes_attended?: number;
  first_seen?: string;
  last_seen?: string;
}

interface CustomerSection {
  title: string;
  description: string;
  customers: Customer[];
  messageType: 'welcome' | 'checkin' | 'conversion' | 'reengagement' | 'nurture';
}

interface CustomerGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  customers: Customer[];
  sections: CustomerSection[];
}

interface Props {
  group: CustomerGroup;
  onCustomersUpdated: () => void;
}

export default function CustomerGroupSection({ group, onCustomersUpdated }: Props) {
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, Set<string>>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerConfig, setComposerConfig] = useState<{
    customers: Customer[];
    messageType: 'email' | 'whatsapp';
    templateType: string;
    sectionTitle: string;
  } | null>(null);

  const toggleCustomerSelection = (sectionTitle: string, customerId: string) => {
    setSelectedCustomers(prev => {
      const newState = { ...prev };
      if (!newState[sectionTitle]) {
        newState[sectionTitle] = new Set();
      }
      
      if (newState[sectionTitle].has(customerId)) {
        newState[sectionTitle].delete(customerId);
      } else {
        newState[sectionTitle].add(customerId);
      }
      
      return newState;
    });
  };

  const toggleSelectAll = (sectionTitle: string, customers: Customer[]) => {
    setSelectedCustomers(prev => {
      const newState = { ...prev };
      if (!newState[sectionTitle]) {
        newState[sectionTitle] = new Set();
      }
      
      const allSelected = customers.every(c => newState[sectionTitle].has(c.id));
      if (allSelected) {
        newState[sectionTitle].clear();
      } else {
        customers.forEach(c => newState[sectionTitle].add(c.id));
      }
      
      return newState;
    });
  };

  const getSelectedCustomers = (sectionTitle: string, allCustomers: Customer[]) => {
    const selected = selectedCustomers[sectionTitle] || new Set();
    return allCustomers.filter(c => selected.has(c.id));
  };

  const openComposer = (section: CustomerSection, messageType: 'email' | 'whatsapp') => {
    const selected = getSelectedCustomers(section.title, section.customers);
    const customersToMessage = selected.length > 0 ? selected : section.customers;
    
    setComposerConfig({
      customers: customersToMessage,
      messageType,
      templateType: section.messageType,
      sectionTitle: section.title
    });
    setComposerOpen(true);
  };

  const formatName = (customer: Customer) => {
    return `${customer.first_name} ${customer.last_name}`.trim();
  };

  const formatTimeContext = (customer: Customer) => {
    if (customer.is_intro_offer && customer.intro_day !== undefined) {
      return `Day ${customer.intro_day}`;
    }
    return `${customer.days_since_registration} days ago`;
  };

  // Filter out empty sections
  const activeSections = group.sections.filter(section => section.customers.length > 0);

  if (activeSections.length === 0) {
    return (
      <div className="text-center py-12">
        <group.icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No {group.title}</h3>
        <p className="text-muted-foreground">
          No customers in this segment at the moment.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Group Header */}
        <div className="flex items-center gap-3 mb-6">
          <group.icon className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">{group.title}</h2>
          <Badge variant="secondary">{group.customers.length} total</Badge>
        </div>

        {/* Sections */}
        {activeSections.map((section) => {
          const sectionSelected = selectedCustomers[section.title] || new Set();
          const allSelected = section.customers.every(c => sectionSelected.has(c.id));
          const someSelected = section.customers.some(c => sectionSelected.has(c.id));

          return (
            <Card key={section.title} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{section.customers.length} people</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {section.customers.map((customer) => (
                    <div key={customer.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={sectionSelected.has(customer.id)}
                        onCheckedChange={() => toggleCustomerSelection(section.title, customer.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{formatName(customer)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeContext(customer)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {customer.client_email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleSelectAll(section.title, section.customers)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {sectionSelected.size > 0 
                        ? `${sectionSelected.size} selected`
                        : "Select all"
                      }
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openComposer(section, 'email')}
                      className="flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openComposer(section, 'whatsapp')}
                      className="flex items-center gap-2"
                      disabled={section.customers.every(c => !c.phone_number)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send WhatsApp
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Message Composer Dialog */}
      {composerConfig && (
        <MessageComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          customers={composerConfig.customers}
          messageType={composerConfig.messageType}
          templateType={composerConfig.templateType}
          sectionTitle={composerConfig.sectionTitle}
          onMessagesSent={onCustomersUpdated}
        />
      )}
    </>
  );
}