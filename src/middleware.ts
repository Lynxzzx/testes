import { withAuth } from "next-auth/middleware";

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "propostaai-prod-fallback-secret-configure-nextauth-secret";

export default withAuth({
  pages: { signIn: "/login" },
  secret: AUTH_SECRET,
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
