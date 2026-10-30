/*
# Fix cirurgias table RLS recursion — cirurgia registration not saving

## Problem
The `cirurgias` table INSERT/UPDATE/DELETE policies check admin status via:
  EXISTS (SELECT 1 FROM perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')
This subquery on `perfis_usuario` triggers that table's own RLS policies, which themselves
contain a self-referencing EXISTS subquery — causing RLS recursion. PostgreSQL detects this
and blocks the INSERT, so saving a cirurgia silently fails.

## Solution
1. Create a `SECURITY DEFINER` function `is_admin()` that checks the current user's profile
   without being subject to RLS (SECURITY DEFINER runs as the function owner, which bypasses RLS).
2. Rewrite all four cirurgias policies to use `is_admin()` instead of the inline subquery.
3. Grant EXECUTE on `is_admin()` to `authenticated` only (the only role that needs it).
4. Reload PostgREST schema cache so the Data API picks up the function.

## Security
- `is_admin()` is SECURITY DEFINER, owned by `postgres` (bypasses RLS).
- It only returns a boolean — no data is leaked.
- EXECUTE is revoked from PUBLIC/anon and granted only to `authenticated`.
- cirurgias RLS remains enabled; SELECT is still open to all authenticated users.
- INSERT/UPDATE/DELETE still restricted to admin users only.
*/