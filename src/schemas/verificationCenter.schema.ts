import { z } from 'zod';
import { fieldErrorsFromZod } from '@/utils/zodFieldErrors';

export const verificationPersonalBasicSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required'),
  gender: z.string().trim().min(1, 'Gender is required'),
  nationality: z.string().trim().min(1, 'Nationality is required'),
});

export const verificationPersonalGovSchema = z.object({
  nationality: z.string().trim().min(1, 'Country of nationality is required'),
  idType: z.string().trim().min(1, 'ID type is required'),
  idNumber: z.string().trim().min(1, 'ID number is required'),
});

export const verificationLocationDraftSchema = z.object({
  country: z.string().trim().min(1, 'Country is required'),
  state: z.string().trim().min(1, 'State / region is required'),
  city: z.string().trim().min(1, 'City is required'),
  address: z.string().trim().min(1, 'Street address is required'),
});

function optionalProfileUrl(fieldLabel: string) {
  return z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (!val) return;
      const normalized = /^https?:\/\//i.test(val) ? val : `https://${val}`;
      try {
        const u = new URL(normalized);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          ctx.addIssue({ code: 'custom', message: `${fieldLabel} must use http or https` });
        }
      } catch {
        ctx.addIssue({ code: 'custom', message: `${fieldLabel} is not a valid URL` });
      }
    });
}

export const verificationSocialSchema = z.object({
  linkedin: optionalProfileUrl('LinkedIn URL'),
  twitter: optionalProfileUrl('X (Twitter) URL'),
  facebook: optionalProfileUrl('Facebook URL'),
  instagram: optionalProfileUrl('Instagram URL'),
  tiktok: optionalProfileUrl('TikTok URL'),
  snapchat: optionalProfileUrl('Snapchat URL'),
});

export type VerificationSocialInput = z.infer<typeof verificationSocialSchema>;

/** Prefix Zod field keys for Verification Center state, e.g. per_firstName */
export function prefixZodFieldErrors(prefix: string, error: z.ZodError): Record<string, string> {
  const raw = fieldErrorsFromZod(error);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[`${prefix}_${k}`] = v;
  }
  return out;
}
