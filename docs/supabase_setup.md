# Supabase Auth Configuration Guide

This guide explains how to properly configure Supabase Authentication for the FPTU Student Guide MVP. Do not commit actual secrets to the repository.

## 1. Enable Email Provider
1. Go to your Supabase Project Dashboard.
2. Navigate to **Authentication** > **Providers**.
3. Under the **Email** section, ensure the provider is enabled.
4. Keep the **Confirm email** option enabled if you wish to enforce email verification, or turn it off for a more seamless demo experience.

## 2. Enable Google Provider (Google SSO)
1. In the Supabase Dashboard, go to **Authentication** > **Providers** > **Google**.
2. Toggle the **Enable Google** switch to ON.
3. You will need a **Client ID** and **Client Secret** from the Google Cloud Console.
   - Go to Google Cloud Console > APIs & Services > Credentials.
   - Create an OAuth 2.0 Client ID for a Web Application.
   - Add the Supabase callback URL in the **Authorized redirect URIs** section of Google Cloud:
     `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Copy the generated Client ID and Client Secret into the respective fields in the Supabase Google Provider settings.

## 3. Configure Redirect URLs
Supabase needs to know which local/remote URLs are safe to redirect back to. 
1. In the Supabase Dashboard, go to **Authentication** > **URL Configuration**.
2. Set the **Site URL** to your local development environment:
   `http://localhost:5173`
3. Under **Redirect URLs**, add the following exact paths to allow Supabase to return users safely:
   - `http://localhost:5173`
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/reset-password`

## 4. Frontend Environment Variables
In the `frontend` folder, copy `.env.example` to `.env.local` and add your project details:

```env
VITE_SUPABASE_URL=https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
```

> **Note**: These values are public to the browser, so it's safe to have them in `.env.local`, but do **not** commit `.env.local` to version control. Never expose your Service Role Key or Database Password here.
