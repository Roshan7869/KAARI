'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { logger } from '@/lib/logger-client';
import { Loader2, Upload, Trash2, Eye, EyeOff, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Story {
  id: string;
  image_url: string;
  public_id: string;
  caption: string | null;
  link_url: string | null;
  position: number;
  is_active: boolean;
}

export default function AdminStoriesPage() {
  const [stories, setStories]           = useState<Story[]>([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [caption, setCaption]           = useState('');
  const [linkUrl, setLinkUrl]           = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load stories ────────────────────────────────────────────────
  const loadStories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stories');
      if (!res.ok) throw new Error('Failed to load stories');
      const data = await res.json();
      setStories(data.stories || []);
    } catch (err) {
      logger.error('Failed to load stories', err, { context: 'admin-stories' });
      toast.error('Could not load stories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  // ── Upload handler (sequential to respect position order) ───────
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      toast.error('Only image files are supported');
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${validFiles.length}…`);
      const fd = new FormData();
      fd.append('file', validFiles[i]);
      if (caption) fd.append('caption', caption);
      if (linkUrl) fd.append('link_url', linkUrl);

      try {
        const res = await fetch('/api/admin/stories', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json();
          toast.error(`${validFiles[i].name}: ${err.error}`);
        } else {
          successCount++;
        }
      } catch (err) {
        logger.error('Upload error', err, { context: 'admin-stories' });
        toast.error(`Failed to upload ${validFiles[i].name}`);
      }
    }

    setUploading(false);
    setUploadProgress('');
    if (successCount > 0) {
      toast.success(`${successCount} story image${successCount > 1 ? 's' : ''} uploaded`);
      setCaption('');
      setLinkUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    loadStories();
  };

  // ── Toggle active ────────────────────────────────────────────────
  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch('/api/admin/stories', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, is_active: !current }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to update story');
        return;
      }
      setStories(prev =>
        prev.map(s => (s.id === id ? { ...s, is_active: !current } : s))
      );
    } catch (err) {
      logger.error('Toggle error', err, { context: 'admin-stories' });
      toast.error('Failed to update story');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────
  const deleteStory = async (id: string) => {
    if (!confirm('Delete this story? The image will also be removed from Cloudinary.')) return;
    try {
      const res = await fetch(`/api/admin/stories?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to delete story');
        return;
      }
      setStories(prev => prev.filter(s => s.id !== id));
      toast.success('Story deleted');
    } catch (err) {
      logger.error('Delete error', err, { context: 'admin-stories' });
      toast.error('Failed to delete story');
    }
  };

  const activeCount = stories.filter(s => s.is_active).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Instagram className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-foreground">Instagram Stories</h1>
          <p className="font-body text-sm text-muted-foreground mt-0.5">
            Images shown in the @kaari.handmade feed section on the homepage.
            Square images (1:1) work best. Max 5 MB each.
          </p>
        </div>
      </div>

      {/* Upload section */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg text-foreground">Upload New Story</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="e.g. New collection drop 🧶"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link_url">Link URL (optional)</Label>
            <Input
              id="link_url"
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="e.g. /products/summer-bag"
            />
          </div>
        </div>

        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center
                     cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (!uploading) handleUpload(e.dataTransfer.files); }}
        >
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
              <p className="font-body text-sm text-muted-foreground">{uploadProgress}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="font-body font-medium text-sm">Drop images here or click to select</p>
              <p className="font-body text-xs text-muted-foreground">
                JPG, PNG, WebP — max 5 MB each — multiple files allowed
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {/* Stories grid */}
      <div className="space-y-3">
        <h2 className="font-display text-lg text-foreground">
          Live Stories
          <span className="ml-2 font-body text-sm font-normal text-muted-foreground">
            ({activeCount} active of {stories.length} total)
          </span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
            <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-muted-foreground">
              No stories yet. Upload your first image above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stories.map(story => (
              <div
                key={story.id}
                className={`rounded-xl overflow-hidden border-2 transition-all ${
                  story.is_active
                    ? 'border-emerald-400'
                    : 'border-border opacity-60'
                }`}
              >
                <div className="aspect-square relative bg-muted">
                  <Image
                    src={story.image_url}
                    alt={story.caption || 'Story'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                </div>
                {story.caption && (
                  <div className="px-2 py-1 text-xs text-muted-foreground truncate bg-muted/50 font-body">
                    {story.caption}
                  </div>
                )}
                <div className="flex gap-1 p-2 bg-card">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 h-7 text-xs gap-1 ${
                      story.is_active
                        ? 'text-emerald-600 hover:text-emerald-700'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => toggleActive(story.id, story.is_active)}
                  >
                    {story.is_active
                      ? <><Eye className="w-3 h-3" />Live</>
                      : <><EyeOff className="w-3 h-3" />Hidden</>
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteStory(story.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="rounded-xl bg-muted/50 p-4 font-body text-sm text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground">How it works</p>
        <ul className="list-disc pl-4 space-y-1 text-xs">
          <li>Uploaded images appear in the Instagram-style grid on the homepage.</li>
          <li>Images are cropped to 400×400 px (square) and served via Cloudinary CDN.</li>
          <li>Toggle the eye icon to show or hide individual images without deleting them.</li>
          <li>Deletion removes the image from both the database and Cloudinary.</li>
          <li>Homepage updates within 60 seconds after any change (ISR cache).</li>
        </ul>
      </div>
    </div>
  );
}
