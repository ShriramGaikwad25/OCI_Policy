# ISPM OCI Policy Optimization (Slim)

Slim copy of the KeyForge ISPM app with login and **Policy Optimization** only. Data is loaded from an external API — no Neo4j connection in this project.

| Route | Description |
|-------|-------------|
| `/login` | Sign-in page |
| `/oci-policy-analysis/policy-optimization` | Policy optimization (redundant/duplicate statements) |

After login, users land on **Policy Optimization**.

## Run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated users are sent to `/login`.

## Policy optimization API

The Next.js route `GET /api/oci-policy-optimization` proxies your backend. Configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `POLICY_OPTIMIZATION_API_URL` | Yes | Full URL to your policy optimization endpoint (e.g. `https://graph.keyforge.ai/ociservice/api/v1/ACMECOM/policy-optimization`) |
| `POLICY_OPTIMIZATION_API_KEY` | No | Static bearer token fallback; normally the logged-in user's JWT cookie is forwarded automatically |

### Expected API response

Your API can return either:

1. A JSON array of optimization rows, or
2. An object with a `rows` or `data` array.

Each row should match:

```json
{
  "policyName": "ExamplePolicy",
  "statement": "PS-001",
  "groupName": "Administrators",
  "owner": "admin@example.com",
  "action": "manage",
  "resource": "all-resources",
  "compartment": "tenancy",
  "condition": null,
  "optimizationType": "WITHIN_DUPLICATE",
  "reason": "Duplicate statement in same policy",
  "coveredByStatement": "PS-002",
  "recommendation": "Remove duplicate statement"
}
```

## Project location

Created from `../ispm-oci` at `../ispm-oci-slim`.
