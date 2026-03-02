import { z } from 'zod';

export const ConversionInputSchema = z.object({
  conversionId: z.string(),
  type: z.string(),
  value: z.number().int().optional(),
  userId: z.string(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string()).default({}),
});

export type ConversionInput = z.infer<typeof ConversionInputSchema>;
