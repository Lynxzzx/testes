import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email e senha",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password;
      if (!email || !password) return null;

      await connectDB();
      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user || !user.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        image: user.image || null,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "propostaai-prod-fallback-secret-configure-nextauth-secret";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await connectDB();
        await User.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          {
            $setOnInsert: {
              email: user.email.toLowerCase(),
              name: user.name ?? "",
              provider: "google",
            },
            $set: { image: user.image ?? "" },
          },
          { upsert: true, new: true }
        );
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // No primeiro login, resolvemos o ID interno do MongoDB
      if (user) {
        if (account?.provider === "google") {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email?.toLowerCase() }).lean();
          if (dbUser) token.uid = dbUser._id.toString();
        } else {
          token.uid = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
};

export async function auth() {
  try {
    return await getServerSession(authOptions);
  } catch (err) {
    console.error("[auth] falha ao obter sessão:", err);
    return null;
  }
}

/** Retorna a sessão ou redireciona para o login (Server Components). */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}
