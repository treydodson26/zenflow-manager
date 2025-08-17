import { useEffect, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageLoader from "@/components/layout/PageLoader";

// SEO helpers
function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

type ImportResult = {
  success: boolean;
  customers_processed: number;
  segment_changes: Array<{
    customer_name: string;
    change_type: string;
    old_segment: string;
    new_segment: string;
  }>;
  processing_time_ms: number;
  errors?: string[];
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = 2;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function ImportArketa({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const [clientListFile, setClientListFile] = useState<File | null>(null);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [lastImported, setLastImported] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (embedded) return;
    document.title = "Import Daily CSV Files | Talo Yoga";
    ensureMeta("description", "Upload your daily Arketa CSV files to process customer data and segment changes.");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = `${window.location.origin}/import-arketa`;
  }, [embedded]);

  useEffect(() => {
    // Fetch last import timestamp
    (async () => {
      try {
        const { data: imports } = await supabase
          .from('csv_imports')
          .select('completed_at, status')
          .order('completed_at', { ascending: false })
          .limit(1);
        
        if (imports && imports.length > 0 && imports[0].completed_at) {
          setLastImported(new Date(imports[0].completed_at).toLocaleString());
        }
      } catch (error) {
        console.error('Error fetching last import:', error);
      }
    })();
  }, []);

  const validateAndSelectFile = (file: File, type: 'clientList' | 'attendance') => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .csv file" });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB" });
      return false;
    }
    
    if (type === 'clientList') {
      setClientListFile(file);
      toast({ title: "Client list selected", description: `${file.name} (${formatBytes(file.size)})` });
    } else {
      setAttendanceFile(file);
      toast({ title: "Attendance file selected", description: `${file.name} (${formatBytes(file.size)})` });
    }
    return true;
  };

  const clearFile = (type: 'clientList' | 'attendance') => {
    if (type === 'clientList') {
      setClientListFile(null);
    } else {
      setAttendanceFile(null);
    }
  };

  const processFiles = async () => {
    if (!clientListFile || !attendanceFile) {
      toast({ title: "Missing files", description: "Please select both CSV files" });
      return;
    }

    setLoading(true);
    
    try {
      // Convert files to base64 for transmission
      const clientListContent = await fileToBase64(clientListFile);
      const attendanceContent = await fileToBase64(attendanceFile);
      
      const { data, error } = await supabase.functions.invoke("import-arketa-csv", {
        body: {
          client_list: clientListContent,
          client_attendance: attendanceContent,
          client_list_filename: clientListFile.name,
          client_attendance_filename: attendanceFile.name,
        },
      });

      if (error) throw error;
      
      setResult(data);
      setShowResults(true);
      toast({ 
        title: "Import completed", 
        description: `Processed ${data.customers_processed} customers with ${data.segment_changes.length} segment changes` 
      });
    } catch (e: any) {
      toast({ 
        title: "Import failed", 
        description: e?.message || "An unexpected error occurred" 
      });
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:text/csv;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <main className="space-y-8">
      <header className="space-y-1">
        {embedded ? (
          <h2 className="text-2xl font-semibold text-foreground">Daily CSV Import</h2>
        ) : (
          <h1 className="text-3xl font-semibold text-foreground">Daily CSV Import</h1>
        )}
        <p className="text-muted-foreground">Upload your daily Arketa CSV files to process customer data and detect segment changes</p>
        <p className="text-sm text-muted-foreground">Last imported: {lastImported || "No imports yet"}</p>
      </header>

      {/* Two Upload Areas */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Client List Upload */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Master Client List</h3>
          <div
            className="border border-dashed rounded-xl p-6 bg-background/50 flex flex-col items-center text-center gap-3 cursor-pointer hover:bg-muted/40 transition min-h-[200px] justify-center"
            onClick={() => document.getElementById("client-list-input")?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Client_List.csv</div>
              <div className="text-xs text-muted-foreground">Contains all customer information</div>
            </div>
            <input 
              id="client-list-input" 
              type="file" 
              accept=".csv,text/csv" 
              className="hidden" 
              onChange={(e) => e.target.files && validateAndSelectFile(e.target.files[0], 'clientList')} 
            />
            {clientListFile ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="text-sm text-foreground font-medium">{clientListFile.name}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile('clientList');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Click to select file</div>
            )}
          </div>
        </div>

        {/* Attendance Upload */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Client Attendance Report</h3>
          <div
            className="border border-dashed rounded-xl p-6 bg-background/50 flex flex-col items-center text-center gap-3 cursor-pointer hover:bg-muted/40 transition min-h-[200px] justify-center"
            onClick={() => document.getElementById("attendance-input")?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">clientAttendance.csv</div>
              <div className="text-xs text-muted-foreground">Contains class attendance data</div>
            </div>
            <input 
              id="attendance-input" 
              type="file" 
              accept=".csv,text/csv" 
              className="hidden" 
              onChange={(e) => e.target.files && validateAndSelectFile(e.target.files[0], 'attendance')} 
            />
            {attendanceFile ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="text-sm text-foreground font-medium">{attendanceFile.name}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile('attendance');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Click to select file</div>
            )}
          </div>
        </div>
      </section>

      {/* Process Button */}
      <section className="flex justify-center">
        <Button
          size="lg"
          disabled={!clientListFile || !attendanceFile || loading}
          onClick={processFiles}
          className="min-w-[200px]"
        >
          {loading ? "Processing Files..." : "Process Files"}
        </Button>
      </section>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Summary Report</DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Import completed successfully</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Processing completed in {Math.round(result.processing_time_ms / 1000)}s
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-background">
                  <div className="text-sm text-muted-foreground">Total Records Processed</div>
                  <div className="text-2xl font-semibold">{result.customers_processed}</div>
                </div>
                <div className="p-4 border rounded-lg bg-background">
                  <div className="text-sm text-muted-foreground">Segment Changes Detected</div>
                  <div className="text-2xl font-semibold">{result.segment_changes.length}</div>
                </div>
              </div>

              {/* Segment Changes */}
              {result.segment_changes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Key Segment Changes</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {result.segment_changes.slice(0, 10).map((change, i) => (
                      <div key={i} className="p-3 border rounded-lg bg-background/50">
                        <div className="font-medium text-sm">{change.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {change.change_type}: {change.old_segment} → {change.new_segment}
                        </div>
                      </div>
                    ))}
                    {result.segment_changes.length > 10 && (
                      <div className="text-xs text-muted-foreground text-center">
                        ...and {result.segment_changes.length - 10} more changes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Errors Encountered</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.errors.map((error, i) => (
                      <div key={i} className="text-sm text-destructive bg-destructive/5 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-end">
                <Button variant="outline" asChild>
                  <a href="/message-sequences">Go to Approval Queue</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/customers">View Customers</a>
                </Button>
                <Button onClick={() => { setShowResults(false); setResult(null); setClientListFile(null); setAttendanceFile(null); }}>
                  Import Another File
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>Unable to load results.</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
