# Brightspace Auth Workshop Demo

This project is a 30-minute workshop starter for showing how to move from legacy Valence ID/Key auth to OAuth2 for the same Brightspace API call.

## 30-minute agenda

- 0-5 min: Why auth model migration matters.
- 5-12 min: Legacy ID/Key signing walkthrough.
- 12-20 min: OAuth2 bearer token walkthrough.
- 20-27 min: Side-by-side migration run and cutover strategy.
- 27-30 min: Q&A.

## What this demo shows

- The same endpoint (`/d2l/api/lp/1.0/users/whoami`) called with two auth models.
- What changes during migration (auth construction).
- What does not change (endpoint path, payload handling, response parsing).
- How to run legacy and OAuth2 side-by-side during a phased cutover.

## How each auth model works

### Legacy ID/Key (Valence style)

1. Build signing inputs: app ID/key, user ID/key, nonce, timestamp.
2. Create a string to sign from method + path + nonce + timestamp.
3. Produce signature with HMAC-SHA256.
4. Add legacy auth values as request query parameters.

In this demo, you can inspect the exact `stringToSign`, signature, nonce, and timestamp so attendees can see each moving part.

### OAuth2

1. Obtain access token (preloaded env token or client credentials flow).
2. Send `Authorization: Bearer <token>` on the same API request.
3. Keep endpoint and response parsing unchanged.

In this demo, you can inspect token source metadata and request header preview.

For client credentials, this demo supports two client authentication methods:

- `client_secret_basic`: client ID + secret at token endpoint.
- `private_key_jwt`: signed client assertion JWT for tenants that require JWKS-backed clients.

If Brightspace app setup asks for a JWKS URL, choose `private_key_jwt` in your env config.

## Legacy vs OAuth2 at a glance

| Area | Legacy ID/Key | OAuth2 |
|---|---|---|
| Credential inputs | App key + user key pairs | Client credentials or pre-issued token |
| Per-request work | Build nonce/timestamp/signature each call | Attach bearer token |
| Rotation model | Key replacement and signing compatibility | Token expiry + refresh/reissue |
| Operational risk | Custom signing logic in app path | Standardized token lifecycle |
| Migration approach | Existing baseline | Introduce in parallel, then cut over |

## Quick start

1. Install Node.js 18+.
2. Create your env file.
3. Install dependencies.
4. Run the scripts.

```bash
cp .env.example .env
npm install
npm run demo:legacy
npm run demo:oauth2
npm run demo:migrate
```

If using JWKS/private_key_jwt, set `OAUTH2_CLIENT_AUTH_METHOD=private_key_jwt` and provide your private key path or PEM in `.env`.

## Create JWKS for Brightspace (private_key_jwt)

Generate a keypair and JWKS file:

```bash
npm run jwks:generate
```

Optional: generate with GitHub owner/repo metadata so the script prints your expected Pages URL:

```bash
node src/generate-jwks.js --githubOwner YOUR_GITHUB_USER --githubRepo YOUR_REPO_NAME
```

The script creates:

- `jwks/public/jwks.json` (safe to publish)
- `jwks/private/private-key.pem` (keep private, never commit)

Then update `.env`:

```bash
OAUTH2_CLIENT_AUTH_METHOD=private_key_jwt
OAUTH2_PRIVATE_KEY_PATH=/absolute/path/to/your/repo/jwks/private/private-key.pem
OAUTH2_PRIVATE_KEY_KID=<kid printed by script>
OAUTH2_PRIVATE_KEY_ALG=RS256
```

## Publish JWKS with GitHub Pages

1. Commit and push only `jwks/public/jwks.json`.
2. In your GitHub repo, open Settings -> Pages.
3. Under Build and deployment:
	- Source: Deploy from a branch
	- Branch: `main` (or your default branch)
	- Folder: `/ (root)`
4. Save and wait for Pages to publish.
5. Your JWKS URL will be:
	- `https://<github-user>.github.io/<repo-name>/jwks/public/jwks.json`
6. Paste that full URL into Brightspace app registration as the JWKS URL.

Quick check before pasting into Brightspace:

- Open the JWKS URL in browser and confirm it returns JSON with a `keys` array.
- Confirm `kid` in the JWKS matches `OAUTH2_PRIVATE_KEY_KID` in `.env`.

## Workshop flow (suggested)

- `npm run demo:legacy`: show legacy signing inputs and resulting headers.
- `npm run demo:oauth2`: show bearer token path.
- `npm run demo:migrate`: compare both auth strategies and run the same call path.

## Notes on legacy auth

This demo includes a transparent, workshop-friendly legacy signing implementation so attendees can understand what inputs are required (app ID/key + user ID/key + nonce + timestamp).

Exact signing details can vary by tenant integration history, so validate the signature process against your Brightspace tenant docs before production use.

## Files

- `src/legacy-auth.js`: legacy auth parameter and signature construction.
- `src/oauth2-auth.js`: OAuth2 token sourcing and bearer header.
- `src/api-client.js`: shared request client used by both auth strategies.
- `src/examples.js`: CLI entry point for live demo commands.
- `demo/DEMO_FLOW.md`: minute-by-minute presenter script and fallback plan.

## Migration checklist

- Confirm OAuth2 app registration in Brightspace tenant.
- Ensure scopes cover target endpoint.
- Run legacy and OAuth2 in parallel in non-prod.
- Add telemetry for auth errors and token expiry.
- Set deprecation date for ID/Key usage.

## Suggested migration rollout

1. Add OAuth2 path in code while keeping legacy path available.
2. Route a small percentage of non-production traffic through OAuth2.
3. Monitor auth failures, scope errors, and token expiry handling.
4. Expand OAuth2 traffic to full non-production, then production.
5. Remove legacy auth path after stable window and documented rollback expiry.
