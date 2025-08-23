import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, TrendingUp, AlertCircle, Send, Sparkles } from "lucide-react";
import CustomerAIChat from "@/components/chat/CustomerAIChat";

interface FredAssistantProps {
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    status: string;
    current_day: number;
    total_classes: number;
    daysSinceLastVisit?: number;
    engagement_metrics: {
      classes_per_week: number;
      response_rate: number;
      referrals: number;
      tags: string[];
    };
  };
}

export default function FredAssistant({ customer }: FredAssistantProps) {
  const [showChat, setShowChat] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  const generateInsights = () => {
    const newInsights = [];
    
    // Journey insights
    if (customer.status === "intro" && customer.current_day > 20) {
      newInsights.push("Customer is nearing end of intro period - consider sending conversion offer");
    }
    
    // Engagement insights
    if (customer.engagement_metrics.classes_per_week < 1) {
      newInsights.push("Low class frequency - suggest sending motivational check-in");
    }
    
    // Response insights
    if (customer.engagement_metrics.response_rate < 50) {
      newInsights.push("Low response rate - try personalizing message content");
    }
    
    // Attendance insights
    if (customer.daysSinceLastVisit && customer.daysSinceLastVisit > 14) {
      newInsights.push("Customer hasn't attended recently - recommend re-engagement sequence");
    }
    
    setInsights(newInsights);
  };

  const getSuggestedActions = () => {
    const actions = [];
    
    if (customer.status === "intro") {
      actions.push({
        title: "Send Day " + customer.current_day + " Follow-up",
        description: "Automated intro sequence message",
        icon: Send,
        variant: "default" as const
      });
    }
    
    if (customer.daysSinceLastVisit && customer.daysSinceLastVisit > 7) {
      actions.push({
        title: "Re-engagement Campaign",
        description: "Win back inactive students",
        icon: TrendingUp,
        variant: "secondary" as const
      });
    }
    
    if (customer.engagement_metrics.referrals === 0) {
      actions.push({
        title: "Referral Request",
        description: "Ask for friend recommendations",
        icon: Sparkles,
        variant: "outline" as const
      });
    }
    
    return actions;
  };

  const getEngagementScore = () => {
    let score = 50; // Base score
    
    // Adjust based on class frequency
    score += Math.min(customer.engagement_metrics.classes_per_week * 10, 30);
    
    // Adjust based on response rate
    score += (customer.engagement_metrics.response_rate - 50) * 0.4;
    
    // Adjust based on recency
    if (customer.daysSinceLastVisit) {
      score -= Math.min(customer.daysSinceLastVisit * 2, 40);
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const engagementScore = getEngagementScore();
  const suggestedActions = getSuggestedActions();

  return (
    <div className="space-y-4">
      {/* Fred AI Assistant Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="text-white w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Fred AI Assistant</CardTitle>
            <CardDescription>
              Get insights about {customer.first_name}'s journey and engagement patterns
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="ml-auto"
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? "Hide Chat" : "Chat with Fred"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Engagement Score */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-700">Engagement Score</div>
              <div className="text-2xl font-bold text-gray-900">{engagementScore}/100</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              engagementScore >= 80 ? 'bg-green-100 text-green-800' :
              engagementScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {engagementScore >= 80 ? 'High' : engagementScore >= 60 ? 'Medium' : 'Low'}
            </div>
          </div>

          {/* Quick Insights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">AI Insights</h4>
              <Button size="sm" variant="ghost" onClick={generateInsights}>
                <Sparkles className="w-4 h-4 mr-1" />
                Generate
              </Button>
            </div>
            {insights.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                Click "Generate" to get AI-powered insights about this customer
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">{insight}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Suggested Actions</h4>
            <div className="grid gap-2">
              {suggestedActions.map((action, index) => (
                <Button 
                  key={index}
                  variant={action.variant}
                  className="justify-start h-auto p-3"
                  onClick={() => {
                    // Handle action click
                    console.log('Action clicked:', action.title);
                  }}
                >
                  <action.icon className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs opacity-75">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Interface */}
      {showChat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat with Fred
            </CardTitle>
            <CardDescription>
              Ask Fred anything about {customer.first_name}'s journey, engagement, or get suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerAIChat 
              customer={{
                id: customer.id,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}