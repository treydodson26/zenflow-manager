import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Mail, 
  MessageSquare, 
  Sparkles,
  FileText,
  Copy,
  Rocket,
  X,
  ArrowLeft,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface MessageSequence {
  id?: number;
  name: string;
  description?: string;
  active: boolean;
  steps: MessageStep[];
  totalSteps: number;
  totalDays: number;
}

interface MessageStep {
  id?: number;
  day: number;
  message_type: string;
  subject?: string;
  content: string;
  active: boolean;
}

interface CompanyInfo {
  name: string;
  painPoints: string[];
  valueProposition: string;
  callToAction: string;
  overview: string;
}

type CreationMode = 'selection' | 'ai-assisted' | 'templates' | 'clone' | 'from-scratch' | 'finalize';

export default function EnhancedSequenceBuilder() {
  const [sequences, setSequences] = useState<MessageSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>('selection');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    painPoints: [''],
    valueProposition: '',
    callToAction: '',
    overview: ''
  });
  const [currentSequence, setCurrentSequence] = useState<MessageSequence | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

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
      
      // Group sequences by name (if we had sequence grouping)
      const mockSequences: MessageSequence[] = [
        {
          id: 1,
          name: "Intro Offer Sequence",
          description: "New member welcome sequence",
          active: true,
          steps: data?.slice(0, 3) || [],
          totalSteps: 3,
          totalDays: 7
        }
      ];
      
      setSequences(mockSequences);
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

  const resetCreationFlow = () => {
    setCreationMode('selection');
    setCompanyInfo({
      name: '',
      painPoints: [''],
      valueProposition: '',
      callToAction: '',
      overview: ''
    });
    setCurrentSequence(null);
  };

  const addPainPoint = () => {
    if (companyInfo.painPoints.length < 5) {
      setCompanyInfo(prev => ({
        ...prev,
        painPoints: [...prev.painPoints, '']
      }));
    }
  };

  const updatePainPoint = (index: number, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      painPoints: prev.painPoints.map((point, i) => i === index ? value : point)
    }));
  };

  const removePainPoint = (index: number) => {
    if (companyInfo.painPoints.length > 1) {
      setCompanyInfo(prev => ({
        ...prev,
        painPoints: prev.painPoints.filter((_, i) => i !== index)
      }));
    }
  };

  const generateAISequence = async () => {
    try {
      // Mock AI generation - would call AI API here
      const aiGeneratedSequence: MessageSequence = {
        name: `${companyInfo.name} Outbound AI Sequence 1`,
        description: "AI-generated outreach sequence",
        active: true,
        totalSteps: 3,
        totalDays: 7,
        steps: [
          {
            day: 1,
            message_type: 'email',
            subject: `Boost Efficiency at ${companyInfo.name}`,
            content: `Hi {first_name},\n\n${companyInfo.valueProposition}\n\n${companyInfo.callToAction}`,
            active: true
          },
          {
            day: 4,
            message_type: 'email',
            subject: 'Following up on our previous conversation',
            content: 'Quick follow-up to see if you had a chance to review our previous message...',
            active: true
          },
          {
            day: 7,
            message_type: 'email',
            subject: 'Last chance to connect',
            content: 'This is my final outreach. If you\'re interested in learning more...',
            active: true
          }
        ]
      };

      setCurrentSequence(aiGeneratedSequence);
      setCreationMode('finalize');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI sequence",
        variant: "destructive",
      });
    }
  };

  const saveSequence = async () => {
    if (!currentSequence) return;

    try {
      // Save sequence steps to database
      for (const step of currentSequence.steps) {
        const { error } = await supabase
          .from('message_sequences')
          .insert({
            day: step.day,
            message_type: step.message_type,
            subject: step.subject,
            content: step.content,
            active: step.active
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Sequence saved successfully",
      });

      setIsCreateDialogOpen(false);
      resetCreationFlow();
      fetchSequences();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save sequence",
        variant: "destructive",
      });
    }
  };

  const renderCreateSequenceDialog = () => (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-[#1F2937]">
              {creationMode === 'selection' && 'Create a sequence'}
              {creationMode === 'ai-assisted' && 'Let AI assist with your sequences'}
              {creationMode === 'finalize' && 'Finalize your content'}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetCreationFlow();
              }}
              className="text-[#6B7280] hover:text-[#1F2937]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {creationMode === 'selection' && (
          <div className="space-y-6">
            <p className="text-[#6B7280]">
              Sequences are a series of automated or manual touchpoints and activities, designed to drive deeper engagement with your contacts.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:bg-[#F9FAFB] transition-colors bg-white border border-[#E5E7EB] shadow-sm"
                onClick={() => setCreationMode('ai-assisted')}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 text-[#1F2937]">AI-assisted</h3>
                  <p className="text-sm text-[#6B7280]">
                    Create a simple outbound sequence with one click.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-[#F9FAFB] transition-colors bg-white border border-[#E5E7EB] shadow-sm"
                onClick={() => setCreationMode('templates')}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-yellow-100 rounded-lg mx-auto flex items-center justify-center">
                      <FileText className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 text-[#1F2937]">Templates</h3>
                  <p className="text-sm text-[#6B7280]">
                    Start with one of our sequence templates.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-[#F9FAFB] transition-colors bg-white border border-[#E5E7EB] shadow-sm"
                onClick={() => setCreationMode('clone')}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto flex items-center justify-center">
                      <Copy className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 text-[#1F2937]">Clone</h3>
                  <p className="text-sm text-[#6B7280]">
                    Make a copy of one of your existing sequences.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-[#F9FAFB] transition-colors bg-white border border-[#E5E7EB] shadow-sm"
                onClick={() => setCreationMode('from-scratch')}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-pink-100 rounded-lg mx-auto flex items-center justify-center">
                      <Rocket className="w-8 h-8 text-pink-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 text-[#1F2937]">From scratch</h3>
                  <p className="text-sm text-[#6B7280]">
                    Create a new sequence from scratch.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {creationMode === 'ai-assisted' && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2C4A42]" />
                <span className="text-sm text-[#2C4A42] font-medium">Apollo AI-powered</span>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-[#1F2937] mb-2">Let AI assist with your sequences</h3>
                <p className="text-[#6B7280]">
                  Use Apollo AI to generate a complete campaign with sequential contact points to engage target audiences at scale.
                </p>
              </div>

              <div className="space-y-4 max-w-sm">
                <div className="w-48 h-48 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                    <div className="text-purple-800 font-medium">AI Magic</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="font-semibold text-[#1F2937]">Review your company information</h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-name" className="text-[#1F2937]">Company or product name*</Label>
                  <p className="text-xs text-[#6B7280] mb-2">Add your company, product, or service name.</p>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Ask"
                    className="border-[#E5E7EB]"
                  />
                  {!companyInfo.name && (
                    <p className="text-xs text-red-500 mt-1">Company or product name is required</p>
                  )}
                </div>

                <div>
                  <Label className="text-[#1F2937]">Customer pain points*</Label>
                  <p className="text-xs text-[#6B7280] mb-2">Add at least 3 pain points your product or service is solving.</p>
                  {companyInfo.painPoints.map((point, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Textarea
                        value={point}
                        onChange={(e) => updatePainPoint(index, e.target.value)}
                        placeholder="e.g. Too much manual work finding prospects and creating personalized outreaches"
                        rows={2}
                        className="border-[#E5E7EB]"
                      />
                      {companyInfo.painPoints.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePainPoint(index)}
                          className="text-[#6B7280] hover:text-[#1F2937]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {companyInfo.painPoints.length < 5 && (
                    <Button variant="outline" size="sm" onClick={addPainPoint} className="border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]">
                      <Plus className="w-3 h-3 mr-1" />
                      Add pain point
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="value-prop" className="text-[#1F2937]">Value proposition*</Label>
                  <p className="text-xs text-[#6B7280] mb-2">Add at least 3 benefits of using your product/service.</p>
                  <Textarea
                    id="value-prop"
                    value={companyInfo.valueProposition}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, valueProposition: e.target.value }))}
                    placeholder="Abelian delivers information technology services at the speed of AI, ensuring rapid and efficient solutions tailored to meet the evolving needs of businesses."
                    rows={3}
                    className="border-[#E5E7EB]"
                  />
                  <div className="text-xs text-[#6B7280] text-right mt-1">
                    {companyInfo.valueProposition.length}/600
                  </div>
                </div>

                <div>
                  <Label htmlFor="cta" className="text-[#1F2937]">Call-to-action*</Label>
                  <p className="text-xs text-[#6B7280] mb-2">Add an action you want the recipient to take. E.g. Book a meeting</p>
                  <Textarea
                    id="cta"
                    value={companyInfo.callToAction}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, callToAction: e.target.value }))}
                    placeholder="Contact us today to learn how our AI-driven IT services can transform your business operations."
                    rows={2}
                    className="border-[#E5E7EB]"
                  />
                  <div className="text-xs text-[#6B7280] text-right mt-1">
                    {companyInfo.callToAction.length}/300
                  </div>
                </div>

                <div>
                  <details>
                    <summary className="cursor-pointer text-sm text-[#2C4A42] font-medium">Hide additional inputs ▲</summary>
                    <div className="mt-4">
                      <Label htmlFor="company-overview" className="text-[#1F2937]">Company overview</Label>
                      <p className="text-xs text-[#6B7280] mb-2">Add a brief description of what your company or product does.</p>
                      <Textarea
                        id="company-overview"
                        value={companyInfo.overview}
                        onChange={(e) => setCompanyInfo(prev => ({ ...prev, overview: e.target.value }))}
                        placeholder="e.g. The only data intelligence and sales engagement platform you'll ever need"
                        rows={2}
                        className="border-[#E5E7EB]"
                      />
                    </div>
                  </details>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={resetCreationFlow}
                  className="border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]"
                >
                  Reset inputs
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreationMode('selection')}
                    className="border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]"
                  >
                    Back to sequence
                  </Button>
                  <Button
                    onClick={generateAISequence}
                    disabled={!companyInfo.name || companyInfo.painPoints.some(p => !p.trim())}
                    className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium"
                  >
                    Generate new sequence
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {creationMode === 'finalize' && currentSequence && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[#1F2937] mb-2">Finalize your content</h3>
                <p className="text-[#6B7280]">
                  Review and edit your emails, then save your sequence.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-[#1F2937]">{currentSequence.name}</h4>
                <Badge variant="secondary" className="bg-[#F3F4F6] text-[#6B7280]">
                  {currentSequence.totalSteps} steps | {currentSequence.totalDays} days in sequence
                </Badge>
              </div>

              <div className="space-y-4">
                {currentSequence.steps.map((step, index) => (
                  <Card key={index} className="overflow-hidden bg-white border border-[#E5E7EB] shadow-sm">
                    <CardHeader 
                      className="cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                      onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#2C4A42] text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <Mail className="w-4 h-4 text-[#6B7280]" />
                          <div>
                            <div className="font-medium text-[#1F2937]">Day {step.day} • Outreach</div>
                            <div className="text-sm text-[#6B7280]">Automatic email</div>
                          </div>
                        </div>
                        {expandedStep === index ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
                      </div>
                    </CardHeader>
                    
                    {expandedStep === index && (
                      <CardContent className="pt-0 border-t border-[#E5E7EB]">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-[#1F2937]">Subject</Label>
                            <Input 
                              value={step.subject || ''}
                              onChange={(e) => {
                                const updatedSteps = currentSequence.steps.map((s, i) => 
                                  i === index ? { ...s, subject: e.target.value } : s
                                );
                                setCurrentSequence({ ...currentSequence, steps: updatedSteps });
                              }}
                              className="border-[#E5E7EB] mt-1"
                            />
                          </div>
                          <div>
                            <Textarea
                              value={step.content}
                              onChange={(e) => {
                                const updatedSteps = currentSequence.steps.map((s, i) => 
                                  i === index ? { ...s, content: e.target.value } : s
                                );
                                setCurrentSequence({ ...currentSequence, steps: updatedSteps });
                              }}
                              rows={6}
                              className="border-[#E5E7EB]"
                            />
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreationMode('ai-assisted')}
                  className="border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]"
                >
                  Edit my information
                </Button>
                <Button
                  onClick={saveSequence}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium"
                >
                  Save sequence
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-[#F3F4F6] rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-[#F3F4F6] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-2">
        <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">Sequences</h1>
        <p className="text-[#6B7280]">Build and manage automated customer communication sequences</p>
      </header>

      {/* Sub-header with tabs and create button */}
      <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#1F2937]">All Sequences</span>
            <Badge variant="secondary" className="bg-[#F3F4F6] text-[#6B7280]">Analytics</Badge>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium"
        >
          Create sequence
        </Button>
      </div>

      {/* Sequences List */}
      <div className="space-y-4">
        {sequences.length === 0 ? (
          <Card className="bg-white border border-[#E5E7EB] shadow-sm">
            <CardContent className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1F2937] mb-2">No sequences yet</h3>
              <p className="text-[#6B7280] mb-4">
                Create your first automated sequence to start engaging customers
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create sequence
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="grid grid-cols-8 gap-4 p-4 bg-[#F9FAFB] text-sm font-medium text-[#6B7280] border-b border-[#E5E7EB]">
              <div>ACTIVATE</div>
              <div>NAME</div>
              <div>STEPS</div>
              <div>FINISHED</div>
              <div>SCHEDULED</div>
              <div>DELIVERED</div>
              <div>REPLIES</div>
              <div>BOUNCE</div>
            </div>
            
            {sequences.map((sequence) => (
              <div key={sequence.id} className="grid grid-cols-8 gap-4 p-4 border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB] transition-colors">
                <div>
                  <div className="w-6 h-6 rounded border-2 border-[#D1D5DB] bg-white"></div>
                </div>
                <div>
                  <div className="font-medium text-[#1F2937]">{sequence.name}</div>
                </div>
                <div className="text-[#6B7280]">{sequence.totalSteps}</div>
                <div className="text-[#6B7280]">-</div>
                <div className="text-[#6B7280]">-</div>
                <div className="text-[#6B7280]">-</div>
                <div className="text-[#6B7280]">-</div>
                <div className="text-[#6B7280]">-</div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {renderCreateSequenceDialog()}
    </div>
  );
}