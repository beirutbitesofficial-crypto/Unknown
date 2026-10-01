import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Ledgerly"),
  EMAIL_FROM: z.string().min(3),
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_SMTP_SECURE: z.coerce.boolean().default(false),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASS: z.string().optional(),
  WHISH_MERCHANT_RECIPIENT: z.string().optional(),
  WHISH_PAY_API_URL: z.preprocess((value) => value === "" ? undefined : value, z.url().optional()),
  WHISH_PAY_API_KEY: z.string().optional(),
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  WHATSAPP_CLOUD_ACCESS_TOKEN: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  WHATSAPP_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v21.0"),
  WHATSAPP_BOOKING_TEMPLATE: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  WHATSAPP_BOOKING_TEMPLATE_LANG: z.string().min(2).default("en")
});

export const env = envSchema.parse(process.env);
