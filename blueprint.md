# **StreamX - Elite Live Streaming Platform (Supabase Integrated)**

## **Overview**
StreamX is a modern live streaming platform prototype now integrated with Supabase for real-time data persistence and authentication. It handles user profiles, live broadcast metadata, and instant chat messaging.

## **Core Features**
- **Authentication:** Powered by Supabase Auth. Supports detailed signup (Username, Email, Password).
- **Live Broadcasts:** Users can create streams stored in the `streams` table.
- **Real-time Chat:** Instant messaging using Supabase Realtime (Postgres Changes) and persistent storage in the `messages` table.
- **Profiles:** Automatic profile creation on signup using Postgres Triggers, tracking user Cash and metadata.
- **SPA Navigation:** Smooth view switching between Home, Live, Explore, and Player.

## **Database Schema (Supabase)**
- `profiles`: Stores user-specific data (id, username, cash, avatar).
- `streams`: Stores live and VOD session metadata (title, category, status).
- `messages`: Stores chat history for each stream.

## **Setup Instructions for Users**
1. **Supabase Project:** Create a new project at [supabase.com](https://supabase.com).
2. **Database:** Execute the contents of `supabase_schema.sql` in the Supabase SQL Editor to set up tables, RLS policies, and triggers.
3. **Frontend Configuration:**
   - Open `main.js`.
   - Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your project's API credentials.
4. **Authentication:** Ensure "Email Auth" is enabled in the Supabase dashboard.

## **Recent Changes**
- Removed all local placeholder data.
- Replaced local state persistence with Supabase SDK calls.
- Implemented real-time listener for chat messages.
- Renamed "별풍선" to "캐시" (Cash) and integrated with the profile system.
