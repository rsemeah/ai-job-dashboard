-- =============================================================================
-- 014_align_users_billing_contract.sql
-- HireWire – Align public.users to the app-canonical billing contract
--
-- WHY THIS EXISTS
-- ───────────────
-- The live public.users table was created with a different billing taxonomy
-- than what lib/contracts/hirewire.ts (and all app code) defines:
--
--   Live DB plan_type CHECK:           ('free','monthly','lifetime')
--   App canonical PlanType:            "free" | "pro" | "enterprise"
--
--   Live DB subscription_status CHECK: ('active','trial','canceled','expired')
--   App canonical SubscriptionStatus:  "active" | "canceled" | "past_due"
--                                      | "trialing" | "incomplete"
--                                      | "incomplete_expired"
--
-- CRITICAL ORDERING RULE:
--   CHECK constraints must be DROPPED before the data UPDATE that writes
--   values not in the old set. Writing 'trialing' while the old constraint
--   still requires 'trial' causes "violates check constraint" immediately.
--   Order is always: DROP constraint → UPDATE data → ADD new constraint.
--
-- SAFE TO RE-RUN: All steps use IF NOT EXISTS / DO $$ checks / DROP IF EXISTS.
-- Run in Supabase SQL Editor.
-- =============================================================================


-- =============================================================================
-- SECTION 1: PLAN TYPE
-- Order: DROP old constraint → UPDATE data → ADD new constraint
-- =============================================================================

-- 1a. Drop old CHECK first — must come BEFORE any UPDATE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_type_check;

-- 1b. Now safe to migrate legacy billing-period values to canonical tier names
UPDATE public.users
SET plan_type = 'pro'
WHERE plan_type IN ('monthly', 'lifetime');

-- 1c. Null-safe fallback: any value not in the new canonical set → 'free'
UPDATE public.users
SET plan_type = 'free'
WHERE plan_type NOT IN ('free', 'pro', 'enterprise');

-- 1d. Add canonical CHECK constraint
ALTER TABLE public.users
  ADD CONSTRAINT users_plan_type_check
  CHECK (plan_type IN ('free', 'pro', 'enterprise'));

-- 1e. Ensure NOT NULL + DEFAULT 'free'
ALTER TABLE public.users
  ALTER COLUMN plan_type SET NOT NULL,
  ALTER COLUMN plan_type SET DEFAULT 'free';


-- =============================================================================
-- SECTION 2: SUBSCRIPTION STATUS
-- Order: DROP old constraint → UPDATE data → ADD new constraint
-- =============================================================================

-- 2a. Drop old CHECK first — must come BEFORE any UPDATE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_status_check;

-- 2b. Now safe to migrate legacy values to Stripe canonical vocabulary
UPDATE public.users
SET subscription_status = 'trialing'
WHERE subscription_status = 'trial';

UPDATE public.users
SET subscription_status = 'incomplete_expired'
WHERE subscription_status = 'expired';

-- 2c. Null-safe fallback: unknown non-null values → NULL (unsubscribed)
UPDATE public.users
SET subscription_status = NULL
WHERE subscription_status IS NOT NULL
  AND subscription_status NOT IN (
    'active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'
  );

-- 2d. Add canonical CHECK constraint (NULL = not subscribed, always valid)
ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_status_check
  CHECK (
    subscription_status IN (
      'active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'
    )
    OR subscription_status IS NULL
  );

-- 2e. Remove the legacy DEFAULT 'trial' — NULL is the correct default (no subscription on signup)
ALTER TABLE public.users
  ALTER COLUMN subscription_status DROP DEFAULT;


-- =============================================================================
-- SECTION 3: ADD MISSING COLUMNS (all idempotent via IF NOT EXISTS)
-- =============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_period_end      TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_complete     BOOLEAN DEFAULT false;

-- updated_at: only add if not already present (live DB may already have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'updated_at'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_plan_type ON public.users (plan_type);


-- =============================================================================
-- SECTION 5: SIGNUP TRIGGER (idempotent via CREATE OR REPLACE + DROP IF EXISTS)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan_type, onboarding_complete)
  VALUES (NEW.id, NEW.email, 'free', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- SECTION 6: UPDATED_AT AUTO-TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
    CREATE TRIGGER users_set_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- =============================================================================
-- SECTION 7: RLS
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own"  ON public.users;
DROP POLICY IF EXISTS "users_update_own"  ON public.users;
DROP POLICY IF EXISTS "users_service_all" ON public.users;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_service_all" ON public.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- =============================================================================
-- SECTION 8: RELOAD POSTGREST SCHEMA CACHE
-- =============================================================================

NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- SECTION 9: VERIFICATION — expected output after successful run:
--   auth_user_count   = public_user_count  (all auth users have a public row)
--   invalid_plan_count   = 0
--   invalid_status_count = 0
--   constraint list shows canonical values for both checks
-- =============================================================================

SELECT
  (SELECT COUNT(*) FROM auth.users)   AS auth_user_count,
  (SELECT COUNT(*) FROM public.users) AS public_user_count,
  (SELECT COUNT(*) FROM public.users
     WHERE plan_type NOT IN ('free','pro','enterprise'))
                                       AS invalid_plan_count,
  (SELECT COUNT(*) FROM public.users
     WHERE subscription_status IS NOT NULL
       AND subscription_status NOT IN (
         'active','canceled','past_due','trialing','incomplete','incomplete_expired'
       ))                              AS invalid_status_count;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND contype  = 'c'
ORDER BY conname;
