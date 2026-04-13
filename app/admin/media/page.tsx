import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function MediaLibrarySkeleton() {
  return (
    <div className="p-6 space-y-6" aria-busy="true" aria-label="Loading media library...">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Media Library | Kaari Admin',
  description: 'Upload and manage Cloudinary images',
};

const CloudinaryMediaLibrary = dynamic(
  () => import('@/components/pages/admin/CloudinaryMediaLibrary'),
  { loading: () => <MediaLibrarySkeleton /> }
);

export default function AdminMediaPage() {
  return <CloudinaryMediaLibrary />;
}
