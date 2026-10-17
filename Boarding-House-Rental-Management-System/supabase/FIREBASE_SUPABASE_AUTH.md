# Legacy Firebase-to-Supabase bridge

This file documents the previous design, where Firebase Auth issued the tokens used to access selected Supabase features. That integration has been retired from the app.

The current design uses Supabase Auth for sign-in and Supabase Postgres/Storage for app data. Apply migration `20261015120000_supabase_auth_and_full_app.sql` after the earlier migrations to replace the Firebase-token policies. Firebase accounts and Firestore data are not imported or deleted.

Follow [SETUP.md](SETUP.md) to configure the Supabase project and provision the first owner account.
