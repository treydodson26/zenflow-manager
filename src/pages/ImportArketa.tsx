import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// SEO helpers
function ensureMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// CSV -> DB column mapping (adjusted to current schema)
const columnMapping: Record<string, string | null> = {
  "Client Name": null, // derived
  "First Name": "first_name",
  "Last Name": "last_name",
  "Client Email": "client_email",
  "Phone Number": "phone_number",
  "Birthday": "birthday",
  "Address": "address",
  "Marketing Email Opt-in": "marketing_email_opt_in",
  "Marketing Text Opt In": "marketing_text_opt_in",
  "Agree to Liability Waiver": "agree_to_liability_waiver",
  "Pre-Arketa Milestone Count": "pre_arketa_milestone_count",
  "Transactional Text Opt In": "transactional_text_opt_in",
  "First Seen": "first_seen",
  "Last Seen": "last_seen",
  "Tags": "tags",
};

type ImportOptions = {
  updateExisting: boolean;
  addNew: boolean;
  skipDuplicateEmails: boolean;
  handleDuplicates: "update" | "skip" | "create";
};

type PreviewRow = {
  original: Record<string, any>;
  mapped: Record<string, any>;
  errors: Record<string, string>;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = 2;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function isValidEmail(email?: string) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanPhone(input?: string) {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (digits.length >= 8) return "+" + digits;
  return "";
}

function toISODate(input?: string) {
  if (!input) return "";
  const d = new Date(input);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function toBool(value: any) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(v)) return true;
    if (["false", "no", "0"].includes(v)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

export default function ImportArketa({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [lastImported, setLastImported] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<ImportOptions>({
    updateExisting: true,
    addNew: true,
    skipDuplicateEmails: false,
    handleDuplicates: "update",
  });

  useEffect(() => {
    if (embedded) return;
    document.title = "Import Arketa Client Data | Talo Yoga";
    ensureMeta("description", "Upload your daily Arketa CSV to synchronize customer records.");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = `${window.location.origin}/import`;
  }, [embedded]);

  useEffect(() => {
    // Fetch last import timestamp via Edge Function
    (async () => {
      const { data, error } = await supabase.functions.invoke("csv-import", {
        body: { action: "lastImport" },
      });
      if (!error) {
        const ts = data?.lastImport?.completed_at || data?.lastImport?.created_at;
        if (ts) setLastImported(new Date(ts).toLocaleString());
      }
    })();
  }, []);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); el.classList.add("ring-2", "ring-ring"); };
    const onDragLeave = () => { el.classList.remove("ring-2", "ring-ring"); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); el.classList.remove("ring-2", "ring-ring");
      const f = e.dataTransfer?.files?.[0]; if (f) onSelectFile(f);
    };
    el.addEventListener("dragover", onDragOver as any);
    el.addEventListener("dragleave", onDragLeave as any);
    el.addEventListener("drop", onDrop as any);
    return () => {
      el.removeEventListener("dragover", onDragOver as any);
      el.removeEventListener("dragleave", onDragLeave as any);
      el.removeEventListener("drop", onDrop as any);
    };
  }, []);

  const onSelectFile = (f: File) => {
    if (f.type !== "text/csv" && !f.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .csv file" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB" });
      return;
    }
    setFile(f);
    parseCsv(f);
  };

  const parseCsv = (f: File) => {
    setLoading(true);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as any[]).filter(Boolean);
        setTotalRecords(rows.length);
        const previews: PreviewRow[] = rows.slice(0, 10).map((row) => buildPreviewRow(row));
        setPreview(previews);
        setLoading(false);
        toast({ title: "CSV parsed", description: `Detected ${rows.length} rows` });
      },
      error: (err) => {
        setLoading(false);
        toast({ title: "Parse error", description: String(err) });
      },
    });
  };

  const buildPreviewRow = (row: Record<string, any>): PreviewRow => {
    const mapped: Record<string, any> = {};
    const errors: Record<string, string> = {};

    // Map fields
    Object.entries(columnMapping).forEach(([csvKey, dbField]) => {
      if (!dbField) return;
      mapped[dbField] = (row[csvKey] ?? "").toString().trim();
    });

    // Derived fields
    const first = (row["First Name"] ?? "").toString().trim();
    const last = (row["Last Name"] ?? "").toString().trim();
    mapped["client_name"] = `${first} ${last}`.trim();

    // Normalize + validate
    if (!isValidEmail(mapped["client_email"])) { errors["client_email"] = "Invalid email"; }
    mapped["phone_number"] = cleanPhone(mapped["phone_number"]);
    ["birthday", "first_seen", "last_seen"].forEach((k) => { mapped[k] = toISODate(mapped[k]); });
    [
      "marketing_email_opt_in",
      "marketing_text_opt_in",
      "agree_to_liability_waiver",
      "transactional_text_opt_in",
    ].forEach((k) => { mapped[k] = toBool(mapped[k]); });

    return { original: row, mapped, errors };
  };

  const hasErrors = useMemo(() => preview.some((p) => Object.keys(p.errors).length > 0), [preview]);

  const onImport = async () => {
    if (!file) return;
    setLoading(true);

    // Re-parse full file to get all records
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = (res.data as any[]).filter(Boolean);
        const normalized = rows.map((r) => buildPreviewRow(r).mapped);
        try {
          const { data, error } = await supabase.functions.invoke("csv-import", {
            body: {
              records: normalized,
              options,
              filename: file.name,
            },
          });
          if (error) throw error;
          setResult(data);
          setOpen(true);
          toast({ title: "Import completed", description: `${data?.total ?? 0} records processed` });
        } catch (e: any) {
          toast({ title: "Import failed", description: String(e?.message || e) });
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setLoading(false);
        toast({ title: "Parse error", description: String(err) });
      },
    });
  };

  return (
    <main className="space-y-8">
      <header className="space-y-1">
        {embedded ? (
          <h2 className="text-2xl font-semibold text-foreground">Import Arketa Client Data</h2>
        ) : (
          <h1 className="text-3xl font-semibold text-foreground">Import Arketa Client Data</h1>
        )}
        <p className="text-muted-foreground">Upload your daily CSV export from Arketa to sync client information</p>
        <p className="text-sm text-muted-foreground">Last imported: {lastImported ? lastImported : "No imports yet"}</p>
      </header>

      {/* Upload Zone */}
      <section
        ref={dropRef}
        className="border border-dashed rounded-xl p-8 bg-background/50 flex flex-col items-center text-center gap-3 cursor-pointer hover:bg-muted/40 transition"
        onClick={() => document.getElementById("file-input")?.click()}
        aria-label="CSV file drop zone"
      >
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-sm">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Drag and drop your CSV file here or click to browse</div>
          <div className="text-xs text-muted-foreground">Max size: 10MB</div>
        </div>
        <input id="file-input" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files && onSelectFile(e.target.files[0])} />
        {file && (
          <div className="text-sm text-foreground/80 mt-2">Selected: <span className="font-medium">{file.name}</span> • {formatBytes(file.size)}</div>
        )}
      </section>

      {/* Options */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-5 border rounded-lg bg-card">
          <h3 className="font-medium mb-4">Import Options</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="opt-update" checked={options.updateExisting} onCheckedChange={(v) => setOptions((o) => ({ ...o, updateExisting: !!v }))} />
              <Label htmlFor="opt-update">Update existing clients</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="opt-add" checked={options.addNew} onCheckedChange={(v) => setOptions((o) => ({ ...o, addNew: !!v }))} />
              <Label htmlFor="opt-add">Add new clients</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="opt-skipdup" checked={options.skipDuplicateEmails} onCheckedChange={(v) => setOptions((o) => ({ ...o, skipDuplicateEmails: !!v }))} />
              <Label htmlFor="opt-skipdup">Skip duplicate emails</Label>
            </div>
          </div>
        </div>

        <div className="p-5 border rounded-lg bg-card">
          <h3 className="font-medium mb-4">Duplicate Handling</h3>
          <RadioGroup value={options.handleDuplicates} onValueChange={(v: any) => setOptions((o) => ({ ...o, handleDuplicates: v }))}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="update" id="dup-update" />
              <Label htmlFor="dup-update">Update with latest data</Label>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <RadioGroupItem value="skip" id="dup-skip" />
              <Label htmlFor="dup-skip">Skip duplicates</Label>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <RadioGroupItem value="create" id="dup-create" />
              <Label htmlFor="dup-create">Create new entry</Label>
            </div>
          </RadioGroup>
        </div>
      </section>

      {/* Preview */}
      {file && (
        <section className="p-5 border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Data Preview</h3>
            <div className="text-sm text-muted-foreground">Total records: {totalRecords}</div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(columnMapping).map((k) => (
                    <TableHead key={k}>{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((p, i) => (
                  <TableRow key={i} className={Object.keys(p.errors).length ? "bg-destructive/5" : ""}>
                    {Object.keys(columnMapping).map((csvKey) => {
                      const dbField = columnMapping[csvKey];
                      const val = dbField ? p.mapped[dbField] : `${p.mapped.first_name ?? ""} ${p.mapped.last_name ?? ""}`.trim();
                      const hasErr = dbField ? !!p.errors[dbField] : false;
                      return (
                        <TableCell key={csvKey} className={hasErr ? "text-destructive" : ""}>
                          {typeof val === "boolean" ? (val ? "TRUE" : "FALSE") : (val ?? "")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>Showing first 10 rows</TableCaption>
            </Table>
          </div>
          <div className="mt-4">
            <button
              disabled={loading || hasErrors}
              onClick={onImport}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Importing..." : "Start Import"}
            </button>
            {hasErrors && (
              <span className="ml-3 text-sm text-destructive">Fix highlighted validation issues before importing.</span>
            )}
          </div>
        </section>
      )}

      {/* Results Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Import completed successfully</span>
              </div>
              <div className="text-sm text-muted-foreground">{result.total} records processed in {result.seconds}s</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border rounded-lg bg-background">
                  <div className="text-sm text-muted-foreground">New Clients Added</div>
                  <div className="text-2xl font-semibold">{result.added}</div>
                </div>
                <div className="p-4 border rounded-lg bg-background">
                  <div className="text-sm text-muted-foreground">Existing Clients Updated</div>
                  <div className="text-2xl font-semibold">{result.updated}</div>
                </div>
                <div className="p-4 border rounded-lg bg-background">
                  <div className="text-sm text-muted-foreground">Duplicates Skipped</div>
                  <div className="text-2xl font-semibold">{result.skipped}</div>
                </div>
                <div className="p-4 border rounded-lg bg-background">
                  <div className="text-sm text-muted-foreground">Errors Encountered</div>
                  <div className="text-2xl font-semibold">{result.errors}</div>
                </div>
              </div>

              <div className="space-y-3">
                <details className="p-4 border rounded-lg">
                  <summary className="cursor-pointer font-medium">New Intro Offers</summary>
                  <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground">
                    {(result.newIntroOffers || []).map((n: string, i: number) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </details>
                <details className="p-4 border rounded-lg">
                  <summary className="cursor-pointer font-medium">Updated Prospects</summary>
                  <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground">
                    {(result.updatedProspects || []).map((n: string, i: number) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </details>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <a href="/customers" className="px-4 py-2 rounded-md border">Go to Customers</a>
                <button className="px-4 py-2 rounded-md border" onClick={() => window.location.reload()}>Import Another File</button>
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
