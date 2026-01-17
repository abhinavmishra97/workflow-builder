import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
