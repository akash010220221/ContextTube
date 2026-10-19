import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/db"
import { users } from "@/db/schema"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        await db
          .insert(users)
          .values({
            id: user.id,
            name: user.name ?? null,
            email: user.email,
            image: user.image ?? null,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              name: user.name ?? null,
              email: user.email,
              image: user.image ?? null,
            },
          })
        return true
      } catch (error) {
        console.error("Error saving user during sign in:", error)
        return false
      }
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub
      }
      session.accessToken = token.accessToken
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
