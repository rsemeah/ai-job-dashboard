-- =============================================================================
-- 013_create_public_users_table.sql
-- HireWire – Create public.users table for plan/billing state
--
-- CANONICAL CONTRACT (lib/contracts/hirewire.ts):
--   plan_type           → 'free' | 'pro' | 'enterprise'
--   subscription_status → Stripe vocabulary: 'active' | 'canceled' | 'past_due'
--                         | 'trialing' | 'incomplete' | 'incomplete_expired' | NULL
--   stripe_customer_id  → Stripe cus_xxx ID
--   onboarding_complete → boolean, tracks onboarding flow completion
--
-- A trigger auto-creates a row in public.users for every new auth.users signup.
--
-- NOTE FOR EXISTING DEPLOYMENTS:
-- If public.users already exists with different CHECK constraints
-- (e.g. plan_type IN ('free','monthly','lifetime')), run
-- 014_align_users_billing_contract.sql INSTEAD to migrate the live data.
--
-- Run in Supabase SQL Editor.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Create the table (idempotent — no-op if table already exists)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id                     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  TEXT,
  plan_type              TEXT        NOT NULL DEFAULT 'free'
                           CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  subscription_status    TEXT
                           CHECK (
                             subscription_status IN (
                               'active', 'canceled', 'past_due', 'trialing',
                               'incomplete', 'incomplete_expired'
                             )
                             OR subscription_status IS NULL
                           ),
  stripe_customer_id     TEXT        UNIQUE,
  stripe_subscription_id TEXT,
  current_period_end     TIMESTAMPTZ,
  onboarding_complete    BOOLEAN     DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_plan_type ON public.users (plan_type);


-- -----------------------------------------------------------------------------
-- 3. Enable RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role (webhooks, server routes) can do anything
DROP POLICY IF EXISTS "users_service_all" ON public.users;
CREATE POLICY "users_service_all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 4. Auto-create row on auth.users insert (signup trigger)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan_type, onboarding_complete)
  VALUES (NEW.id, NEW.email, 'free', false)
  ON CONFLICT (id) DO NOTHING;  -- idempotent: no-op if row already exists
  RETURN NEW;
END;
$$;

-- Attach trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 5. Updated_at auto-update trigger
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 6. Backfill existing auth users (safe: ON CONFLICT DO NOTHING)
-- -----------------------------------------------------------------------------

INSERT INTO public.users (id, email, plan_type, onboarding_complete)
SELECT id, email, 'free', false
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Update email from auth for any existing rows missing it
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id
  AND (u.email IS NULL OR u.email = '');


-- -----------------------------------------------------------------------------
-- 7. Reload PostgREST schema cache
-- -----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';


-- -----------------------------------------------------------------------------
-- 8. Verification
-- -----------------------------------------------------------------------------

-- Expected: shows public.users with all rows backfilled
SELECT
  (SELECT COUNT(*) FROM auth.users)       AS auth_user_count,
  (SELECT COUNT(*) FROM public.users)     AS public_user_count,
  (SELECT COUNT(*) FROM public.users WHERE plan_type = 'free') AS free_count;
