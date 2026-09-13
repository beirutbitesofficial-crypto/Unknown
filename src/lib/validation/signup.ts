import { z } from "zod";

export const signupSchema = z.object({
  ownerName: z.string().trim().min(2).max(100),
  businessName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  businessCategory: z.string().trim().min(2).max(80),
  preferredLanguage: z.enum(["AR", "EN"]),
  defaultCurrency: z.enum(["USD", "LBP"])
});

export type SignupInput = z.infer<typeof signupSchema>;
