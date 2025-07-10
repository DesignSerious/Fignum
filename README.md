# Fignum - Patent Annotation Tool

Professional patent annotation tool for creating reference callouts and leader lines on patent figures.

## Features

- **Drag & Drop PDF Upload** - Import patent figures instantly
- **Professional Reference Lines** - Straight, curved, and S-curved leader lines
- **Smart Numbering** - Automatic reference number management
- **CSV Import** - Import reference lists from spreadsheets
- **Publication-Ready Export** - Export annotated PDFs for patents
- **User Authentication** - Secure user accounts with trial system
- **Project Management** - Save and organize your annotation projects

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new Supabase project at https://supabase.com
   - Copy your project URL and API keys
   - Create a `.env` file based on `.env.example`
   - Apply the database migration (see Database Setup below)

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Main app: http://localhost:5173
   - Admin panel: http://localhost:5173/admin.html

## Database Setup

Apply the database migration to your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration from `supabase/migrations/complete_setup.sql`
4. Click "Run" to execute

## Environment Variables

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Admin Panel

Access the admin panel at `/admin.html`:
- Username: `admin`
- Password: `fignum2024!`

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **PDF Processing:** PDF-lib + React-PDF
- **File Handling:** XLSX for spreadsheet import

## Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Supabase client and utilities
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main application component
```

## License

MIT License - see LICENSE file for details.