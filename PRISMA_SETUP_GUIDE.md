# PostgreSQL + Supabase + Prisma Setup Guide

## Step 1: Create Supabase Project

1. **Go to Supabase**
   - Visit https://supabase.com
   - Sign in or create an account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Fill in project details:
     - **Project Name**: `workflow-builder`
     - **Database Password**: (Generate a strong password and SAVE IT)
     - **Region**: Choose closest to you
     - **Pricing Plan**: Free tier is fine for development
   - Click "Create new project"
   - Wait 2-3 minutes for setup to complete

3. **Get Database Connection String**
   - Once project is ready, go to **Project Settings** (gear icon)
   - Click **Database** in the left sidebar
   - Scroll to **Connection String** section
   - Copy the **Connection pooling** URI (recommended for Prisma)
   - It looks like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Replace `[PASSWORD]` with your actual database password

## Step 2: Install Prisma

Run these commands in your project directory:

```bash
npm install prisma@5.22.0 @prisma/client@5.22.0
npm install -D prisma@5.22.0
```

**Note**: We're using Prisma 5.22.0 (stable version) instead of 7.x due to breaking changes in Prisma 7.

## Step 3: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Your database schema
- `.env` file (or updates existing one)

## Step 4: Configure Environment Variables

Add to your `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Important Notes:**
- `DATABASE_URL` uses port **6543** (connection pooling via PgBouncer)
- `DIRECT_URL` uses port **5432** (direct connection for migrations)
- Replace `[PROJECT-REF]` and `[PASSWORD]` with your actual values

## Step 5: Update Prisma Schema

The schema file has been created at `prisma/schema.prisma` with your models.

## Step 6: Generate Prisma Client

```bash
npx prisma generate
```

This creates the Prisma Client based on your schema.

## Step 7: Create Database Migration

```bash
npx prisma migrate dev --name init
```

This will:
- Create the migration files
- Apply the migration to your database
- Generate Prisma Client

**What this does:**
- Creates tables in your Supabase PostgreSQL database
- Creates `prisma/migrations/` folder with migration history
- Syncs your schema with the database

## Step 8: View Your Database (Optional)

```bash
npx prisma studio
```

This opens Prisma Studio in your browser where you can:
- View all tables
- Add/edit/delete records
- Test your database structure

## Step 9: Verify Setup

Check that everything is working:

```bash
# Check database connection
npx prisma db pull

# View current schema
npx prisma format
```

## Common Commands Reference

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

## Troubleshooting

### Error: "Can't reach database server"
- Check your `DATABASE_URL` is correct
- Verify your Supabase project is running
- Check your internet connection
- Ensure password doesn't contain special characters that need URL encoding

### Error: "Migration failed"
- Use `DIRECT_URL` for migrations (port 5432)
- Check Supabase project isn't paused (free tier pauses after inactivity)

### Error: "Prisma Client not generated"
- Run `npx prisma generate`
- Restart your dev server

## Next Steps

After setup is complete:
1. ✅ Database is created in Supabase
2. ✅ Prisma schema is defined
3. ✅ Migrations are applied
4. ✅ Prisma Client is generated

You can now:
- Create API routes to interact with the database
- Use Prisma Client in your Next.js app
- Add more models as needed

## Security Notes

- ✅ Never commit `.env.local` to git
- ✅ Use environment variables for all secrets
- ✅ Use connection pooling (`DATABASE_URL`) for app queries
- ✅ Use direct connection (`DIRECT_URL`) only for migrations
- ✅ Enable Row Level Security (RLS) in Supabase for production

## Supabase Dashboard Access

- **URL**: https://app.supabase.com
- **Database**: Project Settings → Database
- **Table Editor**: Click "Table Editor" to view tables
- **SQL Editor**: Run custom SQL queries
- **API**: Auto-generated REST and GraphQL APIs
