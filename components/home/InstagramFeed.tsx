'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

interface Story {
  id: string;
  image_url: string;
  caption: string | null;
  link_url: string | null;
}

const INSTAGRAM_URL = 'https://www.instagram.com/kaari.handmade';

export function InstagramFeed() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('instagram_stories')
      .select('id, image_url, caption, link_url')
      .eq('is_active', true)
      .order('position', { ascending: true })
      .limit(6)
      .then(({ data }: { data: Story[] | null }) => {
        setStories(data ?? []);
        setLoaded(true);
      });
  }, []);

  // Don't render the section until we know whether there are stories
  if (!loaded) return null;
  if (stories.length === 0) return null;

  return (
    <section className="py-20 bg-ivory">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <p className="font-dm-sans text-xs text-maroon/50 tracking-[0.25em] uppercase mb-3">
            Follow Along
          </p>
          <h2 className="font-cormorant text-3xl md:text-5xl text-maroon-deep font-semibold mb-3">
            @kaari.handmade
          </h2>
          <p className="font-dm-sans text-maroon/45 text-sm">
            Tag us in your photos for a chance to be featured
          </p>
        </motion.div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mb-8">
          {stories.map((story, i) => (
            <motion.a
              key={story.id}
              href={story.link_url || INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative aspect-square overflow-hidden bg-cream-warm"
              aria-label={`View ${story.caption || 'story'} on Instagram`}
            >
              <Image
                src={story.image_url}
                alt={story.caption || 'Instagram story'}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 33vw, 16vw"
              />
              <div className="absolute inset-0 bg-maroon/0 group-hover:bg-maroon/70 transition-colors duration-300 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="text-center">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-8 rounded-full border border-maroon/15 text-maroon font-dm-sans text-xs tracking-[0.15em] uppercase hover:bg-maroon hover:text-white transition-all duration-300"
          >
            <Instagram className="w-4 h-4" aria-hidden />
            Follow Us on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
