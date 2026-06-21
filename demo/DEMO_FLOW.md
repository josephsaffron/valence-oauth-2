# 30-Minute Presenter Flow

## 0:00 - 3:00 Context

- Goal: same Brightspace endpoint, two auth models, one migration path.
- Explain why teams move away from ID/Key auth: key sprawl, rotation pain, standardization on OAuth2.

## 3:00 - 10:00 Legacy auth run

1. Open `.env` and point out `VALENCE_*` values.
2. Run `npm run demo:legacy`.
3. Explain nonce + timestamp + signature inputs and where attendees typically make mistakes.
4. Highlight complexity: auth logic is tightly coupled to request construction.

## 10:00 - 18:00 OAuth2 run

1. Show `OAUTH2_ACCESS_TOKEN` or token endpoint settings.
2. Run `npm run demo:oauth2`.
3. Explain bearer token model and scope-driven access.
4. Highlight simplification: auth detail is moved to token issuance and header.

## 18:00 - 25:00 Migration run

1. Run `npm run demo:migrate`.
2. Show that endpoint and response handling are unchanged.
3. Call out practical migration sequence:
   - add OAuth2 path
   - run in parallel
   - monitor
   - deprecate legacy

## 25:00 - 30:00 Q&A + next steps

- How to rotate credentials and tokens safely.
- How to choose scopes.
- How to do phased rollout in production.

## Fallback if live tenant fails

- Keep static examples of successful output from each command.
- Continue the workshop using printed request previews and migration summary output.
