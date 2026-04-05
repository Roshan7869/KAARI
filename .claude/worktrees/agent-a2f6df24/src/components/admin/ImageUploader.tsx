import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  X,
  Image as ImageIcon,
  Loader2,
  FileImage,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

interface ImageUploaderProps {
  productId: string;
  productTitle: string;
  onUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
  existingImages?: Array<{ id: string; file_path: string; alt_text?: string }>;
  onDeleteExisting?: (id: string, path: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export function ImageUploader({
  productId,
  productTitle,
  onUpload,
  isUploading,
  existingImages = [],
  onDeleteExisting,
  maxFiles = 10,
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}: ImageUploaderProps) {
  const [pendingFiles, setPendingFiles] = useState<ImageFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `File too large. Max size: ${maxSizeMB}MB` };
      }
      return { valid: true };
    },
    [allowedTypes, maxSizeMB]
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const totalFiles = existingImages.length + pendingFiles.length + fileArray.length;

      if (totalFiles > maxFiles) {
        alert(`Maximum ${maxFiles} images allowed`);
        return;
      }

      const newFiles: ImageFile[] = [];
      for (const file of fileArray) {
        const validation = validateFile(file);
        if (!validation.valid) {
          alert(validation.error);
          continue;
        }

        const preview = URL.createObjectURL(file);
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview,
          status: 'pending',
        });
      }

      setPendingFiles((prev) => [...prev, ...newFiles]);
    },
    [existingImages.length, pendingFiles.length, maxFiles, validateFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadAllFiles = async () => {
    if (pendingFiles.length === 0) return;

    const filesToUpload = pendingFiles.map((pf) => pf.file);

    // Update status to uploading
    setPendingFiles((prev) =>
      prev.map((pf) => ({ ...pf, status: 'uploading' as const, progress: 0 }))
    );

    try {
      await onUpload(filesToUpload);

      // Mark all as success
      setPendingFiles((prev) =>
        prev.map((pf) => ({ ...pf, status: 'success' as const, progress: 100 }))
      );

      // Clear after success animation
      setTimeout(() => {
        setPendingFiles([]);
      }, 1000);
    } catch (error) {
      setPendingFiles((prev) =>
        prev.map((pf) => ({
          ...pf,
          status: 'error' as const,
          error: 'Upload failed',
        }))
      );
    }
  };

  // Camera capture functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        processFiles([file]);
        stopCamera();
      },
      'image/jpeg',
      0.9
    );
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {existingImages.map((img, index) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square bg-accent/10 rounded-lg overflow-hidden group"
            >
              <img
                src={img.file_path}
                alt={img.alt_text || `Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md">
                  Primary
                </span>
              )}
              {onDeleteExisting && (
                <button
                  type="button"
                  onClick={() => onDeleteExisting(img.id, img.file_path)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <div className="w-full max-w-lg space-y-4">
              <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={stopCamera} className="text-white border-white">
                  Cancel
                </Button>
                <Button onClick={capturePhoto} className="bg-white text-black hover:bg-gray-100">
                  <Camera className="w-5 h-5 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 transition-all duration-200',
          'flex flex-col items-center justify-center min-h-[200px]',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-accent/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <motion.div
          animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
          className="text-center"
        >
          <div className="flex justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <FileImage className="w-7 h-7 text-primary" />
            </div>
          </div>
          <p className="font-body text-lg font-medium text-foreground mb-1">
            Drag and drop images here
          </p>
          <p className="font-body text-sm text-muted-foreground mb-4">
            or choose an upload method
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* File Upload Button */}
            <label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </label>

            {/* Camera Button (Mobile-friendly) */}
            <label className="sm:hidden">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </label>

            {/* Camera Button (Desktop with live camera) */}
            <Button
              type="button"
              variant="outline"
              className="hidden sm:flex"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4 mr-2" />
              Use Camera
            </Button>
          </div>

          <p className="font-body text-xs text-muted-foreground mt-3">
            Max {maxFiles} images, up to {maxSizeMB}MB each. JPG, PNG, WebP, GIF
          </p>
        </motion.div>
      </div>

      {/* Pending Files Preview */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="font-body text-sm font-medium text-muted-foreground">
              {pendingFiles.length} image{pendingFiles.length > 1 ? 's' : ''} ready to upload
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pendingFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square bg-accent/10 rounded-lg overflow-hidden group"
                >
                  <img
                    src={file.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Status Overlay */}
                  {file.status !== 'pending' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      {file.status === 'uploading' && (
                        <div className="text-white text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
                          <span className="text-xs">{file.progress}%</span>
                        </div>
                      )}
                      {file.status === 'success' && (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <span className="text-red-500 text-xs">{file.error}</span>
                      )}
                    </div>
                  )}

                  {/* Remove Button */}
                  {file.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => removePendingFile(file.id)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* File Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="font-body text-xs text-white truncate">
                      {file.file.name}
                    </p>
                    <p className="font-body text-xs text-white/70">
                      {formatFileSize(file.file.size)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingFiles([])}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button
                type="button"
                onClick={uploadAllFiles}
                disabled={isUploading || pendingFiles.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {pendingFiles.length} Image{pendingFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}