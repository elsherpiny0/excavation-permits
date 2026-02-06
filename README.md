# Excavation Permit Management System

A modern, full-stack permit management application built with React, Tailwind CSS, Supabase, and Cloudinary.

![React](https://img.shields.io/badge/React-18.2-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Files-f3e5ab)

## ✨ Features

- **🔐 Authentication** - Secure user login/signup with Supabase Auth
- **👥 Role-Based Access Control** - Super Admin and Staff roles with different permissions
- **📋 Permit Management** - Create, view, edit, and delete excavation permits
- **🔧 Dynamic Custom Fields** - Admin-configurable fields that appear in permit forms
- **📁 File Uploads** - Drag-and-drop file uploader with Cloudinary integration
- **🔍 Search & Filter** - Quick search and status filtering on the dashboard
- **📱 Responsive Design** - Modern, mobile-friendly UI with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Cloudinary account

### 1. Clone and Install

```bash
cd excavation-permits
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy your credentials

### 3. Configure Cloudinary

1. Log in to [Cloudinary Console](https://console.cloudinary.com)
2. Copy your **Cloud Name** from the dashboard
3. Go to **Settings → Upload → Upload Presets**
4. Create a new preset with **Signing Mode: Unsigned**
5. Copy the **Preset Name**

### 4. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 6. Create Super Admin

After signing up your first user:

1. Go to Supabase → SQL Editor
2. Run:
```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

## 📁 Project Structure

```
excavation-permits/
├── src/
│   ├── components/
│   │   ├── auth/           # Auth forms
│   │   ├── layout/         # Sidebar, Layout
│   │   └── permits/        # PermitForm, FileUploader
│   ├── contexts/           # AuthContext
│   ├── lib/                # Supabase & Cloudinary clients
│   ├── pages/              # Dashboard, SchemaEditor, UserManagement
│   ├── App.jsx             # Router and app wrapper
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind + custom styles
├── supabase/
│   └── schema.sql          # Database schema
└── .env.example            # Environment template
```

## 🔑 Role Permissions

| Feature | Super Admin | Staff |
|---------|-------------|-------|
| View all permits | ✅ | ✅ |
| Create permits | ✅ | ✅ |
| Edit own permits | ✅ | ✅ |
| Edit any permit | ✅ | ❌ |
| Delete permits | ✅ | ❌ |
| Schema Editor | ✅ | ❌ |
| User Management | ✅ | ❌ |

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **File Storage**: Cloudinary
- **Icons**: Lucide React
- **Notifications**: React Hot Toast


## 📝 License

MIT
