# Whispr — Backend (Express.js)

Backend Express.js sécurisé conforme à la spécification fournie.

## Démarrage local

1. Copier `.env.example` en `.env` et remplir les variables (ne jamais committer les secrets).
2. Installer les dépendances :

```
bun install
# ou: npm install / yarn install / pnpm install
```

3. Lancer en dev :
```
bun run dev
# ou: npm run dev
```

4. Exécuter les tests :
```
bun run test
# ou: npm test
```

## Points clés

- Sécurité: Helmet (CSP stricte), CORS restreint au frontend, parsing JSON limité, logs Pino sans contenu en clair.
- Anti‑spam: honeypot, délai minimal (>700ms), cooldown (10s par IP+username), rate limit global et spécifique.
- Auth dashboard: token privé base64url(random(32)||HMAC(userId, JWT_SECRET)), stocké uniquement en hash Argon2id + prefix indexé.
- Web Push: activé si clés VAPID présentes. Envoi d’une notification sur réception d’un message.
- Modèles MongoDB: Users, Messages (TTL +7j), Subscriptions.
- Réponses standardisées: `{ ok: true, data }` / `{ ok: false, error: { code, message } }`.

## Endpoints (base: `/api`)

- `POST /users` → crée un utilisateur, renvoie `dashboard_token` UNE SEULE FOIS.
- `GET /users/:username/public` → bio, avatarUrl, coverUrl, theme.
- `POST /messages/:username` → envoi d’un message (validations + anti‑spam).
- `GET /dashboard/messages` (auth) → liste paginée + filtres.
- `PATCH /dashboard/messages/:id` (auth) → MAJ partielle flags.
- `DELETE /dashboard/messages/:id` (auth) → suppression.
- `GET /dashboard/stats?range=7d|30d` (auth) → séries par jour.
- `POST /push/subscribe` (auth) → enregistre abonnement Web Push.
- `POST /push/unsubscribe` (auth) → supprime abonnement.
- `GET /health` → healthcheck.

## Déploiement Render

Un exemple `render.yaml` est fourni. Service Node 18+, healthcheck `/api/health`. Renseigner les variables d’environnement dans le dashboard Render.

## Cloudinary

Aucune clé pour l’instant. Prévoir un flux signé côté serveur ultérieurement (placeholders).
