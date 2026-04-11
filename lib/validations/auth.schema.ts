import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(8).max(255),
  rememberMe: z.boolean().optional(),
});

export const SignupSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(8).max(255),
  confirmPassword: z.string().min(8).max(255),
  full_name: z.string().min(1).max(100).optional(),
});

export const EmailResetSchema = z.object({
  email: z.string().email().min(1).max(255),
});

export const PasswordResetSchema = z.object({
  password: z.string().min(8).max(255),
  confirmPassword: z.string().min(8).max(255),
});

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  email_notifications_enabled: z.boolean().optional(),
  sms_notifications_enabled: z.boolean().optional(),
  marketing_emails_enabled: z.boolean().optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type SignupDto = z.infer<typeof SignupSchema>;
export type EmailResetDto = z.infer<typeof EmailResetSchema>;
export type PasswordResetDto = z.infer<typeof PasswordResetSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
