import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req) {
    try {
        const { name, email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
        }

        const hashed = await bcrypt.hash(password, 12)
        const user = await prisma.user.create({
            data: { email, password: hashed, name: name || null },
        })

        return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
    } catch (err) {
        console.error('[Register]', err)
        return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }
}