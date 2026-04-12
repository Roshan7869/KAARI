'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Upload, Trash2, Copy, Check, Loader2, RefreshCw,
  ChevronDown, ImagePlus, X, Search, CheckSquare, Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { cloudinary } from '@/lib/cloudinary';

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  folder?: string;
}

const FOLDER_TABS = [
  { label: 'All', value: '' },
  { label: 'Products', value: 'products' },
  { label: 'Site Assets', value: 'kaari' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function CloudinaryMediaLibrary() {
  const [resources, setResources] = useState<CloudinaryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [folder, setFolder] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'done' | 'error'>>({});
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResources = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setSelected(new Set());
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (folder) params.set('folder', folder);
      if (!reset && nextCursor) params.set('next_cursor', nextCursor);

      const res = await fetch(`/api/admin/media?${params}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to load images');
        return;
      }

      const data = await res.json();
      const incoming: CloudinaryResource[] = data.resources || [];

      setResources(prev => {
        if (reset) return incoming;
        // Deduplicate: filter out resources already in the list
        const existingIds = new Set(prev.map(r => r.public_id));
        const newItems = incoming.filter(r => !existingIds.has(r.public_id));
        return [...prev, ...newItems];
      });
      setNextCursor(data.next_cursor || null);
    } catch {
      toast.error('Failed to connect to Cloudinary');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [folder, nextCursor]);

  useEffect(() => {
    fetchResources(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const valid = files.filter(f => {
      if (!validTypes.includes(f.type)) {
        toast.error(`${f.name}: unsupported type`);
        return false;
      }
      if (f.size > maxSize) {
        toast.error(`${f.name}: exceeds 5MB`);
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;

    setUploading(true);
    const progress: Record<string, 'uploading' | 'done' | 'error'> = {};
    valid.forEach(f => { progress[f.name] = 'uploading'; });
    setUploadProgress({ ...progress });

    const uploadFolder = folder || 'products';
    const newResources: CloudinaryResource[] = [];

    await Promise.allSettled(
      valid.map(async (file) => {
        try {
          const result = await cloudinary.uploadImage(file, { folder: uploadFolder });
          progress[file.name] = 'done';
          setUploadProgress({ ...progress });
          newResources.push({
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            created_at: result.created_at || new Date().toISOString(),
            folder: uploadFolder,
          });
        } catch {
          progress[file.name] = 'error';
          setUploadProgress({ ...progress });
          toast.error(`Failed to upload ${file.name}`);
        }
      })
    );

    if (newResources.length > 0) {
      setResources(prev => [...newResources, ...prev]);
      toast.success(`${newResources.length} image${newResources.length > 1 ? 's' : ''} uploaded`);
    }

    setUploading(false);
    setTimeout(() => setUploadProgress({}), 2000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(Array.from(e.target.files || []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleUpload(Array.from(e.dataTransfer.files));
  };

  const toggleSelect = (publicId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.public_id)));
    }
  };

  const handleCopyUrl = (resource: CloudinaryResource) => {
    navigator.clipboard.writeText(resource.secure_url);
    setCopiedId(resource.public_id);
    toast.success('URL copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} image${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/admin/media/delete-asset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds: Array.from(selected) }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Delete failed');
        return;
      }

      setResources(prev => prev.filter(r => !selected.has(r.public_id)));
      const count = selected.size;
      setSelected(new Set());
      toast.success(`${count} image${count > 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Delete request failed');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = resources.filter(r =>
    !search || r.public_id.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage images stored in Cloudinary
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchResources(true)}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Images
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/40',
          uploading && 'pointer-events-none opacity-60'
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        aria-label="Click or drag to upload images"
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(uploadProgress).map(([name, status]) => (
                <Badge
                  key={name}
                  variant={status === 'done' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {status === 'done' ? <Check className="h-3 w-3 mr-1" /> : status === 'error' ? <X className="h-3 w-3 mr-1" /> : <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {name.length > 20 ? name.slice(0, 20) + '…' : name}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop images here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, WebP, GIF — up to 10MB each — multiple files supported
            </p>
          </>
        )}
      </div>

      {/* Folder Tabs */}
      <Tabs value={folder} onValueChange={setFolder}>
        <TabsList>
          {FOLDER_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by public ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAll}>
              {allSelected ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete ({selected.size})
            </Button>
          )}
          {selected.size > 0 && (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImagePlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No images found{search && ' matching your search'}</p>
          {!search && (
            <p className="text-xs mt-1">Upload your first image using the zone above</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((resource) => {
            const isSelected = selected.has(resource.public_id);
            const isCopied = copiedId === resource.public_id;

            return (
              <div
                key={resource.public_id}
                className={cn(
                  'relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                  isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/30'
                )}
                onClick={() => toggleSelect(resource.public_id)}
              >
                {/* Image */}
                <div className="aspect-square relative bg-muted">
                  <Image
                    src={resource.secure_url}
                    alt={resource.public_id}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  />
                </div>

                {/* Selection checkbox */}
                <div className={cn(
                  'absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-background/80 border-white/60 opacity-0 group-hover:opacity-100'
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => { e.stopPropagation(); handleCopyUrl(resource); }}
                  >
                    {isCopied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {isCopied ? 'Copied!' : 'Copy URL'}
                  </Button>
                </div>

                {/* Info bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 truncate">
                  {resource.public_id.split('/').pop()}
                  <span className="ml-1 text-white/60">· {formatBytes(resource.bytes)}</span>
                </div>

                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {nextCursor && !loading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchResources(false)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            Load More
          </Button>
        </div>
      )}

      {/* Stats footer */}
      {!loading && resources.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {resources.length} images loaded
          {nextCursor && ' (more available)'}
        </p>
      )}
    </div>
  );
}
