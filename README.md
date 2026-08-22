# MIRA

An AI assistant with **native Sinhala language support**, built with React and
backed by Gemini and Groq. Most assistants treat Sinhala as an afterthought;
MIRA is designed around it.

## Features

- **Sinhala-first** — conversation, prompting and rendering built for Sinhala,
  with English supported alongside.
- **Multiple model backends** — Gemini and Groq, so you can trade latency
  against quality.
- **Web search** — optional retrieval via Brave Search or Serper.
- **Accounts** — Clerk, plus Google and GitHub OAuth.
- **Syntax-highlighted code** in responses.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind |
| State/data | TanStack Query |
| Auth | Clerk, Google & GitHub OAuth |
| AI | Google Gemini, Groq |
| Search | Brave Search API, Serper |
| Backend | Express, MongoDB |

## Getting started

**Prerequisites:** Node.js 20+, MongoDB, and keys for whichever providers you enable.

```bash
git clone https://github.com/ieeecsopen/Mira-chatbot
cd Mira-chatbot
npm install
```

`.env` for the frontend:

```ini
VITE_CLERK_PUBLISHABLE_KEY=<clerk publishable key>
```

`server/.env` for the backend:

```ini
API_PORT=3001
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=<mongodb connection string>
MONGODB_DB=mira
JWT_SECRET=<random 32+ char string>
GEMINI_API_KEY=<gemini key>
GROQ_API_KEY=<groq key>
GOOGLE_CLIENT_ID=<oauth client id>
GITHUB_CLIENT_ID=<oauth client id>
GITHUB_CLIENT_SECRET=<oauth client secret>
```

```bash
npm run dev        # frontend
npm run dev:api    # backend
npm run build
```

### A note on API keys

Earlier versions read `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`,
`VITE_BRAVE_API_KEY` and `VITE_SERPER_API_KEY` directly in the browser. **Any
`VITE_`-prefixed variable is compiled into the client bundle and is readable by
anyone who loads the page.** Those are billable keys, so provider calls belong
on the server, proxied through the Express API.

Migrating the remaining client-side provider calls behind the API is an open
task and a genuinely useful contribution.

## Project layout

```
src/
  components/   UI components
  contexts/     Providers (auth, chat)
  hooks/        Shared hooks
  pages/        Routed pages
  lib/          Clients and helpers
server/         Express API
docs/           Additional documentation
```

## Contributing

See [CONTRIBUTING.md](https://github.com/ieeecsopen/.github/blob/main/CONTRIBUTING.md).

Especially welcome: Sinhala language quality (prompting, tokenisation,
rendering), moving provider calls server-side, and tests.

## Licence

MIT — see [LICENSE](LICENSE).
