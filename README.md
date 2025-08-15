# BR70 - AI Video Asset Gallery

## Overview

BR70 is a sophisticated, web-based gallery designed to manage, display, and distribute AI-generated video assets for visual effects in film production. It provides an efficient and elegant workflow for VFX artists to browse, filter, group, sort, select, and download video assets for use in crowd simulations and other effects.

The application is built with a modern tech stack, focusing on a minimalist, performant, and highly intuitive user experience. It connects to a Supabase backend for data persistence, file storage, and user authentication.

---

## Features

-   **Elegant Floating UI:** A clean, professional interface with floating toolbars that keep the focus on the video content.
-   **Advanced Filtering:** Filter assets by Performance Actor, AI Actor, and Movement type.
-   **Flexible Grouping & Sorting:** Group the grid by any category and sort by various criteria like date or name.
-   **Multi-Select & Batch Actions:** Advanced selection using Shift/Ctrl/Cmd keys, with batch download and delete functionality.
-   **Seamless Preview Mode:** An integrated, animated preview mode for inspecting assets individually or in groups, with fit-to-screen and 100% zoom levels.
-   **Drag-to-Scroll:** Intuitive panning for oversized videos in 100% preview mode.
-   **Favorites System:** Mark key assets as favorites for quick access.
-   **Dynamic Management Hub:** A central place to manage filter categories (add, rename, delete) and user preferences.
-   **Workflow-Driven Uploads:** A powerful multi-batch upload system that allows organizing complex performance capture sessions in a single, intuitive interface.
-   **Supabase Integration:** All data, files, and user accounts are managed through a secure Supabase backend.
-   **Light & Dark Modes:** Fully themed for both light and dark preferences.

---

## Technology Stack

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Tailwind CSS
-   **Animation:** Framer Motion
-   **Icons:** Lucide React
-   **Backend:** Supabase (PostgreSQL Database, Storage, Auth)

---

## Setup & Installation

To run this project locally, you will need to set up a Supabase project and configure your environment variables.

### 1. Supabase Setup

1.  **Create a Supabase Project:** Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Run the SQL Schema:** In your new project's SQL Editor, run the provided `schema.sql` script to create the necessary tables (`videos`, `categories`), policies (RLS), and functions.
3.  **Create a Storage Bucket:** In the Storage section, create a new **public** bucket named `videos`.
4.  **Set Bucket Policies:** Manually add policies to the `videos` bucket to allow `SELECT` for everyone (`anon`) and `INSERT`, `UPDATE`, `DELETE` for authenticated users.
5.  **Create a User:** In the Authentication section, create at least one user for the application.

### 2. Local Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd [your-repo-name]
    ```

2.  **Install dependencies:**
    This project uses `es-modules-shims` and an import map, so no local `npm install` is required for the browser.

3.  **Configure Environment Variables:**
    -   Create a new file in the root of the project named `.env.local`.
    -   Copy the contents of `.env.example` into this new file.
    -   Go to your Supabase project's **Settings > API** page.
    -   Copy your **Project URL** and **anon (public) key** and paste them into your `.env.local` file.

    ```
    # .env.local
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL_HERE"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY_HERE"
    ```

4.  **Run the application:**
    Serve the `index.html` file using a local web server.

### 3. Deployment

The application is ready to be deployed on platforms like Vercel or Netlify.

1.  Push your code to a GitHub repository.
2.  Import the repository into your Vercel/Netlify account.
3.  Add your Supabase `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the deployment platform's settings.
4.  Deploy!
