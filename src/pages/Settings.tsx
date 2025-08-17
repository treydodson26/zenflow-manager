import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Save, Settings2, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BusinessSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  updated_at: string;
}

interface PricingPlan {
  plan_name: string;
  plan_category: 'Intro' | 'Membership' | 'Drop-In';
  plan_duration_days: number | null;
  created_at: string;
  updated_at: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<BusinessSetting[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [introDuration, setIntroDuration] = useState(14);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCategory, setNewPlanCategory] = useState<'Intro' | 'Membership' | 'Drop-In'>('Intro');
  const [newPlanDuration, setNewPlanDuration] = useState<number | ''>('');

  useEffect(() => {
    document.title = "Business Settings | Talo Yoga";
    fetchSettings();
    fetchPricingPlans();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      
      setSettings(data || []);
      
      // Set intro duration from settings
      const introDurationSetting = data?.find(s => s.setting_key === 'intro_offer_duration');
      if (introDurationSetting && typeof introDurationSetting.setting_value === 'object' && introDurationSetting.setting_value !== null) {
        const value = introDurationSetting.setting_value as { days: number };
        setIntroDuration(value.days);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load business settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) throw error;

      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.setting_key === key 
            ? { ...setting, setting_value: value }
            : setting
        )
      );

      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleIntroDurationSave = () => {
    updateSetting('intro_offer_duration', { days: introDuration });
  };

  const fetchPricingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('plan_name');

      if (error) throw error;
      setPricingPlans((data || []) as PricingPlan[]);
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing plans",
        variant: "destructive",
      });
    }
  };

  const addPricingPlan = async () => {
    if (!newPlanName.trim()) {
      toast({
        title: "Error",
        description: "Plan name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pricing_plans')
        .insert({
          plan_name: newPlanName.trim(),
          plan_category: newPlanCategory,
          plan_duration_days: newPlanDuration === '' ? null : Number(newPlanDuration)
        });

      if (error) throw error;

      setNewPlanName('');
      setNewPlanCategory('Intro');
      setNewPlanDuration('');
      await fetchPricingPlans();

      toast({
        title: "Success",
        description: "Pricing plan added successfully",
      });
    } catch (error) {
      console.error('Error adding pricing plan:', error);
      toast({
        title: "Error",
        description: "Failed to add pricing plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePricingPlan = async (planName: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pricing_plans')
        .delete()
        .eq('plan_name', planName);

      if (error) throw error;

      await fetchPricingPlans();

      toast({
        title: "Success",
        description: "Pricing plan deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting pricing plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete pricing plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePricingPlanCategory = async (planName: string, newCategory: 'Intro' | 'Membership' | 'Drop-In') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pricing_plans')
        .update({ plan_category: newCategory })
        .eq('plan_name', planName);

      if (error) throw error;

      await fetchPricingPlans();

      toast({
        title: "Success",
        description: "Plan category updated successfully",
      });
    } catch (error) {
      console.error('Error updating pricing plan:', error);
      toast({
        title: "Error",
        description: "Failed to update pricing plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
          <p className="text-muted-foreground">
            Configure your studio's operational parameters
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Intro Offer Duration</CardTitle>
            <CardDescription>
              Set the length of your intro offer period. Changing this will affect new customers and the communication sequence timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="intro-duration">Duration (days)</Label>
                <Input
                  id="intro-duration"
                  type="number"
                  value={introDuration}
                  onChange={(e) => setIntroDuration(parseInt(e.target.value))}
                  min="1"
                  max="90"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleIntroDurationSave}
                disabled={saving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Current timeline:</strong></p>
              <ul className="mt-2 space-y-1">
                <li>• Day 0: Welcome message</li>
                <li>• Day 3: First check-in</li>
                <li>• Day 6: Engagement message</li>
                <li>• Day 10: Conversion offer</li>
                <li>• Day 13: Final reminder</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Settings</CardTitle>
            <CardDescription>
              Your nurture sequence automatically adjusts to the intro offer duration. The 5 touchpoints are proportionally spaced throughout the period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Message timing formula:</strong></p>
              <ul className="space-y-1">
                <li>• Welcome: Day 0 (immediate)</li>
                <li>• Check-in: Day {Math.round(introDuration * 0.21)} (21% of period)</li>
                <li>• Engagement: Day {Math.round(introDuration * 0.43)} (43% of period)</li>
                <li>• Conversion: Day {Math.round(introDuration * 0.71)} (71% of period)</li>
                <li>• Final: Day {Math.round(introDuration * 0.93)} (93% of period)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Plan Dictionary</CardTitle>
            <CardDescription>
              Map your Arketa pricing plan names to categories for accurate customer segmentation. This improves how we identify Intro Offers, Memberships, and Drop-In customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Plan name (e.g. Monthly Unlimited)"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="flex-1"
              />
              <Select value={newPlanCategory} onValueChange={(value: 'Intro' | 'Membership' | 'Drop-In') => setNewPlanCategory(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intro">Intro</SelectItem>
                  <SelectItem value="Membership">Membership</SelectItem>
                  <SelectItem value="Drop-In">Drop-In</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Days"
                value={newPlanDuration}
                onChange={(e) => setNewPlanDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20"
              />
              <Button onClick={addPricingPlan} disabled={saving} className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {pricingPlans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration (Days)</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingPlans.map((plan) => (
                    <TableRow key={plan.plan_name}>
                      <TableCell className="font-medium">{plan.plan_name}</TableCell>
                      <TableCell>
                        <Select 
                          value={plan.plan_category} 
                          onValueChange={(value: 'Intro' | 'Membership' | 'Drop-In') => updatePricingPlanCategory(plan.plan_name, value)}
                          disabled={saving}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Intro">Intro</SelectItem>
                            <SelectItem value="Membership">Membership</SelectItem>
                            <SelectItem value="Drop-In">Drop-In</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{plan.plan_duration_days || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePricingPlan(plan.plan_name)}
                          disabled={saving}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No pricing plans configured yet. Add your first plan above.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;