import { useEffect, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Clock, Users, TrendingUp, Database, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PageLoader from "@/components/layout/PageLoader";

// SEO helpers
function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

type ImportResult = {
  success: boolean;
  total_customers: number;
  new_customers: number;
  updated_customers: number;
  segment_changes: Array<{
    customer_id: number;
    customer_name: string;
    old_segment: string;
    new_segment: string;
    change_type: string;
  }>;
  processing_time_ms: number;
  snapshot_id: string;
  errors: string[];
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
      // Create form data for the edge function
      const formData = new FormData();
      formData.append('client_list', clientListFile);
      formData.append('client_attendance', attendanceFile);
      
      const { data, error } = await supabase.functions.invoke("import-arketa-csv", {
        body: formData,
      });

      if (error) throw error;
      
      setResult(data);
      setShowResults(true);
      toast({ 
        title: "Import completed", 
        description: `Processed ${data.total_customers} customers with ${data.segment_changes.length} segment changes` 
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


  if (loading) {
    return <PageLoader />;
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Hero Header */}
      <header className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
          <Database className="w-8 h-8 text-primary-foreground" />
        </div>
        
        {embedded ? (
          <h2 className="text-3xl font-bold tracking-tight">Daily CSV Import</h2>
        ) : (
          <h1 className="text-4xl font-bold tracking-tight">Daily CSV Import</h1>
        )}
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your daily Arketa CSV files to sync customer data and track segment changes automatically
        </p>
        
        {lastImported && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last import:</span>
            <span className="font-medium">{lastImported}</span>
          </div>
        )}
      </header>

      {/* Upload Section */}
      <section className="grid lg:grid-cols-2 gap-8">
        {/* Client List Upload */}
        <Card className="group hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Master Client List</CardTitle>
                <CardDescription>Complete customer database export</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                clientListFile 
                  ? 'border-primary bg-primary/5 hover:bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => document.getElementById("client-list-input")?.click()}
            >
              <div className="space-y-4">
                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  clientListFile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {clientListFile ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
                
                <div className="space-y-2">
                  <div className="font-semibold text-foreground">
                    {clientListFile ? clientListFile.name : 'Client_List.csv'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {clientListFile 
                      ? `${formatBytes(clientListFile.size)} • Ready to process`
                      : 'Drag & drop or click to select your CSV file'
                    }
                  </div>
                </div>
                
                {clientListFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile('clientList');
                    }}
                    className="mt-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove File
                  </Button>
                )}
              </div>
            </div>
            <input 
              id="client-list-input" 
              type="file" 
              accept=".csv,text/csv" 
              className="hidden" 
              onChange={(e) => e.target.files && validateAndSelectFile(e.target.files[0], 'clientList')} 
            />
          </CardContent>
        </Card>

        {/* Attendance Upload */}
        <Card className="group hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Client Attendance Report</CardTitle>
                <CardDescription>Class attendance tracking data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                attendanceFile 
                  ? 'border-primary bg-primary/5 hover:bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => document.getElementById("attendance-input")?.click()}
            >
              <div className="space-y-4">
                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  attendanceFile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {attendanceFile ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
                
                <div className="space-y-2">
                  <div className="font-semibold text-foreground">
                    {attendanceFile ? attendanceFile.name : 'clientAttendance.csv'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {attendanceFile 
                      ? `${formatBytes(attendanceFile.size)} • Ready to process`
                      : 'Drag & drop or click to select your CSV file'
                    }
                  </div>
                </div>
                
                {attendanceFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile('attendance');
                    }}
                    className="mt-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove File
                  </Button>
                )}
              </div>
            </div>
            <input 
              id="attendance-input" 
              type="file" 
              accept=".csv,text/csv" 
              className="hidden" 
              onChange={(e) => e.target.files && validateAndSelectFile(e.target.files[0], 'attendance')} 
            />
          </CardContent>
        </Card>
      </section>

      {/* Progress Indicator */}
      {(clientListFile || attendanceFile) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Upload Progress</span>
                <span className="text-sm text-muted-foreground">
                  {(clientListFile && attendanceFile) ? '2/2' : '1/2'} files selected
                </span>
              </div>
              <Progress value={(clientListFile && attendanceFile) ? 100 : 50} className="h-2" />
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${clientListFile ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={clientListFile ? 'text-foreground' : 'text-muted-foreground'}>
                    Client List
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${attendanceFile ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={attendanceFile ? 'text-foreground' : 'text-muted-foreground'}>
                    Attendance Report
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      <section className="flex justify-center pt-4">
        <Button
          size="lg"
          disabled={!clientListFile || !attendanceFile || loading}
          onClick={processFiles}
          className="min-w-[240px] h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing Files...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5" />
              Process CSV Files
            </div>
          )}
        </Button>
      </section>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Import Summary Report</DialogTitle>
                <p className="text-muted-foreground">CSV processing completed successfully</p>
              </div>
            </div>
          </DialogHeader>
          
          {result ? (
            <div className="space-y-8">
              {/* Success Banner */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                      <div>
                        <div className="font-semibold text-primary">Import Completed Successfully</div>
                        <div className="text-sm text-muted-foreground">
                          Processing completed in {Math.round(result.processing_time_ms / 1000)}s
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      ID: {result.snapshot_id?.slice(-8)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics Grid */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{result.total_customers}</div>
                        <div className="text-sm text-muted-foreground">Total Records</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{result.new_customers}</div>
                        <div className="text-sm text-muted-foreground">New Customers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{result.updated_customers}</div>
                        <div className="text-sm text-muted-foreground">Updated Records</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{result.segment_changes.length}</div>
                        <div className="text-sm text-muted-foreground">Segment Changes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Segment Changes */}
              {result.segment_changes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Customer Journey Updates
                    </CardTitle>
                    <CardDescription>
                      Customers who moved between segments during this import
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-80 overflow-y-auto space-y-3">
                      {result.segment_changes.slice(0, 10).map((change, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                          <div className="space-y-1">
                            <div className="font-medium">{change.customer_name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {change.change_type}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{change.old_segment}</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default">{change.new_segment}</Badge>
                          </div>
                        </div>
                      ))}
                      {result.segment_changes.length > 10 && (
                        <div className="text-center py-3 text-sm text-muted-foreground border-t">
                          + {result.segment_changes.length - 10} more segment changes
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Display */}
              {result.errors && result.errors.length > 0 && (
                <Card className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      Processing Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {result.errors.map((error, i) => (
                        <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div className="text-sm text-destructive">{error}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
                <Button variant="outline" asChild>
                  <a href="/message-sequences" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    View Approval Queue
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/customers" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Browse Customers
                  </a>
                </Button>
                <Button 
                  onClick={() => { 
                    setShowResults(false); 
                    setResult(null); 
                    setClientListFile(null); 
                    setAttendanceFile(null); 
                  }}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import More Files
                </Button>
              </div>
            </div>
          ) : (
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Unable to Load Results</div>
                    <div className="text-sm text-muted-foreground">
                      The import may have failed or the response was malformed
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
