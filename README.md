# Workflow Builder

A powerful, visual workflow automation tool built with Next.js. Create, execute, and monitor complex automation flows with a drag-and-drop interface.

## 🚀 Features

- **Visual Workflow Editor**: Intuitive drag-and-drop interface powered by ReactFlow.
- **AI Integration**: Leverage Google's Gemini AI for intelligent text and data processing.
- **Media Processing Capabilities**:
  - **Crop Image**: Advanced image cropping and manipulation.
  - **Extract Frame**: Extract specific frames from videos.
  - **Upload Support**: Seamless upload handling for Images and Videos using Uppy & Transloadit.
- **Robust Execution Engine**: Powered by Trigger.dev for reliable, background job execution.
- **Execution History**: Track detailed logs of workflow runs and individual node statuses.
- **Secure Authentication**: Integrated with Clerk for secure user management.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Background Jobs**: [Trigger.dev](https://trigger.dev/)
- **File Uploads**: [Uppy](https://uppy.io/) & [Transloadit](https://transloadit.com/)
- **AI**: [Google Generative AI](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v20 or higher
- **PostgreSQL**: A running instance of a PostgreSQL database

You will also need API keys for the following services:
- **Clerk** (Authentication)
- **Trigger.dev** (Workflow Execution)
- **Google Gemini API** (AI Features)
- **Transloadit** (Media Processing)

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/abhinavmishra97/workflow-builder.git
    cd workflow-builder
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory (copy from `.env.example` if available) and add the following keys:

    ```env
    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/workflow_db"

    # Clerk Auth
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...

    # Trigger.dev
    TRIGGER_SECRET_KEY=tr_dev_...
    NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY=tr_pub_...

    # Google AI
    GEMINI_API_KEY=...

    # Transloadit
    NEXT_PUBLIC_TRANSLOADIT_KEY=...
    TRANSLOADIT_SECRET=...
    NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID=...
    ```

4.  **Database Setup**
    Run the migrations to set up your database schema:
    ```bash
    npx prisma migrate dev
    ```

5.  **Start the Development Server**
    ```bash
    npm run dev
    ```

6.  **Start Trigger.dev Agent**
    In a separate terminal, run the Trigger.dev CLI to handle background tasks:
    ```bash
    npm run trigger:dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 Usage

1.  **Create a Workflow**: Navigate to the dashboard and create a new workflow file.
2.  **Add Nodes**: Drag nodes from the sidebar (Text, LLM, Crop Image, etc.) onto the canvas.
3.  **Connect Nodes**: Draw connections between nodes to define the data flow.
4.  **Configure**: Click on nodes to configure their specific settings (e.g., prompt for LLM, file for Upload).
5.  **Run**: Click the "Run" button to execute the workflow. You can view the real-time progress in the history panel.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
