import { useState, useEffect } from "react";
import { Helmet } from 'react-helmet-async';
import EnhancedSequenceBuilder from '@/components/sequences/EnhancedSequenceBuilder';
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
  return (
    <>
      <Helmet>
        <title>Message Sequences | Talo Yoga</title>
        <meta 
          name="description" 
          content="Build and manage automated customer communication sequences for your yoga studio. Apollo.io-style automation with email and WhatsApp." 
        />
      </Helmet>
      <EnhancedSequenceBuilder />
    </>
  );
};

export default MessageSequences;