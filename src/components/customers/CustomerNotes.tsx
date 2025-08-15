import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerNote {
  id: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
}

interface CustomerNotesProps {
  customerId: number;
}

export default function CustomerNotes({ customerId }: CustomerNotesProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_notes')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
        toast({
          title: "Error",
          description: "Failed to load customer notes",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          content: newNote.trim(),
          author: 'Studio Staff' // TODO: Get from auth context
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote("");
      setIsAdding(false);
      toast({
        title: "Note added",
        description: "Customer note has been saved successfully"
      });
    } catch (error) {
      console.error('Failed to add note:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Notes</CardTitle>
          <CardDescription>Internal notes about this customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Customer Notes</CardTitle>
            <CardDescription>Internal notes about this customer</CardDescription>
          </div>
          {!isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <Textarea
              placeholder="Add a note about this customer..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={saving || !newNote.trim()}>
                {saving ? "Saving..." : "Save Note"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAdding(false);
                  setNewNote("");
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Edit3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <p className="text-sm">Add the first note about this customer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{note.author}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(note.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}