-- Production history baseline through V94.1.
--
-- The existing project predates Supabase CLI migration tracking. This marker
-- establishes the forward-only boundary without replaying the legacy SQL in
-- docs/supabase or changing the already-live schema/data.

do $baseline$
begin
    null;
end
$baseline$;
