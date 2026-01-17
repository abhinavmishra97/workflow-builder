# Prisma Usage Guide

## Importing Prisma Client

```typescript
import prisma from '@/lib/prisma'
```

## Common Queries

### User Operations

```typescript
// Create user (when they sign up with Clerk)
const user = await prisma.user.create({
  data: {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0].emailAddress,
    name: clerkUser.fullName,
    imageUrl: clerkUser.imageUrl,
  },
})

// Find user by Clerk ID
const user = await prisma.user.findUnique({
  where: { clerkId: 'user_xxx' },
})

// Update user
const user = await prisma.user.update({
  where: { clerkId: 'user_xxx' },
  data: { name: 'New Name' },
})
```

### WorkflowFile Operations

```typescript
// Create workflow
const workflow = await prisma.workflowFile.create({
  data: {
    name: 'My Workflow',
    ownerId: user.id,
    content: {
      nodes: [],
      edges: [],
    },
  },
})

// Get all workflows for a user
const workflows = await prisma.workflowFile.findMany({
  where: { ownerId: user.id },
  orderBy: { updatedAt: 'desc' },
  include: {
    runs: {
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
  },
})

// Get single workflow with runs
const workflow = await prisma.workflowFile.findUnique({
  where: { id: workflowId },
  include: {
    owner: true,
    runs: {
      orderBy: { createdAt: 'desc' },
    },
  },
})

// Update workflow
const workflow = await prisma.workflowFile.update({
  where: { id: workflowId },
  data: {
    name: 'Updated Name',
    content: updatedContent,
  },
})

// Delete workflow
await prisma.workflowFile.delete({
  where: { id: workflowId },
})

// Search workflows
const workflows = await prisma.workflowFile.findMany({
  where: {
    ownerId: user.id,
    name: {
      contains: searchQuery,
      mode: 'insensitive',
    },
  },
})
```

### WorkflowRun Operations

```typescript
// Create run
const run = await prisma.workflowRun.create({
  data: {
    workflowId: workflow.id,
    status: 'running',
    scope: 'full',
  },
})

// Update run when completed
const run = await prisma.workflowRun.update({
  where: { id: runId },
  data: {
    status: 'completed',
    duration: 1500, // milliseconds
    results: {
      nodes: [
        { nodeId: 'node1', output: 'result', timestamp: new Date() },
      ],
    },
  },
})

// Get run history for a workflow
const runs = await prisma.workflowRun.findMany({
  where: { workflowId: workflow.id },
  orderBy: { createdAt: 'desc' },
  take: 10,
})

// Get failed runs
const failedRuns = await prisma.workflowRun.findMany({
  where: {
    workflowId: workflow.id,
    status: 'failed',
  },
  include: {
    workflow: true,
  },
})
```

## API Route Examples

### GET /api/workflows

```typescript
// src/app/api/workflows/route.ts
import { auth } from '@clerk/nextjs'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find user by Clerk ID
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get workflows
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
}
```

### POST /api/workflows

```typescript
export async function POST(request: Request) {
  const { userId } = auth()
  
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

  const workflow = await prisma.workflowFile.create({
    data: {
      name: body.name || 'Untitled',
      ownerId: user.id,
      content: body.content || {},
    },
  })

  return NextResponse.json(workflow)
}
```

### GET /api/workflows/[id]

```typescript
// src/app/api/workflows/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  const workflow = await prisma.workflowFile.findFirst({
    where: {
      id: params.id,
      ownerId: user?.id,
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
}
```

## Server Actions (Alternative to API Routes)

```typescript
// src/app/actions/workflows.ts
'use server'

import { auth } from '@clerk/nextjs'
import prisma from '@/lib/prisma'

export async function getWorkflows() {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) throw new Error('User not found')

  return await prisma.workflowFile.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function createWorkflow(name: string) {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) throw new Error('User not found')

  return await prisma.workflowFile.create({
    data: {
      name,
      ownerId: user.id,
    },
  })
}
```

## TypeScript Types

Prisma automatically generates types:

```typescript
import { User, WorkflowFile, WorkflowRun } from '@prisma/client'

// Type for workflow with runs
type WorkflowWithRuns = WorkflowFile & {
  runs: WorkflowRun[]
}

// Type for workflow with owner
type WorkflowWithOwner = WorkflowFile & {
  owner: User
}
```

## Best Practices

1. **Always use the singleton**: Import from `@/lib/prisma`
2. **Handle errors**: Wrap queries in try-catch
3. **Use transactions** for multiple related operations:
   ```typescript
   await prisma.$transaction([
     prisma.workflowFile.create({ data: {...} }),
     prisma.workflowRun.create({ data: {...} }),
   ])
   ```
4. **Optimize queries**: Use `select` to fetch only needed fields
5. **Use indexes**: Already defined in schema for common queries
6. **Validate input**: Always validate user input before database operations

## Migration Workflow

```bash
# After changing schema.prisma
npx prisma migrate dev --name describe_your_changes

# This will:
# 1. Create migration file
# 2. Apply to database
# 3. Regenerate Prisma Client
```

## Useful Commands

```bash
# Format schema
npx prisma format

# Validate schema
npx prisma validate

# View database in browser
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate client only
npx prisma generate
```
