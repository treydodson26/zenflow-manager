
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, TrendingUp, Star } from "lucide-react";

interface ClientMetrics {
  total_clients: number;
  prospects: number;
  leads: number;
  new_journeys: number;
  active_members: number;
  intro_offers: number;
}

export default function ClientPipeline() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['client-pipeline-metrics'],
    queryFn: async (): Promise<ClientMetrics> => {
      // Get total client count
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Get pipeline stage counts
      const { data: stageData } = await supabase
        .from('clients')
        .select('pipeline_stage')
        .not('pipeline_stage', 'is', null);

      // Count by stage
      const stageCounts = {
        prospects: 0,
        leads: 0,
        new_journeys: 0,
        active_members: 0
      };

      stageData?.forEach(client => {
        if (client.pipeline_stage === 'prospect') stageCounts.prospects++;
        else if (client.pipeline_stage === 'lead') stageCounts.leads++;
        else if (client.pipeline_stage === 'new_journey') stageCounts.new_journeys++;
        else if (client.pipeline_stage === 'active_member') stageCounts.active_members++;
      });

      // Get intro offers count
      const { count: introCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_intro_offer', true);

      return {
        total_clients: totalClients || 0,
        prospects: stageCounts.prospects,
        leads: stageCounts.leads,
        new_journeys: stageCounts.new_journeys,
        active_members: stageCounts.active_members,
        intro_offers: introCount || 0
      };
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pipelineStages = [
    {
      name: 'Prospects',
      count: metrics?.prospects || 0,
      description: 'Never engaged or inactive 90+ days',
      icon: Users,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/20'
    },
    {
      name: 'Leads',
      count: metrics?.leads || 0,
      description: 'Trial users, 1-4 classes, no membership',
      icon: UserPlus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'New Journeys',
      count: metrics?.new_journeys || 0,
      description: 'First 30 days with membership',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Active Members',
      count: metrics?.active_members || 0,
      description: 'Established, regular attendance',
      icon: Star,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Client Pipeline</h1>
        <p className="text-muted-foreground">
          Track your yoga studio clients through their journey from prospects to active members
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{metrics?.total_clients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All clients in system
            </p>
          </CardContent>
        </Card>

        {pipelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <Card key={stage.name} className={stage.bgColor}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${stage.color}`} />
                  {stage.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`text-2xl font-bold ${stage.color}`}>
                  {stage.count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stage.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Opportunities */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Key Opportunities
            </CardTitle>
            <CardDescription>
              Focus areas for revenue growth and client engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.leads > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <span className="font-medium text-blue-900">
                    {metrics.leads} leads ready for conversion
                  </span>
                  <p className="text-sm text-blue-600">
                    Trial users who need membership offers
                  </p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  High Priority
                </Badge>
              </div>
            )}
            
            {metrics.intro_offers > 0 && (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <span className="font-medium text-purple-900">
                    {metrics.intro_offers} intro offers to track
                  </span>
                  <p className="text-sm text-purple-600">
                    Monitor daily progress and conversion timing
                  </p>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  Track Daily
                </Badge>
              </div>
            )}
            
            {metrics.prospects > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">
                    {metrics.prospects} prospects need re-engagement
                  </span>
                  <p className="text-sm text-gray-600">
                    Inactive clients ready for win-back campaigns
                  </p>
                </div>
                <Badge variant="outline">
                  Re-engage
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase 1 Complete Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <div>
              <p className="font-medium text-green-900">Phase 1: Database Foundation Complete</p>
              <p className="text-sm text-green-700 mt-1">
                Ready for Phase 2: CSV Import Engine. The pipeline structure is now in place to process your Arketa exports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
