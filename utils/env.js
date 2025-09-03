// Lecture et validation des variables d'environnement (zod)
// Tous les commentaires et messages sont en français conformément aux consignes.
require('dotenv').config();

const { z } = require('zod');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((v) => (v ? Number(v) : 3000)).default('3000'),

  API_ORIGIN: z.string().url(),
  FRONTEND_ORIGIN: z.string().url(),
  BASE_URL: z.string().url(),

  MONGO_URI: z.string().min(1, 'MONGO_URI manquant'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET doit être défini (>=16 caractères)'),

  RATE_LIMIT_WINDOW_MS: z.string().transform((v) => Number(v)).default('60000'),
  RATE_LIMIT_MAX: z.string().transform((v) => Number(v)).default('50'),
  RATE_LIMIT_COOLDOWN_MS_USER: z
    .string()
    .transform((v) => Number(v))
    .default('10000'),

  MESSAGE_MAX_LEN: z.string().transform((v) => Number(v)).default('1000'),
  USERNAME_REGEX: z.string().default('^[a-z0-9_]{3,15}$'),

  WEB_PUSH_CONTACT: z.string().email().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  IP_SALT: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Afficher les erreurs de validation de manière compacte
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  // En production, on préfère échouer vite sur une configuration invalide.
  throw new Error(`Configuration d'environnement invalide: ${issues}`);
}

const env = parsed.data;

// Préparer des objets/utilitaires dérivés
const USERNAME_RE = new RegExp(env.USERNAME_REGEX, 'i');

module.exports = {
  env,
  USERNAME_RE,
};
