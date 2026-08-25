import { createAuthClient } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/client";

// No baseURL — auth requests go to /api/auth/* on the same origin,
// which next.config.ts proxies through to the Railway API. The Stripe client
// plugin adds authClient.subscription.{upgrade,cancel,billingPortal,list}.
export const authClient = createAuthClient({
  plugins: [stripeClient({ subscription: true })],
});

export const { signIn, signUp, signOut, useSession } = authClient;
