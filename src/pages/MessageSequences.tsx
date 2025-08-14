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
import { Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    } catch (error) {
      console.error('Error fetching sequences:', error);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Loading message sequences...</div>
        </div>
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
        <Button
          variant="outline"
          onClick={() => fetchSequences(true)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No message sequences found</p>
                <p className="text-sm">Message sequences will appear here when they're created</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MessageSequences;