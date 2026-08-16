import { createAuthClient } from "better-auth/react";

// No baseURL — auth requests go to /api/auth/* on the same origin,
// which next.config.ts proxies through to the Railway API.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
