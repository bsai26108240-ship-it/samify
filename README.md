# Samify — GenZ Music Player with Supabase Cloud Integration

A high-performance React + Vite music streaming application featuring precision scrubbing, real-time karaoke lyrics, Supabase Auth, and PostgreSQL cloud library synchronization.

---

## 🚀 Features

- 🎧 **Music Streaming & Queue**: Full player with playback queue, loop, shuffle, and smooth track transitions.
- 🎚️ **Hardware-Accurate Seeking**: Pointer-based scrubbing with drag locks preventing playback resets.
- 🎤 **Live Karaoke Lyrics**: Real-time scrolling and lyric highlighting with click-to-seek jump navigation.
- ☁️ **Supabase Cloud Sync**: Cloud-backed playlist management and liked songs persistence with Row Level Security.
- 🔒 **User Authentication**: Email/Password Sign Up & Log In with real-time auth state synchronization.
- 🎨 **Spotify-Inspired GenZ Dark UI**: Glassmorphic panels, ambient gradient lighting, custom equalizer logos, and responsive layouts.

---

## 🛠️ Tech Stack

- **Framework**: React 18, Vite 5
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS)

---

## 🚀 Step 1: Push Code to GitHub

```bash
# 1. Initialize Git repository
git init

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "feat: complete samify app with seeking fix, genz logo, karaoke lyrics & supabase cloud sync"

# 4. Set main branch
git branch -M main

# 5. Add remote repository (Replace YOUR_GITHUB_USERNAME with your actual GitHub handle)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/samify.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🌐 Step 2: Deploy to Vercel (Free Hosting)

1. Log in to [Vercel.com](https://vercel.com) using your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Select your **`samify`** repository from the import list.
4. Expand the **Environment Variables** section and add your Supabase credentials:

   | Key | Value |
   | :--- | :--- |
   | `VITE_SUPABASE_URL` | `https://brigerbdlrbqbbpymjsf.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_JUSCZiDvOTpdLUicvtu9Cg_qHm17-OI` |

5. Click **"Deploy"**.
6. Vercel will build your project in ~30 seconds and provide an HTTPS production URL (e.g., `https://samify.vercel.app`).

---

## 🔒 Step 3: Supabase Auth Redirect Configuration

To ensure user login and signup confirmation redirects work on your live URL:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** → **URL Configuration**.
3. Add your Vercel URL (e.g., `https://samify.vercel.app`) under **Site URL** and **Redirect URLs**.
