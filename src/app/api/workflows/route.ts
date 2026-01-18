import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

// GET /api/workflows - Get all workflows for the current user
export async function GET() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })

        if (!user) {
            // Create user if doesn't exist (get email from Clerk if available)
            user = await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: `user-${userId}@temp.com`, // Temporary email
                    name: 'User',
                },
            })
        }

        // Get workflows with latest run
        const workflows = await prisma.workflowFile.findMany({
            where: { ownerId: user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                runs: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        })

        return NextResponse.json(workflows)
    } catch (error) {
        console.error('Error fetching workflows:', error)
        return NextResponse.json(
            { error: 'Failed to fetch workflows' },
            { status: 500 }
        )
    }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: Request) {
    try {
        const { userId } = await auth()

        if (!userId) {
            const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
            const hasPublishableKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

            // Check for session cookie
            const { cookies } = await import('next/headers');
            const cookieStore = await cookies();
            const hasSessionCookie = cookieStore.has('__session');

            console.log('Auth failed in POST /api/workflows. userId is null.');
            console.log('Environment Debug: CLERK_SECRET_KEY present:', hasSecretKey);
            return NextResponse.json({
                error: `Unauthorized: User ID not found. Debug: SecretKey=${hasSecretKey}, PubKey=${hasPublishableKey}, HasSessionCookie=${hasSessionCookie}`
            }, { status: 401 })
        }

        const body = await request.json()

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: `user-${userId}@temp.com`,
                    name: 'User',
                },
            })
        }

        // Create workflow
        const workflow = await prisma.workflowFile.create({
            data: {
                name: body.name || 'Untitled Workflow',
                ownerId: user.id,
                content: body.content || { nodes: [], edges: [] },
            },
        })

        return NextResponse.json(workflow)
    } catch (error) {
        console.error('Error creating workflow:', error)
        return NextResponse.json(
            { error: 'Failed to create workflow' },
            { status: 500 }
        )
    }
}
