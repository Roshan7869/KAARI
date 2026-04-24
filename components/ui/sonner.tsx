"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      richColors
      className="toaster group"
      toastOptions={{
        style: { fontFamily: 'Georgia, serif' },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#2d1b0e] group-[.toaster]:text-white group-[.toaster]:border-[#8b4513] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-amber-100",
          actionButton: "group-[.toast]:bg-[#8b4513] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-green-600",
          error: "group-[.toaster]:border-red-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, Sonner, toast };