// Validateurs zod et helpers de nettoyage
const { z } = require('zod');
const { env, USERNAME_RE } = require('./env');

const ThemeEnum = z.enum(['system', 'light', 'dark']).default('system');

const UsernameSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3)
      .max(15)
      .refine((s) => USERNAME_RE.test(s), { message: 'Nom d’utilisateur invalide' })
  );

const CreateUserSchema = z.object({
  username: UsernameSchema,
  bio: z.string().trim().max(500).optional().default(''),
  theme: ThemeEnum.optional().default('system'),
});

const PublicUserParamsSchema = z.object({
  username: UsernameSchema,
});

const CreateMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Le message ne peut pas être vide')
    .max(env.MESSAGE_MAX_LEN, `Le message dépasse ${env.MESSAGE_MAX_LEN} caractères`),
  hp: z.string().optional(),
  ts: z.number({ invalid_type_error: 'Horodatage ts requis' }),
});

const MessageParamsSchema = z.object({
  username: UsernameSchema,
});

const DashboardListQuerySchema = z.object({
  isRead: z.enum(['true', 'false']).optional(),
  isArchived: z.enum(['true', 'false']).optional(),
  isFavorite: z.enum(['true', 'false']).optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

const DashboardUpdateSchema = z
  .object({
    isRead: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Aucun champ à mettre à jour' });

const DashboardIdParamsSchema = z.object({ id: z.string().trim().min(1) });

const StatsQuerySchema = z.object({
  range: z.enum(['7d', '30d']).default('7d'),
});

const SubscriptionShape = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });
const PushSubscribeSchema = z.union([
  SubscriptionShape,
  z.object({ subscription: SubscriptionShape })
]);

const PushUnsubscribeSchema = z.object({ endpoint: z.string().url() });

module.exports = {
  ThemeEnum,
  UsernameSchema,
  CreateUserSchema,
  PublicUserParamsSchema,
  CreateMessageSchema,
  MessageParamsSchema,
  DashboardListQuerySchema,
  DashboardUpdateSchema,
  DashboardIdParamsSchema,
  StatsQuerySchema,
  PushSubscribeSchema,
  PushUnsubscribeSchema,
};
