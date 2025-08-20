import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, RefreshCw, Play, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MessageSequencesSkeleton, ErrorState, EmptyState } from "@/components/ui/loading-skeletons";

interface MessageSequence {
  id: number;
  day: number;
  message_type: string;
  subject: string | null;
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const MessageSequences = () => {
  const [sequences, setSequences] = useState<MessageSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    document.title = "Message Sequences | Talo Yoga";
    fetchSequences();
  }, []);

  const fetchSequences = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('message_sequences')
        .select('*')
        .order('day', { ascending: true });

      if (error) throw error;
      
      console.log('Fetched sequences from database:', data);
      setSequences(data || []);
      
      if (showRefreshing) {
        toast({
          title: "Refreshed",
          description: "Message sequences updated from database",
        });
      }
    } catch (err) {
      console.error('Error fetching sequences:', err);
      setError("Failed to load message sequences from the database.");
      toast({
        title: "Error",
        description: "Failed to load message sequences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateSequence = async (id: number, updates: Partial<MessageSequence>) => {
    try {
      const { error } = await supabase
        .from('message_sequences')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setSequences(prev => 
        prev.map(seq => 
          seq.id === id 
            ? { ...seq, ...updates }
            : seq
        )
      );

      toast({
        title: "Success",
        description: "Message sequence updated successfully",
      });
    } catch (error) {
      console.error('Error updating sequence:', error);
      toast({
        title: "Error",
        description: "Failed to update message sequence",
        variant: "destructive",
      });
    }
  };

  const handleFieldChange = (id: number, field: keyof MessageSequence, value: any) => {
    setSequences(prev =>
      prev.map(seq =>
        seq.id === id
          ? { ...seq, [field]: value }
          : seq
      )
    );
  };

  const saveSequence = (sequence: MessageSequence) => {
    const { id, created_at, updated_at, ...updates } = sequence;
    updateSequence(id, updates);
    setEditingId(null);
  };

  const runSequenceAutomation = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-sequence-automation', {
        body: { triggered_by: 'manual' }
      });

      if (error) throw error;

      toast({
        title: "Automation Complete",
        description: `Processed ${data.processed} customer journeys, queued ${data.queued} messages`,
      });
    } catch (error) {
      console.error('Automation error:', error);
      toast({
        title: "Automation Failed",
        description: "Failed to run sequence automation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const startCustomerJourney = async (customerId: number, segmentType: string = 'prospect') => {
    try {
      const { data, error } = await supabase.functions.invoke('start-customer-journey', {
        body: { customer_id: customerId, segment_type: segmentType }
      });

      if (error) throw error;

      toast({
        title: "Journey Started",
        description: `Customer journey initiated for customer ${customerId}`,
      });
    } catch (error) {
      console.error('Start journey error:', error);
      toast({
        title: "Failed to Start Journey",
        description: "Could not start customer journey",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <MessageSequencesSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState 
          title="Failed to Load Sequences" 
          message="Unable to load message sequences from the database."
          onRetry={() => fetchSequences()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Sequences</h1>
          <p className="text-muted-foreground">
            Configure your customer nurture sequence timing and message templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchSequences(true)}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={runSequenceAutomation}
            disabled={processing}
            className="flex items-center gap-2"
          >
            <Play className={`h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Processing...' : 'Run Automation'}
          </Button>
        </div>
      </div>

      {/* Automation Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequences.filter(s => s.active).length}</div>
            <p className="text-xs text-muted-foreground">
              of {sequences.length} total sequences
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Running</div>
            <p className="text-xs text-muted-foreground">
              Every 15 min (6 AM-10 PM)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Message Types</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Email:</span>
                <span>{sequences.filter(s => s.message_type === 'email').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>WhatsApp:</span>
                <span>{sequences.filter(s => s.message_type === 'whatsapp').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journey Days</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sequences.length > 0 ? Math.max(...sequences.map(s => s.day)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              day journey span
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How it Works */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">🤖 How Automated Sequences Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Automatic Processing:</strong> Every 15 minutes during business hours (6 AM - 10 PM), the system checks which customers are due for their next message.
          </p>
          <p>
            <strong>Customer Journey Tracking:</strong> Each customer has a journey progress that tracks which day they're on and when their next message is due.
          </p>
          <p>
            <strong>Personalization:</strong> Messages automatically include {`{first_name}`}, {`{last_name}`}, and {`{email}`} placeholders that get replaced with actual customer data.
          </p>
          <p>
            <strong>Opt-in Compliance:</strong> Only sends messages to customers who have opted in for marketing emails/texts.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {sequences.map((sequence) => (
          <Card key={sequence.id} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    Day {editingId === sequence.id ? (
                      <Input
                        type="number"
                        value={sequence.day}
                        onChange={(e) => handleFieldChange(sequence.id, 'day', parseInt(e.target.value))}
                        className="w-20 inline-block mx-1"
                        min="0"
                        max="365"
                      />
                    ) : (
                      sequence.day
                    )}
                  </CardTitle>
                  <Badge variant={sequence.message_type === 'email' ? 'default' : 'secondary'}>
                    {editingId === sequence.id ? (
                      <Select 
                        value={sequence.message_type}
                        onValueChange={(value) => handleFieldChange(sequence.id, 'message_type', value)}
                      >
                        <SelectTrigger className="w-24 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      sequence.message_type
                    )}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sequence.active}
                      onCheckedChange={(checked) => {
                        handleFieldChange(sequence.id, 'active', checked);
                        updateSequence(sequence.id, { active: checked });
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {sequence.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === sequence.id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          fetchSequences(); // Reset changes
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveSequence(sequence)}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(sequence.id)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              {(sequence.message_type === 'email' || editingId === sequence.id) && (
                <div className="space-y-2">
                  <Label htmlFor={`subject-${sequence.id}`} className="text-sm font-medium">
                    Subject Line
                  </Label>
                  {editingId === sequence.id ? (
                    <Input
                      id={`subject-${sequence.id}`}
                      value={sequence.subject || ''}
                      onChange={(e) => handleFieldChange(sequence.id, 'subject', e.target.value)}
                      placeholder="Email subject line"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {sequence.subject || 'No subject set'}
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor={`content-${sequence.id}`} className="text-sm font-medium">
                  Message Content
                </Label>
                {editingId === sequence.id ? (
                  <Textarea
                    id={`content-${sequence.id}`}
                    value={sequence.content}
                    onChange={(e) => handleFieldChange(sequence.id, 'content', e.target.value)}
                    placeholder="Message content..."
                    rows={6}
                    className="resize-none"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded whitespace-pre-wrap">
                    {sequence.content}
                  </div>
                )}
              </div>
              
              {editingId !== sequence.id && (
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Last updated: {new Date(sequence.updated_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {sequences.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="No message sequences found"
                message="Message sequences will appear here when they're created."
                actionLabel="Refresh"
                onAction={() => fetchSequences(true)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MessageSequences;