This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase

Copy `.env.example` to `.env.local` and set the Supabase project URL and anon
key. Use `src/lib/supabase/client.ts` in Client Components and
`src/lib/supabase/server.ts` in Server Components, Route Handlers, or Server
Actions. Never expose a `service_role` key to the browser.

Email/password sign-up and sign-in are available at `/register` and `/login`.
Configure email authentication in the Supabase dashboard. If email confirmation
is enabled, allow `http://localhost:3000/auth/callback` and the production
callback URL in Supabase's redirect URL settings.

### Google OAuth

Google sign-in is available from both `/login` and `/register`. The browser
starts OAuth through `supabase.auth.signInWithOAuth`; Supabase returns to
`/auth/callback`, where the authorization code is exchanged for a session.

To enable it:

1. In Google Cloud Console, create an OAuth client with type **Web application**.
2. Add your app origins as authorized JavaScript origins (for local development,
   `http://localhost:3000`).
3. In the Google OAuth client, add the callback URI shown by Supabase under
   **Authentication → Sign In / Providers → Google**. It is the Supabase Auth
   callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`), not the
   Next.js `/auth/callback` URL.
4. Enable Google under Supabase **Authentication → Sign In / Providers → Google**
   and enter the Google Client ID and Client Secret there.
5. In Supabase **Authentication → URL Configuration**, set the production site
   URL and allow `http://localhost:3000/auth/callback` plus the deployed app's
   `/auth/callback` URL. Add deployment preview callback URLs when testing
   previews.

The Google Client ID and Client Secret are configured in Supabase, not read by
the Next.js application. Do not expose the Client Secret or a Supabase
`service_role` key in client code. Session refresh for protected routes is
handled by the root `proxy.ts`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
