'use client'
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function CustomDesignForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designIdea: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Thank you! We will get back to you soon about your custom design.');
    setFormData({ name: '', email: '', designIdea: '' });
  };

  return (
    <section className="py-24 md:py-32 bg-secondary">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-4">
            Custom Orders
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
            Create Your Own Crochet Piece
          </h2>
          <p className="font-heritage text-muted-foreground text-lg">
            Request a custom crochet design handcrafted specially for you.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-body text-sm tracking-wide text-muted-foreground mb-2 uppercase">
                Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-background border border-border font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block font-body text-sm tracking-wide text-muted-foreground mb-2 uppercase">
                Email
              </label>
              <input
                type="email"
                required
                maxLength={255}
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-background border border-border font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
                placeholder="Your email"
              />
            </div>
          </div>
          <div>
            <label className="block font-body text-sm tracking-wide text-muted-foreground mb-2 uppercase">
              Design Idea
            </label>
            <textarea
              required
              maxLength={1000}
              rows={5}
              value={formData.designIdea}
              onChange={(e) => setFormData(prev => ({ ...prev, designIdea: e.target.value }))}
              className="w-full px-4 py-3 bg-background border border-border font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors resize-none"
              placeholder="Describe your dream crochet piece..."
            />
          </div>
          <div className="text-center pt-4">
            <button
              type="submit"
              className="yarn-button px-10 py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase border border-accent/30 hover:bg-primary/90 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
