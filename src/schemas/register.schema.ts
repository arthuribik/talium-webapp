import { z } from 'zod';

const passwordStrength = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number')
  .regex(/[@$!%*?&]/, 'Add a special character (@$!%*?&)');

export const registerSendCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .email('Enter a valid email address'),
});

export const registerVerifyCodeSchema = z.object({
  verificationCode: z
    .string()
    .length(6, 'Enter the complete 6-digit code')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const registerBasicDetailsSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  profession: z.string().trim().min(1, 'Professional / job title is required'),
  country: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const registerPasswordSchema = z
  .object({
    password: passwordStrength,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterBasicDetailsInput = z.infer<typeof registerBasicDetailsSchema>;
export type RegisterPasswordInput = z.infer<typeof registerPasswordSchema>;
