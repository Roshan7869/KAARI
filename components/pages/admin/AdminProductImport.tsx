'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Download, FileText, Check, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ImportResult {
  imported: number;
  products: Array<{ id: string; title: string; slug: string }>;
}

interface CSVValidationError {
  row: number;
  field: string;
  message: string;
}

const REQUIRED_COLUMNS = ['title', 'slug', 'base_price'];
const ALL_COLUMNS = ['title', 'slug', 'base_price', 'category', 'description', 'product_type', 'is_active', 'allow_customization'];

export default function AdminProductImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<CSVValidationError[]>([]);

  function parsePreview(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    setPreviewHeaders(headers);

    const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length > 0) {
      toast.error(`Missing required columns: ${missing.join(', ')}`);
      return;
    }

    const rows = lines.slice(1, 6).map(line => { // preview up to 5 rows
      const values: string[] = [];
      let current = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { values.push(current.trim()); current = ''; }
        else current += ch;
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
    setPreview(rows);
    setValidationErrors([]);
    setResult(null);
  }

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) { toast.error('Please upload a CSV file'); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => parsePreview(e.target?.result as string);
    reader.readAsText(f);
  }

  const importMutation = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch('/api/admin/products/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) { setValidationErrors(data.errors); throw new Error(data.error); }
        throw new Error(data.error || 'Import failed');
      }
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setValidationErrors([]);
      toast.success(`Successfully imported ${data.imported} product${data.imported !== 1 ? 's' : ''}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function downloadTemplate() {
    window.open('/api/admin/products/import', '_blank');
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-display text-3xl text-foreground">Import Products</h1>
          <p className="font-body text-muted-foreground mt-1">Bulk import products from a CSV file</p>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader><CardTitle className="text-base">CSV Format</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with the following columns. Required columns are marked with *.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Column</th>
                  <th className="text-left px-3 py-2 font-semibold">Required</th>
                  <th className="text-left px-3 py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { col: 'title', req: true, desc: 'Product name' },
                  { col: 'slug', req: true, desc: 'URL slug (lowercase letters, numbers, hyphens)' },
                  { col: 'base_price', req: true, desc: 'Price in INR (number)' },
                  { col: 'category', req: false, desc: 'Product category (e.g. Earrings, Bags)' },
                  { col: 'description', req: false, desc: 'Product description' },
                  { col: 'product_type', req: false, desc: '"standard" or "customized" (default: standard)' },
                  { col: 'is_active', req: false, desc: 'true or false (default: true)' },
                  { col: 'allow_customization', req: false, desc: 'true or false (default: false)' },
                ].map(r => (
                  <tr key={r.col} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{r.col}</td>
                    <td className="px-3 py-2">{r.req ? <Badge className="text-xs">Required</Badge> : <span className="text-muted-foreground text-xs">Optional</span>}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <Download className="w-4 h-4" />
            Download Template CSV
          </Button>
        </CardContent>
      </Card>

      {/* Upload */}
      {!result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Upload CSV</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">{file ? file.name : 'Drop CSV here or click to browse'}</p>
              <p className="text-sm text-muted-foreground mt-1">Max 500 rows, 2MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {validationErrors.map((e, i) => (
                <p key={i} className="text-sm text-destructive">
                  Row {e.row}: <span className="font-mono">{e.field}</span> — {e.message}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview.length > 0 && !result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview (first {preview.length} rows)</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreview([]); }} className="gap-1 text-muted-foreground">
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => file && importMutation.mutate(file)}
                  disabled={importMutation.isPending}
                  className="gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {importMutation.isPending ? 'Importing...' : 'Import Now'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {previewHeaders.map(h => (
                      <th key={h} className={`text-left px-2 py-2 font-semibold ${REQUIRED_COLUMNS.includes(h) ? '' : 'text-muted-foreground'}`}>
                        {h}{REQUIRED_COLUMNS.includes(h) && ' *'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      {previewHeaders.map(h => (
                        <td key={h} className="px-2 py-2 truncate max-w-[150px]">{row[h] || <span className="text-muted-foreground/50">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {result && (
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Import Successful!</h3>
                <p className="text-muted-foreground">{result.imported} product{result.imported !== 1 ? 's' : ''} imported</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setResult(null); setFile(null); setPreview([]); }}>
                  Import More
                </Button>
                <Button asChild>
                  <Link href="/admin/products"><FileText className="w-4 h-4 mr-2" />View Products</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
