'use client';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919999999999';
const WHATSAPP_MSG = encodeURIComponent('Hi! I need help with my Kaari order.');

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white
                 rounded-full px-4 py-3 shadow-lg hover:bg-[#128C7E] transition-all
                 md:px-5 md:py-3.5"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="hidden md:block text-sm font-medium whitespace-nowrap">
        Chat with us
      </span>
    </a>
  );
}
