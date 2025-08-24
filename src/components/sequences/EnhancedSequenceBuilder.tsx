import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Trash2, 
  Save, 
  Play, 
  Mail, 
  MessageSquare, 
  Phone, 
  Clock,
  Settings,
  Eye,
  Send,
  Zap
} from "lucide-react";

interface MessageStep {
  id?: number;
  day: number;
  message_type: string;
  subject?: string;
  content: string;
  active: boolean;
  delay_hours?: number;
}

interface SequenceBuilderProps {
  onSequenceChange?: (sequences: MessageStep[]) => void;
}

export default function EnhancedSequenceBuilder({ onSequenceChange }: SequenceBuilderProps) {
  const [sequences, setSequences] = useState<MessageStep[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [sequenceName, setSequenceName] = useState("Customer Nurture Sequence");
  const [isCreatingTwilioSequence, setIsCreatingTwilioSequence] = useState(false);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('message_sequences')
        .select('*')
        .order('day', { ascending: true });

      if (error) throw error;
      
      setSequences(data || []);
      onSequenceChange?.(data || []);
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast({
        title: "Error",
        description: "Failed to load sequences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addNewStep = () => {
    const maxDay = sequences.length > 0 ? Math.max(...sequences.map(s => s.day)) : -1;
    const newStep: MessageStep = {
      day: maxDay + 1,
      message_type: 'email',
      subject: '',
      content: '',
      active: true,
      delay_hours: 24
    };
    
    setSequences(prev => [...prev, newStep]);
    setEditingId(newStep.day); // Use day as temporary ID for new steps
  };

  const updateStep = (index: number, updates: Partial<MessageStep>) => {
    setSequences(prev => 
      prev.map((step, i) => 
        i === index ? { ...step, ...updates } : step
      )
    );
  };

  const deleteStep = async (stepId: number, index: number) => {
    try {
      if (stepId) {
        const { error } = await supabase
          .from('message_sequences')
          .delete()
          .eq('id', stepId);
        
        if (error) throw error;
      }
      
      setSequences(prev => prev.filter((_, i) => i !== index));
      toast({
        title: "Success",
        description: "Sequence step deleted",
      });
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: "Error",
        description: "Failed to delete step",
        variant: "destructive",
      });
    }
  };

  const saveStep = async (step: MessageStep, index: number) => {
    try {
      const { id, ...stepData } = step;
      
      if (id) {
        // Update existing
        const { error } = await supabase
          .from('message_sequences')
          .update(stepData)
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('message_sequences')
          .insert(stepData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Update local state with the new ID
        setSequences(prev => 
          prev.map((s, i) => 
            i === index ? { ...s, id: data.id } : s
          )
        );
      }
      
      setEditingId(null);
      toast({
        title: "Success",
        description: "Sequence step saved",
      });
    } catch (error) {
      console.error('Error saving step:', error);
      toast({
        title: "Error",
        description: "Failed to save step",
        variant: "destructive",
      });
    }
  };

  const createTwilioSequence = async () => {
    setIsCreatingTwilioSequence(true);
    try {
      const whatsappSteps = sequences.filter(s => s.message_type === 'whatsapp' && s.active);
      
      if (whatsappSteps.length === 0) {
        toast({
          title: "No WhatsApp Steps",
          description: "Add some WhatsApp message steps first",
          variant: "destructive",
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-twilio-sequence', {
        body: {
          name: sequenceName,
          description: "Automated customer nurture sequence",
          messages: whatsappSteps.map(step => ({
            day: step.day,
            content: step.content,
            delay_minutes: (step.delay_hours || 24) * 60
          }))
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Twilio Sequence Created",
        description: `Created ${data.templates_created} WhatsApp templates in Twilio`,
      });
      
    } catch (error) {
      console.error('Error creating Twilio sequence:', error);
      toast({
        title: "Error",
        description: "Failed to create Twilio sequence",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTwilioSequence(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'sms':
        return <Phone className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const renderStepCard = (step: MessageStep, index: number) => {
    const isEditing = editingId === step.id || (editingId === step.day && !step.id);
    const isPreviewing = previewingId === (step.id || step.day);
    
    return (
      <Card key={step.id || `new-${step.day}`} className="relative group">
        {/* Step Number Badge */}
        <div className="absolute -left-3 -top-3 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium z-10">
          {index + 1}
        </div>
        
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Day {isEditing ? (
                  <Input
                    type="number"
                    value={step.day}
                    onChange={(e) => updateStep(index, { day: parseInt(e.target.value) || 0 })}
                    className="w-20 h-8"
                    min="0"
                    max="365"
                  />
                ) : (
                  step.day
                )}
                {getMessageTypeIcon(step.message_type)}
              </CardTitle>
              
              <Badge variant={step.message_type === 'email' ? 'default' : 'secondary'}>
                {isEditing ? (
                  <Select 
                    value={step.message_type}
                    onValueChange={(value) => updateStep(index, { message_type: value })}
                  >
                    <SelectTrigger className="w-28 h-6 text-xs border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  step.message_type
                )}
              </Badge>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={step.active}
                  onCheckedChange={(checked) => updateStep(index, { active: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {step.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewingId(isPreviewing ? null : (step.id || step.day))}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(step.id || step.day)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      if (!step.id) {
                        // Remove unsaved new step
                        setSequences(prev => prev.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveStep(step, index)}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteStep(step.id || 0, index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Timing Configuration */}
          {isEditing && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-muted/30 rounded">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm">Send after:</Label>
              <Input
                type="number"
                value={step.delay_hours || 24}
                onChange={(e) => updateStep(index, { delay_hours: parseInt(e.target.value) || 24 })}
                className="w-20 h-8"
                min="1"
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          )}
          
          {/* Subject Line for Emails */}
          {(step.message_type === 'email' || isEditing) && (
            <div className="space-y-2 mt-4">
              <Label htmlFor={`subject-${index}`} className="text-sm font-medium">
                Subject Line
              </Label>
              {isEditing ? (
                <Input
                  id={`subject-${index}`}
                  value={step.subject || ''}
                  onChange={(e) => updateStep(index, { subject: e.target.value })}
                  placeholder="Email subject line..."
                />
              ) : (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {step.subject || 'No subject set'}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor={`content-${index}`} className="text-sm font-medium">
              Message Content
            </Label>
            {isEditing ? (
              <Textarea
                id={`content-${index}`}
                value={step.content}
                onChange={(e) => updateStep(index, { content: e.target.value })}
                placeholder="Message content... Use {first_name}, {last_name}, {email} for personalization"
                rows={6}
                className="resize-none"
              />
            ) : (
              <div className={`text-sm p-3 rounded transition-all ${
                isPreviewing 
                  ? 'bg-primary/10 border-2 border-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <div className="whitespace-pre-wrap">{step.content}</div>
                {isPreviewing && (
                  <div className="mt-3 pt-3 border-t text-xs text-primary">
                    <strong>Preview Mode:</strong> This is how the message will appear to customers
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!isEditing && (
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
              <span>Last updated: {step.id ? 'Saved' : 'Not saved'}</span>
              <span>{step.delay_hours || 24}h delay</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Sequence Builder</h2>
          <p className="text-muted-foreground">Create automated customer communication workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={createTwilioSequence}
            disabled={isCreatingTwilioSequence}
            className="flex items-center gap-2"
          >
            <Zap className={`w-4 h-4 ${isCreatingTwilioSequence ? 'animate-spin' : ''}`} />
            {isCreatingTwilioSequence ? 'Creating...' : 'Sync to Twilio'}
          </Button>
          <Button onClick={addNewStep} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Step
          </Button>
        </div>
      </div>
      
      {/* Sequence Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sequence Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sequence-name">Sequence Name</Label>
              <Input
                id="sequence-name"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="Enter sequence name..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{sequences.filter(s => s.active).length}</div>
                <div className="text-sm text-muted-foreground">Active Steps</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">{sequences.filter(s => s.message_type === 'email').length}</div>
                <div className="text-sm text-muted-foreground">Email Steps</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{sequences.filter(s => s.message_type === 'whatsapp').length}</div>
                <div className="text-sm text-muted-foreground">WhatsApp Steps</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sequence Steps */}
      <div className="space-y-6">
        {sequences.map((step, index) => renderStepCard(step, index))}
        
        {sequences.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No sequence steps yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first automated message step to get started
              </p>
              <Button onClick={addNewStep} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add First Step
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}