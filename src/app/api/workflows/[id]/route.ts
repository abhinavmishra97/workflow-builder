import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from "next/server";

// GET /api/workflows/[id] - Get a specific workflow
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        const { id } = await context.params

        if (!userId) {  
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const workflow = await prisma.workflowFile.findFirst({
            where: {
                id: id,
                ownerId: user.id,
            },
            include: {
                runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        })

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
        }

        return NextResponse.json(workflow)
    } catch (error) {
        console.error('Error fetching workflow:', error)
        return NextResponse.json(
            { error: 'Failed to fetch workflow' },
            { status: 500 }
        )
    }
}

// PUT /api/workflows/[id] - Update a workflow
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        const { id } = await context.params

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const body = await request.json()

        // Verify ownership
        const existing = await prisma.workflowFile.findFirst({
            where: {
                id: id,
                ownerId: user.id,
            },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
        }

        // Update workflow
        const workflow = await prisma.workflowFile.update({
            where: { id: id },
            data: {
                name: body.name,
                content: body.content,
            },
        })

        return NextResponse.json(workflow)
    } catch (error) {
        console.error('Error updating workflow:', error)
        return NextResponse.json(
            { error: 'Failed to update workflow' },
            { status: 500 }
        )
    }
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        const { id } = await context.params

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Verify ownership
        const existing = await prisma.workflowFile.findFirst({
            where: {
                id: id,
                ownerId: user.id,
            },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
        }

        // Delete workflow (cascade will delete runs)
        await prisma.workflowFile.delete({
            where: { id: id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting workflow:', error)
        return NextResponse.json(
            { error: 'Failed to delete workflow' },
            { status: 500 }
        )
    }
}
