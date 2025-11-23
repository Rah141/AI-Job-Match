import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { NEXTAUTH_SECRET, NEXTAUTH_URL } from "@/lib/env"

export const authOptions: NextAuthOptions = {
    secret: NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null
                    }

                    const user = await prisma.user.findUnique({
                        where: {
                            email: credentials.email,
                        },
                    })

                    if (!user) {
                        return null
                    }

                    const isPasswordValid = await compare(
                        credentials.password,
                        user.password
                    )

                    if (!isPasswordValid) {
                        return null
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                    }
                } catch (error) {
                    // Authorization error - return null to indicate invalid credentials
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
    },
}
