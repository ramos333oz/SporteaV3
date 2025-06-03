# Sportea Supabase Setup

This directory contains database migrations for the Sportea application.

## Database Schema

The Sportea application uses the following tables:

- `users` - User profiles linked to Supabase auth
- `sports` - Available sports for matches
- `locations` - Venues for sports matches
- `matches` - Sport matches created by users
- `participants` - Users participating in matches
- `ratings` - User ratings after matches
- `chats` - Chat rooms for matches
- `messages` - Messages in chat rooms
- `notifications` - User notifications

## Applying Migrations

There are two ways to apply these migrations to your Supabase project:

### Option 1: Using the Supabase Dashboard (Easiest)

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project: "Sporteav2"
3. Go to "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the contents of `migrations/001_initial_schema.sql` and paste it into the query editor
6. Click "Run" to execute the SQL commands

### Option 2: Using the Supabase CLI (Advanced)

If you prefer using the CLI:

1. Install the Supabase CLI if you haven't already:
   ```
   npm install -g supabase
   ```

2. Log in to Supabase:
   ```
   supabase login
   ```

3. Link your project:
   ```
   supabase link --project-ref fcwwuiitsghknsvnsrxp
   ```

4. Push the migrations:
   ```
   supabase db push
   ```

## Verification

After applying migrations, you can verify the setup by:

1. Going to the "Table Editor" in Supabase dashboard
2. Checking that all tables are created with the correct columns
3. Verifying that the default sports are inserted
4. Checking that RLS policies are applied correctly

## Using in the Application

The Sportea application is already configured to connect to your Supabase instance with the provided credentials in the `.env` file. The queries are implemented in `src/services/supabase.js`.

## Adding Test Data

You may want to add some test data to work with. Here's a simple SQL script to add a test location:

```sql
INSERT INTO locations (name, address, campus, coordinates, facilities, is_verified)
VALUES (
  'UiTM Shah Alam Basketball Court',
  'UiTM Shah Alam Campus, Section 1, 40450 Shah Alam, Selangor',
  'Shah Alam',
  '{"lat": 3.0731, "lng": 101.5068}',
  '{"courts": 2, "lighting": true, "restrooms": true, "water_fountains": true}',
  true
);
```

## Troubleshooting

If you encounter permission errors when querying tables, ensure that:

1. RLS policies are correctly set up
2. You're using an authenticated session when required
3. Your user has the necessary permissions for the operation

For additional help, consult the Supabase documentation at https://supabase.com/docs
