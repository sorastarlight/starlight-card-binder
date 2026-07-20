drop extension if exists "pg_net";


  create table "public"."achievement_definitions" (
    "id" text not null,
    "name" text not null,
    "description" text not null,
    "icon" text not null default '✦'::text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true
      );


alter table "public"."achievement_definitions" enable row level security;


  create table "public"."booster_reward_cards" (
    "booster_id" text not null,
    "card_id" text not null,
    "quantity" integer not null default 1,
    "weight" numeric(12,4) not null default 1,
    "guaranteed" boolean not null default false,
    "sort_order" integer not null default 0
      );


alter table "public"."booster_reward_cards" enable row level security;


  create table "public"."booster_slot_rates" (
    "slot_id" bigint not null,
    "rarity" text not null,
    "percentage" numeric(7,4) not null,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."booster_slot_rates" enable row level security;


  create table "public"."booster_slots" (
    "id" bigint generated always as identity not null,
    "booster_id" text not null,
    "slot_key" text not null,
    "name" text not null,
    "quantity" integer not null default 1,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."booster_slots" enable row level security;


  create table "public"."booster_types" (
    "id" text not null,
    "name" text not null,
    "description" text,
    "star_bits_cost" integer not null default 0,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "pack_image_url" text,
    "card_back_url" text,
    "reward_mode" text not null default 'slots'::text,
    "series_id" text,
    "card_count" integer not null default 4,
    "bonus_star_bits" integer not null default 0,
    "archived" boolean not null default false,
    "event_id" text,
    "visible_from" timestamp with time zone,
    "visible_until" timestamp with time zone,
    "builder_mode" text not null default 'guided'::text,
    "odds_preset" text not null default 'standard'::text,
    "category_ids" text[] not null default '{}'::text[],
    "finish_ids" text[] not null default '{}'::text[],
    "exclude_promos" boolean not null default true,
    "allow_duplicates" boolean not null default true
      );


alter table "public"."booster_types" enable row level security;


  create table "public"."card_categories" (
    "id" text not null,
    "name" text not null,
    "description" text,
    "color" text not null default '#7ec8ff'::text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."card_categories" enable row level security;


  create table "public"."card_finishes" (
    "id" text not null,
    "name" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true
      );


alter table "public"."card_finishes" enable row level security;


  create table "public"."card_series" (
    "id" text not null,
    "name" text not null,
    "description" text,
    "booster_image_url" text,
    "sort_order" integer not null default 0,
    "is_visible" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."card_series" enable row level security;


  create table "public"."card_subcategories" (
    "id" text not null,
    "category_id" text,
    "name" text not null,
    "description" text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true
      );


alter table "public"."card_subcategories" enable row level security;


  create table "public"."card_tag_assignments" (
    "card_id" text not null,
    "tag_id" bigint not null
      );


alter table "public"."card_tag_assignments" enable row level security;


  create table "public"."card_tags" (
    "id" bigint generated always as identity not null,
    "name" text not null,
    "slug" text not null,
    "color" text not null default '#ff8fc7'::text
      );


alter table "public"."card_tags" enable row level security;


  create table "public"."card_variants" (
    "id" text not null,
    "name" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true
      );


alter table "public"."card_variants" enable row level security;


  create table "public"."cards" (
    "id" text not null,
    "series_id" text not null,
    "card_number" text not null,
    "name" text not null,
    "rarity" text not null,
    "image_url" text not null,
    "thumbnail_url" text,
    "description" text,
    "artist" text,
    "sort_order" integer not null default 0,
    "is_visible" boolean not null default true,
    "is_collectible" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "pull_weight" numeric(12,4) not null default 1,
    "is_pullable" boolean not null default true,
    "event_id" text,
    "is_event_exclusive" boolean not null default false,
    "category_id" text,
    "subcategory_id" text,
    "variant_id" text,
    "finish_id" text,
    "collector_number" text,
    "card_back_url" text,
    "distribution_type" text not null default 'booster_pull'::text,
    "is_promo" boolean not null default false,
    "available_from" timestamp with time zone,
    "available_until" timestamp with time zone,
    "publish_status" text not null default 'published'::text
      );


alter table "public"."cards" enable row level security;


  create table "public"."collection_imports" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "import_version" text not null,
    "import_hash" text not null,
    "imported_card_count" integer not null default 0,
    "imported_favorite_count" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."collection_imports" enable row level security;


  create table "public"."collector_titles" (
    "id" text not null,
    "name" text not null,
    "description" text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true
      );


alter table "public"."collector_titles" enable row level security;


  create table "public"."daily_booster_claims" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "claim_date" date not null,
    "cards_awarded" jsonb not null default '[]'::jsonb,
    "claimed_at" timestamp with time zone not null default now()
      );


alter table "public"."daily_booster_claims" enable row level security;


  create table "public"."event_achievements" (
    "id" bigint generated always as identity not null,
    "event_id" text not null,
    "achievement_key" text not null,
    "name" text not null,
    "description" text,
    "requirement_type" text not null default 'collect_event_cards'::text,
    "requirement_value" integer not null default 1,
    "reward_star_bits" integer not null default 0,
    "reward_title" text,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."event_achievements" enable row level security;


  create table "public"."notification_dismissals" (
    "user_id" uuid not null,
    "source_key" text not null,
    "dismissed_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_dismissals" enable row level security;


  create table "public"."notification_preferences" (
    "user_id" uuid not null,
    "daily_booster" boolean not null default true,
    "trade" boolean not null default true,
    "achievement" boolean not null default true,
    "reward" boolean not null default true,
    "event" boolean not null default true,
    "broadcast" boolean not null default true,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_preferences" enable row level security;


  create table "public"."profile_moderation_state" (
    "user_id" uuid not null,
    "profile_hidden" boolean not null default false,
    "profile_edit_locked" boolean not null default false,
    "reason" text,
    "updated_by" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profile_moderation_state" enable row level security;


  create table "public"."profile_reports" (
    "id" bigint generated always as identity not null,
    "reporter_user_id" uuid not null,
    "target_user_id" uuid not null,
    "category" text not null,
    "details" text not null,
    "status" text not null default 'open'::text,
    "assigned_to" uuid,
    "resolution_note" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone
      );


alter table "public"."profile_reports" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text not null,
    "display_name" text,
    "bio" text,
    "profile_visibility" text not null default 'public'::text,
    "onboarding_complete" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "show_collection_stats" boolean not null default true,
    "show_favorites" boolean not null default true,
    "show_featured_cards" boolean not null default true,
    "favorite_card_id" text,
    "avatar_url" text,
    "selected_title_id" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."received_rewards" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "source_type" text not null,
    "source_id" text,
    "title" text not null,
    "message" text,
    "reward_type" text not null,
    "reward_payload" jsonb not null default '{}'::jsonb,
    "status" text not null default 'pending'::text,
    "claimed_snapshot" jsonb,
    "available_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone,
    "claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "metadata" jsonb not null default '{}'::jsonb
      );


alter table "public"."received_rewards" enable row level security;


  create table "public"."reserved_usernames" (
    "username" text not null
      );


alter table "public"."reserved_usernames" enable row level security;


  create table "public"."reward_code_redemptions" (
    "id" bigint generated always as identity not null,
    "code_id" uuid not null,
    "user_id" uuid not null,
    "reward_snapshot" jsonb not null default '{}'::jsonb,
    "redeemed_at" timestamp with time zone not null default now()
      );


alter table "public"."reward_code_redemptions" enable row level security;


  create table "public"."reward_code_rewards" (
    "code_id" uuid not null,
    "reward_type" text not null,
    "card_id" text,
    "card_quantity" integer,
    "booster_card_ids" text[],
    "star_bits_amount" bigint,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."reward_code_rewards" enable row level security;


  create table "public"."reward_codes" (
    "id" uuid not null default gen_random_uuid(),
    "code_hash" text not null,
    "code_preview" text not null,
    "label" text not null,
    "active" boolean not null default true,
    "max_uses" integer,
    "current_uses" integer not null default 0,
    "starts_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."reward_codes" enable row level security;


  create table "public"."site_asset_manifest" (
    "path" text not null,
    "original_name" text,
    "mime_type" text,
    "file_size" bigint,
    "public_url" text not null,
    "folder" text,
    "uploaded_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "source_url" text
      );


alter table "public"."site_asset_manifest" enable row level security;


  create table "public"."site_roles" (
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "assigned_by" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."site_roles" enable row level security;


  create table "public"."site_settings" (
    "setting_key" text not null,
    "setting_value" jsonb not null,
    "updated_at" timestamp with time zone not null default now(),
    "updated_by" uuid
      );


alter table "public"."site_settings" enable row level security;


  create table "public"."staff_audit_log" (
    "id" bigint generated always as identity not null,
    "actor_user_id" uuid,
    "action" text not null,
    "target_user_id" uuid,
    "target_resource_type" text,
    "target_resource_id" text,
    "details" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."staff_audit_log" enable row level security;


  create table "public"."star_bits_booster_purchases" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "star_bits_cost" integer not null,
    "cards_awarded" jsonb not null default '[]'::jsonb,
    "purchased_at" timestamp with time zone not null default now(),
    "booster_id" text
      );


alter table "public"."star_bits_booster_purchases" enable row level security;


  create table "public"."star_bits_transactions" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "transaction_type" text not null,
    "star_bits_change" bigint not null,
    "card_id" text,
    "card_quantity_change" integer,
    "description" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."star_bits_transactions" enable row level security;


  create table "public"."star_bits_values" (
    "rarity" text not null,
    "bits_per_duplicate" integer not null
      );


alter table "public"."star_bits_values" enable row level security;


  create table "public"."starlight_events" (
    "id" text not null,
    "name" text not null,
    "description" text,
    "banner_image_url" text,
    "accent_color" text not null default '#ff82c8'::text,
    "start_at" timestamp with time zone not null,
    "end_at" timestamp with time zone not null,
    "is_active" boolean not null default true,
    "is_hidden" boolean not null default false,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."starlight_events" enable row level security;


  create table "public"."starlight_news_posts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "summary" text,
    "body" text,
    "image_url" text,
    "published_at" timestamp with time zone not null default now(),
    "is_published" boolean not null default true,
    "is_pinned" boolean not null default false,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."starlight_news_posts" enable row level security;


  create table "public"."trade_offer_items" (
    "offer_id" uuid not null,
    "side" text not null,
    "card_id" text not null,
    "quantity" integer not null
      );


alter table "public"."trade_offer_items" enable row level security;


  create table "public"."trade_offers" (
    "id" uuid not null default gen_random_uuid(),
    "proposer_id" uuid not null,
    "recipient_id" uuid not null,
    "status" text not null default 'pending'::text,
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "responded_at" timestamp with time zone
      );


alter table "public"."trade_offers" enable row level security;


  create table "public"."twitch_broadcaster_tokens" (
    "id" boolean not null default true,
    "twitch_user_id" text not null,
    "access_token" text not null,
    "refresh_token" text,
    "scopes" text[] not null default '{}'::text[],
    "expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."twitch_broadcaster_tokens" enable row level security;


  create table "public"."twitch_connections" (
    "user_id" uuid not null,
    "twitch_user_id" text not null,
    "twitch_login" text not null,
    "twitch_display_name" text,
    "twitch_avatar_url" text,
    "twitch_email" text,
    "scopes" text[] not null default '{}'::text[],
    "linked_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."twitch_connections" enable row level security;


  create table "public"."twitch_integration_config" (
    "id" boolean not null default true,
    "worker_base_url" text,
    "broadcaster_twitch_user_id" text,
    "broadcaster_login" text,
    "broadcaster_display_name" text,
    "broadcaster_avatar_url" text,
    "eventsub_status" text not null default 'not_configured'::text,
    "last_eventsub_sync_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now(),
    "updated_by" uuid,
    "redeems_enabled" boolean not null default true,
    "last_event_received_at" timestamp with time zone,
    "last_reward_delivery_at" timestamp with time zone
      );


alter table "public"."twitch_integration_config" enable row level security;


  create table "public"."twitch_oauth_states" (
    "state" text not null,
    "user_id" uuid,
    "flow_type" text not null,
    "return_url" text,
    "created_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null default (now() + '00:10:00'::interval)
      );


alter table "public"."twitch_oauth_states" enable row level security;


  create table "public"."twitch_reward_events" (
    "event_id" text not null,
    "event_type" text not null,
    "twitch_user_id" text,
    "twitch_login" text,
    "twitch_display_name" text,
    "twitch_reward_id" text,
    "payload" jsonb not null default '{}'::jsonb,
    "status" text not null default 'received'::text,
    "error_message" text,
    "received_at" timestamp with time zone not null default now(),
    "processed_at" timestamp with time zone
      );


alter table "public"."twitch_reward_events" enable row level security;


  create table "public"."twitch_reward_grants" (
    "id" bigint generated always as identity not null,
    "event_id" text,
    "rule_id" uuid,
    "user_id" uuid not null,
    "twitch_user_id" text,
    "reward_snapshot" jsonb not null,
    "source" text not null default 'twitch'::text,
    "granted_by" uuid,
    "granted_at" timestamp with time zone not null default now()
      );


alter table "public"."twitch_reward_grants" enable row level security;


  create table "public"."twitch_reward_rules" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "event_type" text not null,
    "twitch_reward_id" text,
    "reward_type" text not null,
    "star_bits_amount" bigint,
    "card_id" text,
    "card_quantity" integer,
    "booster_id" text,
    "cooldown_minutes" integer not null default 0,
    "max_claims_per_user" integer,
    "active" boolean not null default true,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."twitch_reward_rules" enable row level security;


  create table "public"."user_achievements" (
    "user_id" uuid not null,
    "achievement_id" text not null,
    "unlocked_at" timestamp with time zone not null default now()
      );


alter table "public"."user_achievements" enable row level security;


  create table "public"."user_card_preferences" (
    "user_id" uuid not null,
    "card_id" text not null,
    "wishlisted" boolean not null default false,
    "trade_quantity" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_card_preferences" enable row level security;


  create table "public"."user_cards" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "card_id" text not null,
    "quantity" integer not null default 1,
    "is_favorite" boolean not null default false,
    "first_obtained_at" timestamp with time zone not null default now(),
    "last_obtained_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_cards" enable row level security;


  create table "public"."user_notifications" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "notification_type" text not null default 'general'::text,
    "title" text not null,
    "body" text,
    "icon" text not null default '✦'::text,
    "route" text,
    "route_params" jsonb not null default '{}'::jsonb,
    "source_key" text,
    "is_read" boolean not null default false,
    "read_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_notifications" enable row level security;


  create table "public"."user_titles" (
    "user_id" uuid not null,
    "title_id" text not null,
    "unlocked_at" timestamp with time zone not null default now()
      );


alter table "public"."user_titles" enable row level security;


  create table "public"."user_trade_settings" (
    "user_id" uuid not null,
    "public_lists" boolean not null default true,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_trade_settings" enable row level security;


  create table "public"."user_wallets" (
    "user_id" uuid not null,
    "star_bits" bigint not null default 0,
    "lifetime_star_bits_earned" bigint not null default 0,
    "lifetime_star_bits_spent" bigint not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "collector_xp" bigint not null default 0
      );


alter table "public"."user_wallets" enable row level security;

CREATE UNIQUE INDEX achievement_definitions_pkey ON public.achievement_definitions USING btree (id);

CREATE UNIQUE INDEX booster_reward_cards_pkey ON public.booster_reward_cards USING btree (booster_id, card_id);

CREATE UNIQUE INDEX booster_slot_rates_pkey ON public.booster_slot_rates USING btree (slot_id, rarity);

CREATE UNIQUE INDEX booster_slots_booster_id_slot_key_key ON public.booster_slots USING btree (booster_id, slot_key);

CREATE UNIQUE INDEX booster_slots_pkey ON public.booster_slots USING btree (id);

CREATE INDEX booster_types_event_id_idx ON public.booster_types USING btree (event_id);

CREATE UNIQUE INDEX booster_types_pkey ON public.booster_types USING btree (id);

CREATE UNIQUE INDEX card_categories_name_key ON public.card_categories USING btree (name);

CREATE UNIQUE INDEX card_categories_pkey ON public.card_categories USING btree (id);

CREATE UNIQUE INDEX card_finishes_name_key ON public.card_finishes USING btree (name);

CREATE UNIQUE INDEX card_finishes_pkey ON public.card_finishes USING btree (id);

CREATE UNIQUE INDEX card_series_pkey ON public.card_series USING btree (id);

CREATE UNIQUE INDEX card_subcategories_category_id_name_key ON public.card_subcategories USING btree (category_id, name);

CREATE UNIQUE INDEX card_subcategories_pkey ON public.card_subcategories USING btree (id);

CREATE UNIQUE INDEX card_tag_assignments_pkey ON public.card_tag_assignments USING btree (card_id, tag_id);

CREATE UNIQUE INDEX card_tags_name_key ON public.card_tags USING btree (name);

CREATE UNIQUE INDEX card_tags_pkey ON public.card_tags USING btree (id);

CREATE UNIQUE INDEX card_tags_slug_key ON public.card_tags USING btree (slug);

CREATE UNIQUE INDEX card_variants_name_key ON public.card_variants USING btree (name);

CREATE UNIQUE INDEX card_variants_pkey ON public.card_variants USING btree (id);

CREATE INDEX cards_category_lookup_idx ON public.cards USING btree (category_id, series_id, rarity) WHERE (is_visible AND is_collectible);

CREATE INDEX cards_event_id_idx ON public.cards USING btree (event_id);

CREATE INDEX cards_finish_lookup_idx ON public.cards USING btree (finish_id, publish_status) WHERE is_pullable;

CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id);

CREATE INDEX cards_pull_pool_idx ON public.cards USING btree (is_pullable, rarity, series_id) WHERE (is_pullable = true);

CREATE INDEX cards_pull_pool_index ON public.cards USING btree (is_pullable, rarity, series_id) WHERE ((is_visible = true) AND (is_collectible = true));

CREATE UNIQUE INDEX cards_series_id_card_number_key ON public.cards USING btree (series_id, card_number);

CREATE INDEX cards_series_id_index ON public.cards USING btree (series_id);

CREATE INDEX cards_visible_series_sort_idx ON public.cards USING btree (is_visible, series_id, sort_order);

CREATE UNIQUE INDEX collection_imports_pkey ON public.collection_imports USING btree (id);

CREATE UNIQUE INDEX collection_imports_user_id_import_hash_key ON public.collection_imports USING btree (user_id, import_hash);

CREATE INDEX collection_imports_user_id_index ON public.collection_imports USING btree (user_id);

CREATE UNIQUE INDEX collector_titles_pkey ON public.collector_titles USING btree (id);

CREATE INDEX daily_booster_claims_claim_date_index ON public.daily_booster_claims USING btree (claim_date);

CREATE UNIQUE INDEX daily_booster_claims_pkey ON public.daily_booster_claims USING btree (id);

CREATE INDEX daily_booster_claims_user_date_idx ON public.daily_booster_claims USING btree (user_id, claim_date);

CREATE UNIQUE INDEX daily_booster_claims_user_id_claim_date_key ON public.daily_booster_claims USING btree (user_id, claim_date);

CREATE INDEX daily_booster_claims_user_id_index ON public.daily_booster_claims USING btree (user_id);

CREATE UNIQUE INDEX event_achievements_event_id_achievement_key_key ON public.event_achievements USING btree (event_id, achievement_key);

CREATE UNIQUE INDEX event_achievements_pkey ON public.event_achievements USING btree (id);

CREATE UNIQUE INDEX notification_dismissals_pkey ON public.notification_dismissals USING btree (user_id, source_key);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (user_id);

CREATE UNIQUE INDEX profile_moderation_state_pkey ON public.profile_moderation_state USING btree (user_id);

CREATE UNIQUE INDEX profile_reports_pkey ON public.profile_reports USING btree (id);

CREATE INDEX profile_reports_status_created_index ON public.profile_reports USING btree (status, created_at DESC);

CREATE INDEX profile_reports_target_index ON public.profile_reports USING btree (target_user_id, created_at DESC);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles USING btree (lower(username));

CREATE UNIQUE INDEX received_rewards_pkey ON public.received_rewards USING btree (id);

CREATE UNIQUE INDEX received_rewards_source_unique_idx ON public.received_rewards USING btree (user_id, source_type, source_id) WHERE (source_id IS NOT NULL);

CREATE INDEX received_rewards_user_status_idx ON public.received_rewards USING btree (user_id, status, created_at DESC);

CREATE UNIQUE INDEX reserved_usernames_pkey ON public.reserved_usernames USING btree (username);

CREATE UNIQUE INDEX reward_code_redemptions_code_id_user_id_key ON public.reward_code_redemptions USING btree (code_id, user_id);

CREATE UNIQUE INDEX reward_code_redemptions_pkey ON public.reward_code_redemptions USING btree (id);

CREATE INDEX reward_code_redemptions_user_index ON public.reward_code_redemptions USING btree (user_id);

CREATE UNIQUE INDEX reward_code_rewards_pkey ON public.reward_code_rewards USING btree (code_id);

CREATE INDEX reward_codes_active_index ON public.reward_codes USING btree (active);

CREATE UNIQUE INDEX reward_codes_code_hash_key ON public.reward_codes USING btree (code_hash);

CREATE UNIQUE INDEX reward_codes_pkey ON public.reward_codes USING btree (id);

CREATE INDEX site_asset_manifest_folder_idx ON public.site_asset_manifest USING btree (folder);

CREATE UNIQUE INDEX site_asset_manifest_pkey ON public.site_asset_manifest USING btree (path);

CREATE INDEX site_asset_manifest_source_url_idx ON public.site_asset_manifest USING btree (source_url) WHERE (source_url IS NOT NULL);

CREATE UNIQUE INDEX site_roles_pkey ON public.site_roles USING btree (user_id);

CREATE UNIQUE INDEX site_settings_pkey ON public.site_settings USING btree (setting_key);

CREATE INDEX staff_audit_log_actor_index ON public.staff_audit_log USING btree (actor_user_id);

CREATE INDEX staff_audit_log_created_at_index ON public.staff_audit_log USING btree (created_at DESC);

CREATE UNIQUE INDEX staff_audit_log_pkey ON public.staff_audit_log USING btree (id);

CREATE UNIQUE INDEX star_bits_booster_purchases_pkey ON public.star_bits_booster_purchases USING btree (id);

CREATE INDEX star_bits_booster_purchases_user_index ON public.star_bits_booster_purchases USING btree (user_id, purchased_at DESC);

CREATE UNIQUE INDEX star_bits_transactions_pkey ON public.star_bits_transactions USING btree (id);

CREATE INDEX star_bits_transactions_user_id_index ON public.star_bits_transactions USING btree (user_id);

CREATE UNIQUE INDEX star_bits_values_pkey ON public.star_bits_values USING btree (rarity);

CREATE INDEX starlight_events_active_dates_idx ON public.starlight_events USING btree (is_active, is_hidden, start_at, end_at);

CREATE UNIQUE INDEX starlight_events_pkey ON public.starlight_events USING btree (id);

CREATE UNIQUE INDEX starlight_news_posts_pkey ON public.starlight_news_posts USING btree (id);

CREATE INDEX starlight_news_public_idx ON public.starlight_news_posts USING btree (is_published, published_at DESC);

CREATE UNIQUE INDEX trade_offer_items_pkey ON public.trade_offer_items USING btree (offer_id, side, card_id);

CREATE UNIQUE INDEX trade_offers_pkey ON public.trade_offers USING btree (id);

CREATE INDEX trade_offers_proposer_idx ON public.trade_offers USING btree (proposer_id, created_at DESC);

CREATE INDEX trade_offers_recipient_idx ON public.trade_offers USING btree (recipient_id, created_at DESC);

CREATE INDEX trade_offers_status_idx ON public.trade_offers USING btree (status, created_at DESC);

CREATE UNIQUE INDEX twitch_broadcaster_tokens_pkey ON public.twitch_broadcaster_tokens USING btree (id);

CREATE INDEX twitch_connections_login_idx ON public.twitch_connections USING btree (lower(twitch_login));

CREATE UNIQUE INDEX twitch_connections_pkey ON public.twitch_connections USING btree (user_id);

CREATE UNIQUE INDEX twitch_connections_twitch_user_id_key ON public.twitch_connections USING btree (twitch_user_id);

CREATE UNIQUE INDEX twitch_integration_config_pkey ON public.twitch_integration_config USING btree (id);

CREATE UNIQUE INDEX twitch_oauth_states_pkey ON public.twitch_oauth_states USING btree (state);

CREATE UNIQUE INDEX twitch_reward_events_pkey ON public.twitch_reward_events USING btree (event_id);

CREATE INDEX twitch_reward_events_received_idx ON public.twitch_reward_events USING btree (received_at DESC);

CREATE INDEX twitch_reward_events_status_received_idx ON public.twitch_reward_events USING btree (status, received_at DESC);

CREATE INDEX twitch_reward_events_viewer_received_idx ON public.twitch_reward_events USING btree (lower(twitch_login), received_at DESC);

CREATE UNIQUE INDEX twitch_reward_grants_pkey ON public.twitch_reward_grants USING btree (id);

CREATE INDEX twitch_reward_grants_rule_idx ON public.twitch_reward_grants USING btree (rule_id, user_id, granted_at DESC);

CREATE INDEX twitch_reward_grants_user_idx ON public.twitch_reward_grants USING btree (user_id, granted_at DESC);

CREATE INDEX twitch_reward_rules_lookup_idx ON public.twitch_reward_rules USING btree (event_type, twitch_reward_id) WHERE (active = true);

CREATE UNIQUE INDEX twitch_reward_rules_pkey ON public.twitch_reward_rules USING btree (id);

CREATE UNIQUE INDEX user_achievements_pkey ON public.user_achievements USING btree (user_id, achievement_id);

CREATE UNIQUE INDEX user_card_preferences_pkey ON public.user_card_preferences USING btree (user_id, card_id);

CREATE INDEX user_cards_card_id_index ON public.user_cards USING btree (card_id);

CREATE UNIQUE INDEX user_cards_pkey ON public.user_cards USING btree (id);

CREATE UNIQUE INDEX user_cards_user_id_card_id_key ON public.user_cards USING btree (user_id, card_id);

CREATE INDEX user_cards_user_id_index ON public.user_cards USING btree (user_id);

CREATE INDEX user_cards_user_quantity_idx ON public.user_cards USING btree (user_id, quantity);

CREATE UNIQUE INDEX user_notifications_pkey ON public.user_notifications USING btree (id);

CREATE UNIQUE INDEX user_notifications_source_unique_idx ON public.user_notifications USING btree (user_id, source_key) WHERE (source_key IS NOT NULL);

CREATE INDEX user_notifications_user_created_idx ON public.user_notifications USING btree (user_id, created_at DESC);

CREATE INDEX user_notifications_user_unread_idx ON public.user_notifications USING btree (user_id, is_read, created_at DESC);

CREATE UNIQUE INDEX user_titles_pkey ON public.user_titles USING btree (user_id, title_id);

CREATE UNIQUE INDEX user_trade_settings_pkey ON public.user_trade_settings USING btree (user_id);

CREATE UNIQUE INDEX user_wallets_pkey ON public.user_wallets USING btree (user_id);

alter table "public"."achievement_definitions" add constraint "achievement_definitions_pkey" PRIMARY KEY using index "achievement_definitions_pkey";

alter table "public"."booster_reward_cards" add constraint "booster_reward_cards_pkey" PRIMARY KEY using index "booster_reward_cards_pkey";

alter table "public"."booster_slot_rates" add constraint "booster_slot_rates_pkey" PRIMARY KEY using index "booster_slot_rates_pkey";

alter table "public"."booster_slots" add constraint "booster_slots_pkey" PRIMARY KEY using index "booster_slots_pkey";

alter table "public"."booster_types" add constraint "booster_types_pkey" PRIMARY KEY using index "booster_types_pkey";

alter table "public"."card_categories" add constraint "card_categories_pkey" PRIMARY KEY using index "card_categories_pkey";

alter table "public"."card_finishes" add constraint "card_finishes_pkey" PRIMARY KEY using index "card_finishes_pkey";

alter table "public"."card_series" add constraint "card_series_pkey" PRIMARY KEY using index "card_series_pkey";

alter table "public"."card_subcategories" add constraint "card_subcategories_pkey" PRIMARY KEY using index "card_subcategories_pkey";

alter table "public"."card_tag_assignments" add constraint "card_tag_assignments_pkey" PRIMARY KEY using index "card_tag_assignments_pkey";

alter table "public"."card_tags" add constraint "card_tags_pkey" PRIMARY KEY using index "card_tags_pkey";

alter table "public"."card_variants" add constraint "card_variants_pkey" PRIMARY KEY using index "card_variants_pkey";

alter table "public"."cards" add constraint "cards_pkey" PRIMARY KEY using index "cards_pkey";

alter table "public"."collection_imports" add constraint "collection_imports_pkey" PRIMARY KEY using index "collection_imports_pkey";

alter table "public"."collector_titles" add constraint "collector_titles_pkey" PRIMARY KEY using index "collector_titles_pkey";

alter table "public"."daily_booster_claims" add constraint "daily_booster_claims_pkey" PRIMARY KEY using index "daily_booster_claims_pkey";

alter table "public"."event_achievements" add constraint "event_achievements_pkey" PRIMARY KEY using index "event_achievements_pkey";

alter table "public"."notification_dismissals" add constraint "notification_dismissals_pkey" PRIMARY KEY using index "notification_dismissals_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."profile_moderation_state" add constraint "profile_moderation_state_pkey" PRIMARY KEY using index "profile_moderation_state_pkey";

alter table "public"."profile_reports" add constraint "profile_reports_pkey" PRIMARY KEY using index "profile_reports_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."received_rewards" add constraint "received_rewards_pkey" PRIMARY KEY using index "received_rewards_pkey";

alter table "public"."reserved_usernames" add constraint "reserved_usernames_pkey" PRIMARY KEY using index "reserved_usernames_pkey";

alter table "public"."reward_code_redemptions" add constraint "reward_code_redemptions_pkey" PRIMARY KEY using index "reward_code_redemptions_pkey";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_pkey" PRIMARY KEY using index "reward_code_rewards_pkey";

alter table "public"."reward_codes" add constraint "reward_codes_pkey" PRIMARY KEY using index "reward_codes_pkey";

alter table "public"."site_asset_manifest" add constraint "site_asset_manifest_pkey" PRIMARY KEY using index "site_asset_manifest_pkey";

alter table "public"."site_roles" add constraint "site_roles_pkey" PRIMARY KEY using index "site_roles_pkey";

alter table "public"."site_settings" add constraint "site_settings_pkey" PRIMARY KEY using index "site_settings_pkey";

alter table "public"."staff_audit_log" add constraint "staff_audit_log_pkey" PRIMARY KEY using index "staff_audit_log_pkey";

alter table "public"."star_bits_booster_purchases" add constraint "star_bits_booster_purchases_pkey" PRIMARY KEY using index "star_bits_booster_purchases_pkey";

alter table "public"."star_bits_transactions" add constraint "star_bits_transactions_pkey" PRIMARY KEY using index "star_bits_transactions_pkey";

alter table "public"."star_bits_values" add constraint "star_bits_values_pkey" PRIMARY KEY using index "star_bits_values_pkey";

alter table "public"."starlight_events" add constraint "starlight_events_pkey" PRIMARY KEY using index "starlight_events_pkey";

alter table "public"."starlight_news_posts" add constraint "starlight_news_posts_pkey" PRIMARY KEY using index "starlight_news_posts_pkey";

alter table "public"."trade_offer_items" add constraint "trade_offer_items_pkey" PRIMARY KEY using index "trade_offer_items_pkey";

alter table "public"."trade_offers" add constraint "trade_offers_pkey" PRIMARY KEY using index "trade_offers_pkey";

alter table "public"."twitch_broadcaster_tokens" add constraint "twitch_broadcaster_tokens_pkey" PRIMARY KEY using index "twitch_broadcaster_tokens_pkey";

alter table "public"."twitch_connections" add constraint "twitch_connections_pkey" PRIMARY KEY using index "twitch_connections_pkey";

alter table "public"."twitch_integration_config" add constraint "twitch_integration_config_pkey" PRIMARY KEY using index "twitch_integration_config_pkey";

alter table "public"."twitch_oauth_states" add constraint "twitch_oauth_states_pkey" PRIMARY KEY using index "twitch_oauth_states_pkey";

alter table "public"."twitch_reward_events" add constraint "twitch_reward_events_pkey" PRIMARY KEY using index "twitch_reward_events_pkey";

alter table "public"."twitch_reward_grants" add constraint "twitch_reward_grants_pkey" PRIMARY KEY using index "twitch_reward_grants_pkey";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_pkey" PRIMARY KEY using index "twitch_reward_rules_pkey";

alter table "public"."user_achievements" add constraint "user_achievements_pkey" PRIMARY KEY using index "user_achievements_pkey";

alter table "public"."user_card_preferences" add constraint "user_card_preferences_pkey" PRIMARY KEY using index "user_card_preferences_pkey";

alter table "public"."user_cards" add constraint "user_cards_pkey" PRIMARY KEY using index "user_cards_pkey";

alter table "public"."user_notifications" add constraint "user_notifications_pkey" PRIMARY KEY using index "user_notifications_pkey";

alter table "public"."user_titles" add constraint "user_titles_pkey" PRIMARY KEY using index "user_titles_pkey";

alter table "public"."user_trade_settings" add constraint "user_trade_settings_pkey" PRIMARY KEY using index "user_trade_settings_pkey";

alter table "public"."user_wallets" add constraint "user_wallets_pkey" PRIMARY KEY using index "user_wallets_pkey";

alter table "public"."booster_reward_cards" add constraint "booster_reward_cards_booster_id_fkey" FOREIGN KEY (booster_id) REFERENCES public.booster_types(id) ON DELETE CASCADE not valid;

alter table "public"."booster_reward_cards" validate constraint "booster_reward_cards_booster_id_fkey";

alter table "public"."booster_reward_cards" add constraint "booster_reward_cards_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE not valid;

alter table "public"."booster_reward_cards" validate constraint "booster_reward_cards_card_id_fkey";

alter table "public"."booster_reward_cards" add constraint "booster_reward_cards_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 50))) not valid;

alter table "public"."booster_reward_cards" validate constraint "booster_reward_cards_quantity_check";

alter table "public"."booster_reward_cards" add constraint "booster_reward_cards_weight_check" CHECK ((weight >= (0)::numeric)) not valid;

alter table "public"."booster_reward_cards" validate constraint "booster_reward_cards_weight_check";

alter table "public"."booster_slot_rates" add constraint "booster_slot_rates_percentage_check" CHECK (((percentage >= (0)::numeric) AND (percentage <= (100)::numeric))) not valid;

alter table "public"."booster_slot_rates" validate constraint "booster_slot_rates_percentage_check";

alter table "public"."booster_slot_rates" add constraint "booster_slot_rates_rarity_check" CHECK ((rarity = ANY (ARRAY['Common'::text, 'Uncommon'::text, 'Rare'::text, 'Epic'::text, 'Legendary'::text]))) not valid;

alter table "public"."booster_slot_rates" validate constraint "booster_slot_rates_rarity_check";

alter table "public"."booster_slot_rates" add constraint "booster_slot_rates_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES public.booster_slots(id) ON DELETE CASCADE not valid;

alter table "public"."booster_slot_rates" validate constraint "booster_slot_rates_slot_id_fkey";

alter table "public"."booster_slots" add constraint "booster_slots_booster_id_fkey" FOREIGN KEY (booster_id) REFERENCES public.booster_types(id) ON DELETE CASCADE not valid;

alter table "public"."booster_slots" validate constraint "booster_slots_booster_id_fkey";

alter table "public"."booster_slots" add constraint "booster_slots_booster_id_slot_key_key" UNIQUE using index "booster_slots_booster_id_slot_key_key";

alter table "public"."booster_slots" add constraint "booster_slots_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 20))) not valid;

alter table "public"."booster_slots" validate constraint "booster_slots_quantity_check";

alter table "public"."booster_types" add constraint "booster_types_builder_mode_check" CHECK ((builder_mode = ANY (ARRAY['guided'::text, 'advanced'::text]))) not valid;

alter table "public"."booster_types" validate constraint "booster_types_builder_mode_check";

alter table "public"."booster_types" add constraint "booster_types_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.starlight_events(id) ON DELETE SET NULL not valid;

alter table "public"."booster_types" validate constraint "booster_types_event_id_fkey";

alter table "public"."booster_types" add constraint "booster_types_reward_mode_check" CHECK ((reward_mode = ANY (ARRAY['slots'::text, 'series'::text, 'exact'::text, 'weighted_pool'::text, 'single'::text, 'mixed'::text]))) not valid;

alter table "public"."booster_types" validate constraint "booster_types_reward_mode_check";

alter table "public"."booster_types" add constraint "booster_types_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public.card_series(id) ON DELETE SET NULL not valid;

alter table "public"."booster_types" validate constraint "booster_types_series_id_fkey";

alter table "public"."booster_types" add constraint "booster_types_star_bits_cost_check" CHECK ((star_bits_cost >= 0)) not valid;

alter table "public"."booster_types" validate constraint "booster_types_star_bits_cost_check";

alter table "public"."card_categories" add constraint "card_categories_name_key" UNIQUE using index "card_categories_name_key";

alter table "public"."card_finishes" add constraint "card_finishes_name_key" UNIQUE using index "card_finishes_name_key";

alter table "public"."card_subcategories" add constraint "card_subcategories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.card_categories(id) ON DELETE CASCADE not valid;

alter table "public"."card_subcategories" validate constraint "card_subcategories_category_id_fkey";

alter table "public"."card_subcategories" add constraint "card_subcategories_category_id_name_key" UNIQUE using index "card_subcategories_category_id_name_key";

alter table "public"."card_tag_assignments" add constraint "card_tag_assignments_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE not valid;

alter table "public"."card_tag_assignments" validate constraint "card_tag_assignments_card_id_fkey";

alter table "public"."card_tag_assignments" add constraint "card_tag_assignments_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.card_tags(id) ON DELETE CASCADE not valid;

alter table "public"."card_tag_assignments" validate constraint "card_tag_assignments_tag_id_fkey";

alter table "public"."card_tags" add constraint "card_tags_name_key" UNIQUE using index "card_tags_name_key";

alter table "public"."card_tags" add constraint "card_tags_slug_key" UNIQUE using index "card_tags_slug_key";

alter table "public"."card_variants" add constraint "card_variants_name_key" UNIQUE using index "card_variants_name_key";

alter table "public"."cards" add constraint "cards_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.card_categories(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_category_id_fkey";

alter table "public"."cards" add constraint "cards_distribution_type_check" CHECK ((distribution_type = ANY (ARRAY['booster_pull'::text, 'redeem_code'::text, 'twitch_reward'::text, 'event_reward'::text, 'admin_gift'::text, 'promo'::text, 'special'::text]))) not valid;

alter table "public"."cards" validate constraint "cards_distribution_type_check";

alter table "public"."cards" add constraint "cards_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.starlight_events(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_event_id_fkey";

alter table "public"."cards" add constraint "cards_finish_id_fkey" FOREIGN KEY (finish_id) REFERENCES public.card_finishes(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_finish_id_fkey";

alter table "public"."cards" add constraint "cards_publish_status_check" CHECK ((publish_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."cards" validate constraint "cards_publish_status_check";

alter table "public"."cards" add constraint "cards_pull_weight_check" CHECK ((pull_weight >= (0)::numeric)) not valid;

alter table "public"."cards" validate constraint "cards_pull_weight_check";

alter table "public"."cards" add constraint "cards_rarity_check" CHECK ((rarity = ANY (ARRAY['Common'::text, 'Uncommon'::text, 'Rare'::text, 'Epic'::text, 'Legendary'::text]))) not valid;

alter table "public"."cards" validate constraint "cards_rarity_check";

alter table "public"."cards" add constraint "cards_series_id_card_number_key" UNIQUE using index "cards_series_id_card_number_key";

alter table "public"."cards" add constraint "cards_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public.card_series(id) ON DELETE RESTRICT not valid;

alter table "public"."cards" validate constraint "cards_series_id_fkey";

alter table "public"."cards" add constraint "cards_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES public.card_subcategories(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_subcategory_id_fkey";

alter table "public"."cards" add constraint "cards_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.card_variants(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_variant_id_fkey";

alter table "public"."collection_imports" add constraint "collection_imports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."collection_imports" validate constraint "collection_imports_user_id_fkey";

alter table "public"."collection_imports" add constraint "collection_imports_user_id_import_hash_key" UNIQUE using index "collection_imports_user_id_import_hash_key";

alter table "public"."daily_booster_claims" add constraint "daily_booster_claims_user_id_claim_date_key" UNIQUE using index "daily_booster_claims_user_id_claim_date_key";

alter table "public"."daily_booster_claims" add constraint "daily_booster_claims_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."daily_booster_claims" validate constraint "daily_booster_claims_user_id_fkey";

alter table "public"."event_achievements" add constraint "event_achievements_event_id_achievement_key_key" UNIQUE using index "event_achievements_event_id_achievement_key_key";

alter table "public"."event_achievements" add constraint "event_achievements_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.starlight_events(id) ON DELETE CASCADE not valid;

alter table "public"."event_achievements" validate constraint "event_achievements_event_id_fkey";

alter table "public"."event_achievements" add constraint "event_achievements_requirement_value_check" CHECK ((requirement_value >= 1)) not valid;

alter table "public"."event_achievements" validate constraint "event_achievements_requirement_value_check";

alter table "public"."event_achievements" add constraint "event_achievements_reward_star_bits_check" CHECK ((reward_star_bits >= 0)) not valid;

alter table "public"."event_achievements" validate constraint "event_achievements_reward_star_bits_check";

alter table "public"."notification_dismissals" add constraint "notification_dismissals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_dismissals" validate constraint "notification_dismissals_user_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_user_id_fkey";

alter table "public"."profile_moderation_state" add constraint "profile_moderation_state_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."profile_moderation_state" validate constraint "profile_moderation_state_updated_by_fkey";

alter table "public"."profile_moderation_state" add constraint "profile_moderation_state_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profile_moderation_state" validate constraint "profile_moderation_state_user_id_fkey";

alter table "public"."profile_reports" add constraint "profile_reports_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."profile_reports" validate constraint "profile_reports_assigned_to_fkey";

alter table "public"."profile_reports" add constraint "profile_reports_category_check" CHECK ((category = ANY (ARRAY['impersonation'::text, 'harassment'::text, 'inappropriate_profile'::text, 'spam'::text, 'other'::text]))) not valid;

alter table "public"."profile_reports" validate constraint "profile_reports_category_check";

alter table "public"."profile_reports" add constraint "profile_reports_details_check" CHECK (((char_length(details) >= 10) AND (char_length(details) <= 1000))) not valid;

alter table "public"."profile_reports" validate constraint "profile_reports_details_check";

alter table "public"."profile_reports" add constraint "profile_reports_reporter_user_id_fkey" FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profile_reports" validate constraint "profile_reports_reporter_user_id_fkey";

alter table "public"."profile_reports" add constraint "profile_reports_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text]))) not valid;

alter table "public"."profile_reports" validate constraint "profile_reports_status_check";

alter table "public"."profile_reports" add constraint "profile_reports_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profile_reports" validate constraint "profile_reports_target_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_bio_length_check" CHECK (((bio IS NULL) OR (char_length(bio) <= 240))) not valid;

alter table "public"."profiles" validate constraint "profiles_bio_length_check";

alter table "public"."profiles" add constraint "profiles_display_name_length_check" CHECK (((display_name IS NULL) OR ((char_length(display_name) >= 1) AND (char_length(display_name) <= 40)))) not valid;

alter table "public"."profiles" validate constraint "profiles_display_name_length_check";

alter table "public"."profiles" add constraint "profiles_favorite_card_id_fkey" FOREIGN KEY (favorite_card_id) REFERENCES public.cards(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_favorite_card_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_profile_visibility_check" CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'unlisted'::text, 'private'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_profile_visibility_check";

alter table "public"."profiles" add constraint "profiles_username_format_check" CHECK ((username ~ '^[a-z0-9_]{3,24}$'::text)) not valid;

alter table "public"."profiles" validate constraint "profiles_username_format_check";

alter table "public"."received_rewards" add constraint "received_rewards_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."received_rewards" validate constraint "received_rewards_created_by_fkey";

alter table "public"."received_rewards" add constraint "received_rewards_reward_type_check" CHECK ((reward_type = ANY (ARRAY['star_bits'::text, 'single_card'::text, 'booster'::text, 'card_bundle'::text]))) not valid;

alter table "public"."received_rewards" validate constraint "received_rewards_reward_type_check";

alter table "public"."received_rewards" add constraint "received_rewards_source_type_check" CHECK ((source_type = ANY (ARRAY['twitch'::text, 'manual'::text, 'reward_code'::text, 'gift'::text, 'system'::text, 'event'::text]))) not valid;

alter table "public"."received_rewards" validate constraint "received_rewards_source_type_check";

alter table "public"."received_rewards" add constraint "received_rewards_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'claimed'::text, 'expired'::text, 'cancelled'::text]))) not valid;

alter table "public"."received_rewards" validate constraint "received_rewards_status_check";

alter table "public"."received_rewards" add constraint "received_rewards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."received_rewards" validate constraint "received_rewards_user_id_fkey";

alter table "public"."reward_code_redemptions" add constraint "reward_code_redemptions_code_id_fkey" FOREIGN KEY (code_id) REFERENCES public.reward_codes(id) ON DELETE RESTRICT not valid;

alter table "public"."reward_code_redemptions" validate constraint "reward_code_redemptions_code_id_fkey";

alter table "public"."reward_code_redemptions" add constraint "reward_code_redemptions_code_id_user_id_key" UNIQUE using index "reward_code_redemptions_code_id_user_id_key";

alter table "public"."reward_code_redemptions" add constraint "reward_code_redemptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reward_code_redemptions" validate constraint "reward_code_redemptions_user_id_fkey";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE RESTRICT not valid;

alter table "public"."reward_code_rewards" validate constraint "reward_code_rewards_card_id_fkey";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_card_quantity_check" CHECK (((card_quantity IS NULL) OR (card_quantity > 0))) not valid;

alter table "public"."reward_code_rewards" validate constraint "reward_code_rewards_card_quantity_check";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_check" CHECK ((((reward_type = 'single_card'::text) AND (card_id IS NOT NULL) AND (card_quantity IS NOT NULL) AND (booster_card_ids IS NULL) AND (star_bits_amount IS NULL)) OR ((reward_type = 'booster'::text) AND (booster_card_ids IS NOT NULL) AND (cardinality(booster_card_ids) > 0) AND (card_id IS NULL) AND (card_quantity IS NULL) AND (star_bits_amount IS NULL)) OR ((reward_type = 'star_bits'::text) AND (star_bits_amount IS NOT NULL) AND (card_id IS NULL) AND (card_quantity IS NULL) AND (booster_card_ids IS NULL)))) not valid;

alter table "public"."reward_code_rewards" validate constraint "reward_code_rewards_check";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_code_id_fkey" FOREIGN KEY (code_id) REFERENCES public.reward_codes(id) ON DELETE CASCADE not valid;

alter table "public"."reward_code_rewards" validate constraint "reward_code_rewards_code_id_fkey";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_reward_type_check" CHECK ((reward_type = ANY (ARRAY['single_card'::text, 'booster'::text, 'star_bits'::text]))) not valid;

alter table "public"."reward_code_rewards" validate constraint "reward_code_rewards_reward_type_check";

alter table "public"."reward_code_rewards" add constraint "reward_code_rewards_star_bits_amount_check" CHECK (((star_bits_amount IS NULL) OR (star_bits_amount > 0))) not valid;

alter table "public"."reward_code_rewards" validate constraint "reward_code_rewards_star_bits_amount_check";

alter table "public"."reward_codes" add constraint "reward_codes_check" CHECK (((expires_at IS NULL) OR (starts_at IS NULL) OR (expires_at > starts_at))) not valid;

alter table "public"."reward_codes" validate constraint "reward_codes_check";

alter table "public"."reward_codes" add constraint "reward_codes_code_hash_key" UNIQUE using index "reward_codes_code_hash_key";

alter table "public"."reward_codes" add constraint "reward_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT not valid;

alter table "public"."reward_codes" validate constraint "reward_codes_created_by_fkey";

alter table "public"."reward_codes" add constraint "reward_codes_current_uses_check" CHECK ((current_uses >= 0)) not valid;

alter table "public"."reward_codes" validate constraint "reward_codes_current_uses_check";

alter table "public"."reward_codes" add constraint "reward_codes_max_uses_check" CHECK (((max_uses IS NULL) OR (max_uses > 0))) not valid;

alter table "public"."reward_codes" validate constraint "reward_codes_max_uses_check";

alter table "public"."site_asset_manifest" add constraint "site_asset_manifest_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."site_asset_manifest" validate constraint "site_asset_manifest_uploaded_by_fkey";

alter table "public"."site_roles" add constraint "site_roles_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."site_roles" validate constraint "site_roles_assigned_by_fkey";

alter table "public"."site_roles" add constraint "site_roles_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'super_moderator'::text, 'moderator'::text]))) not valid;

alter table "public"."site_roles" validate constraint "site_roles_role_check";

alter table "public"."site_roles" add constraint "site_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."site_roles" validate constraint "site_roles_user_id_fkey";

alter table "public"."site_settings" add constraint "site_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."site_settings" validate constraint "site_settings_updated_by_fkey";

alter table "public"."staff_audit_log" add constraint "staff_audit_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."staff_audit_log" validate constraint "staff_audit_log_actor_user_id_fkey";

alter table "public"."staff_audit_log" add constraint "staff_audit_log_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."staff_audit_log" validate constraint "staff_audit_log_target_user_id_fkey";

alter table "public"."star_bits_booster_purchases" add constraint "star_bits_booster_purchases_booster_id_fkey" FOREIGN KEY (booster_id) REFERENCES public.booster_types(id) ON DELETE SET NULL not valid;

alter table "public"."star_bits_booster_purchases" validate constraint "star_bits_booster_purchases_booster_id_fkey";

alter table "public"."star_bits_booster_purchases" add constraint "star_bits_booster_purchases_star_bits_cost_check" CHECK ((star_bits_cost > 0)) not valid;

alter table "public"."star_bits_booster_purchases" validate constraint "star_bits_booster_purchases_star_bits_cost_check";

alter table "public"."star_bits_booster_purchases" add constraint "star_bits_booster_purchases_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."star_bits_booster_purchases" validate constraint "star_bits_booster_purchases_user_id_fkey";

alter table "public"."star_bits_transactions" add constraint "star_bits_transactions_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL not valid;

alter table "public"."star_bits_transactions" validate constraint "star_bits_transactions_card_id_fkey";

alter table "public"."star_bits_transactions" add constraint "star_bits_transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['duplicate_conversion'::text, 'admin_grant'::text, 'reward'::text, 'purchase'::text, 'adjustment'::text]))) not valid;

alter table "public"."star_bits_transactions" validate constraint "star_bits_transactions_transaction_type_check";

alter table "public"."star_bits_transactions" add constraint "star_bits_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."star_bits_transactions" validate constraint "star_bits_transactions_user_id_fkey";

alter table "public"."star_bits_values" add constraint "star_bits_values_bits_per_duplicate_check" CHECK ((bits_per_duplicate >= 0)) not valid;

alter table "public"."star_bits_values" validate constraint "star_bits_values_bits_per_duplicate_check";

alter table "public"."starlight_events" add constraint "starlight_events_check" CHECK ((end_at > start_at)) not valid;

alter table "public"."starlight_events" validate constraint "starlight_events_check";

alter table "public"."starlight_news_posts" add constraint "starlight_news_posts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."starlight_news_posts" validate constraint "starlight_news_posts_created_by_fkey";

alter table "public"."trade_offer_items" add constraint "trade_offer_items_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE RESTRICT not valid;

alter table "public"."trade_offer_items" validate constraint "trade_offer_items_card_id_fkey";

alter table "public"."trade_offer_items" add constraint "trade_offer_items_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.trade_offers(id) ON DELETE CASCADE not valid;

alter table "public"."trade_offer_items" validate constraint "trade_offer_items_offer_id_fkey";

alter table "public"."trade_offer_items" add constraint "trade_offer_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."trade_offer_items" validate constraint "trade_offer_items_quantity_check";

alter table "public"."trade_offer_items" add constraint "trade_offer_items_side_check" CHECK ((side = ANY (ARRAY['proposer'::text, 'recipient'::text]))) not valid;

alter table "public"."trade_offer_items" validate constraint "trade_offer_items_side_check";

alter table "public"."trade_offers" add constraint "trade_offers_check" CHECK ((proposer_id <> recipient_id)) not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_check";

alter table "public"."trade_offers" add constraint "trade_offers_note_check" CHECK (((note IS NULL) OR (char_length(note) <= 300))) not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_note_check";

alter table "public"."trade_offers" add constraint "trade_offers_proposer_id_fkey" FOREIGN KEY (proposer_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_proposer_id_fkey";

alter table "public"."trade_offers" add constraint "trade_offers_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_recipient_id_fkey";

alter table "public"."trade_offers" add constraint "trade_offers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text]))) not valid;

alter table "public"."trade_offers" validate constraint "trade_offers_status_check";

alter table "public"."twitch_broadcaster_tokens" add constraint "twitch_broadcaster_tokens_id_check" CHECK ((id = true)) not valid;

alter table "public"."twitch_broadcaster_tokens" validate constraint "twitch_broadcaster_tokens_id_check";

alter table "public"."twitch_connections" add constraint "twitch_connections_twitch_user_id_key" UNIQUE using index "twitch_connections_twitch_user_id_key";

alter table "public"."twitch_connections" add constraint "twitch_connections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."twitch_connections" validate constraint "twitch_connections_user_id_fkey";

alter table "public"."twitch_integration_config" add constraint "twitch_integration_config_id_check" CHECK ((id = true)) not valid;

alter table "public"."twitch_integration_config" validate constraint "twitch_integration_config_id_check";

alter table "public"."twitch_integration_config" add constraint "twitch_integration_config_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."twitch_integration_config" validate constraint "twitch_integration_config_updated_by_fkey";

alter table "public"."twitch_oauth_states" add constraint "twitch_oauth_states_flow_type_check" CHECK ((flow_type = ANY (ARRAY['collector'::text, 'broadcaster'::text]))) not valid;

alter table "public"."twitch_oauth_states" validate constraint "twitch_oauth_states_flow_type_check";

alter table "public"."twitch_oauth_states" add constraint "twitch_oauth_states_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."twitch_oauth_states" validate constraint "twitch_oauth_states_user_id_fkey";

alter table "public"."twitch_reward_events" add constraint "twitch_reward_events_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'delivered'::text, 'ignored'::text, 'failed'::text]))) not valid;

alter table "public"."twitch_reward_events" validate constraint "twitch_reward_events_status_check";

alter table "public"."twitch_reward_grants" add constraint "twitch_reward_grants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.twitch_reward_events(event_id) ON DELETE SET NULL not valid;

alter table "public"."twitch_reward_grants" validate constraint "twitch_reward_grants_event_id_fkey";

alter table "public"."twitch_reward_grants" add constraint "twitch_reward_grants_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."twitch_reward_grants" validate constraint "twitch_reward_grants_granted_by_fkey";

alter table "public"."twitch_reward_grants" add constraint "twitch_reward_grants_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES public.twitch_reward_rules(id) ON DELETE SET NULL not valid;

alter table "public"."twitch_reward_grants" validate constraint "twitch_reward_grants_rule_id_fkey";

alter table "public"."twitch_reward_grants" add constraint "twitch_reward_grants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."twitch_reward_grants" validate constraint "twitch_reward_grants_user_id_fkey";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_booster_id_fkey" FOREIGN KEY (booster_id) REFERENCES public.booster_types(id) ON DELETE RESTRICT not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_booster_id_fkey";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE RESTRICT not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_card_id_fkey";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_cooldown_minutes_check" CHECK ((cooldown_minutes >= 0)) not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_cooldown_minutes_check";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_created_by_fkey";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_event_target_check" CHECK ((((event_type = 'channel_points'::text) AND (NULLIF(TRIM(BOTH FROM twitch_reward_id), ''::text) IS NOT NULL)) OR ((event_type <> 'channel_points'::text) AND (twitch_reward_id IS NULL)))) not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_event_target_check";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_event_type_check" CHECK ((event_type = ANY (ARRAY['channel_points'::text, 'subscription'::text, 'follow'::text, 'manual'::text, 'attendance'::text]))) not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_event_type_check";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_max_claims_per_user_check" CHECK (((max_claims_per_user IS NULL) OR (max_claims_per_user > 0))) not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_max_claims_per_user_check";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_reward_payload_check" CHECK ((((reward_type = 'star_bits'::text) AND (COALESCE(star_bits_amount, (0)::bigint) > 0) AND (card_id IS NULL) AND (card_quantity IS NULL) AND (booster_id IS NULL)) OR ((reward_type = 'single_card'::text) AND (card_id IS NOT NULL) AND (COALESCE(card_quantity, 0) > 0) AND (booster_id IS NULL) AND (star_bits_amount IS NULL)) OR ((reward_type = 'booster'::text) AND (booster_id IS NOT NULL) AND (card_id IS NULL) AND (card_quantity IS NULL) AND (star_bits_amount IS NULL)))) not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_reward_payload_check";

alter table "public"."twitch_reward_rules" add constraint "twitch_reward_rules_reward_type_check" CHECK ((reward_type = ANY (ARRAY['star_bits'::text, 'single_card'::text, 'booster'::text]))) not valid;

alter table "public"."twitch_reward_rules" validate constraint "twitch_reward_rules_reward_type_check";

alter table "public"."user_achievements" add constraint "user_achievements_achievement_id_fkey" FOREIGN KEY (achievement_id) REFERENCES public.achievement_definitions(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_achievement_id_fkey";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_user_id_fkey";

alter table "public"."user_card_preferences" add constraint "user_card_preferences_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE not valid;

alter table "public"."user_card_preferences" validate constraint "user_card_preferences_card_id_fkey";

alter table "public"."user_card_preferences" add constraint "user_card_preferences_trade_quantity_check" CHECK ((trade_quantity >= 0)) not valid;

alter table "public"."user_card_preferences" validate constraint "user_card_preferences_trade_quantity_check";

alter table "public"."user_card_preferences" add constraint "user_card_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_card_preferences" validate constraint "user_card_preferences_user_id_fkey";

alter table "public"."user_cards" add constraint "user_cards_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE RESTRICT not valid;

alter table "public"."user_cards" validate constraint "user_cards_card_id_fkey";

alter table "public"."user_cards" add constraint "user_cards_quantity_check" CHECK ((quantity >= 1)) not valid;

alter table "public"."user_cards" validate constraint "user_cards_quantity_check";

alter table "public"."user_cards" add constraint "user_cards_user_id_card_id_key" UNIQUE using index "user_cards_user_id_card_id_key";

alter table "public"."user_cards" add constraint "user_cards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_cards" validate constraint "user_cards_user_id_fkey";

alter table "public"."user_notifications" add constraint "user_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_notifications" validate constraint "user_notifications_user_id_fkey";

alter table "public"."user_titles" add constraint "user_titles_title_id_fkey" FOREIGN KEY (title_id) REFERENCES public.collector_titles(id) ON DELETE CASCADE not valid;

alter table "public"."user_titles" validate constraint "user_titles_title_id_fkey";

alter table "public"."user_titles" add constraint "user_titles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_titles" validate constraint "user_titles_user_id_fkey";

alter table "public"."user_trade_settings" add constraint "user_trade_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_trade_settings" validate constraint "user_trade_settings_user_id_fkey";

alter table "public"."user_wallets" add constraint "user_wallets_collector_xp_check" CHECK ((collector_xp >= 0)) not valid;

alter table "public"."user_wallets" validate constraint "user_wallets_collector_xp_check";

alter table "public"."user_wallets" add constraint "user_wallets_lifetime_star_bits_earned_check" CHECK ((lifetime_star_bits_earned >= 0)) not valid;

alter table "public"."user_wallets" validate constraint "user_wallets_lifetime_star_bits_earned_check";

alter table "public"."user_wallets" add constraint "user_wallets_lifetime_star_bits_spent_check" CHECK ((lifetime_star_bits_spent >= 0)) not valid;

alter table "public"."user_wallets" validate constraint "user_wallets_lifetime_star_bits_spent_check";

alter table "public"."user_wallets" add constraint "user_wallets_star_bits_check" CHECK ((star_bits >= 0)) not valid;

alter table "public"."user_wallets" validate constraint "user_wallets_star_bits_check";

alter table "public"."user_wallets" add constraint "user_wallets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_wallets" validate constraint "user_wallets_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_booster_reference_report_v901(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ref record;
  ref_count bigint;
  refs jsonb := '[]'::jsonb;
  action_name text;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if not exists(select 1 from public.booster_types where id=requested_id) then
    raise exception 'Booster % does not exist.', requested_id;
  end if;

  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confdeltype
    from pg_constraint c
    join unnest(c.conkey) with ordinality ck(attnum,ord) on true
    join unnest(c.confkey) with ordinality fk(attnum,ord) using(ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=ck.attnum
    join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=fk.attnum
    where c.contype='f'
      and c.confrelid='public.booster_types'::regclass
      and pa.attname='id'
    order by c.conrelid::regclass::text,a.attname
  loop
    execute format('select count(*) from %s where %I=$1',ref.table_name,ref.column_name)
      into ref_count using requested_id;
    action_name := case ref.confdeltype
      when 'c' then 'cascade'
      when 'n' then 'set null'
      when 'd' then 'set default'
      when 'r' then 'restrict'
      else 'no action'
    end;
    refs := refs || jsonb_build_array(jsonb_build_object(
      'table',ref.table_name,
      'column',ref.column_name,
      'count',ref_count,
      'onDelete',action_name
    ));
  end loop;

  return jsonb_build_object(
    'boosterId',requested_id,
    'references',refs,
    'totalReferences',coalesce((select sum((x->>'count')::bigint) from jsonb_array_elements(refs) x),0)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_broadcast_notification_v881(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare count_inserted integer; source text:='broadcast:'||gen_random_uuid()::text;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if nullif(trim(payload->>'title'),'') is null or nullif(trim(payload->>'body'),'') is null then raise exception 'Title and message are required.'; end if;
  insert into public.user_notifications(user_id,notification_type,title,body,icon,route,source_key,expires_at)
  select u.id,'broadcast',trim(payload->>'title'),trim(payload->>'body'),coalesce(nullif(payload->>'icon',''),'📣'),nullif(trim(payload->>'route'),''),source,(payload->>'expiresAt')::timestamptz from auth.users u;
  get diagnostics count_inserted=row_count;
  return jsonb_build_object('success',true,'recipientCount',count_inserted);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_clone_booster_v897(requested_source_id text, requested_new_id text, requested_new_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  src public.booster_types%rowtype;
  old_slot record;
  new_slot_id bigint;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_new_id := lower(trim(requested_new_id));
  requested_new_name := trim(requested_new_name);

  if requested_new_id !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'The new booster ID is invalid.';
  end if;
  if requested_new_name is null or requested_new_name = '' then
    raise exception 'Enter a name for the copied booster.';
  end if;
  if exists(select 1 from public.booster_types where id = requested_new_id) then
    raise exception 'A booster with that ID already exists.';
  end if;

  select * into src from public.booster_types where id = requested_source_id;
  if not found then raise exception 'The source booster could not be found.'; end if;

  insert into public.booster_types(
    id,name,description,star_bits_cost,is_active,sort_order,
    pack_image_url,card_back_url,reward_mode,series_id,card_count,
    bonus_star_bits,archived,created_at,updated_at
  )
  values(
    requested_new_id,requested_new_name,src.description,src.star_bits_cost,false,src.sort_order,
    src.pack_image_url,src.card_back_url,src.reward_mode,src.series_id,src.card_count,
    src.bonus_star_bits,false,now(),now()
  );

  for old_slot in
    select * from public.booster_slots
    where booster_id = requested_source_id
    order by sort_order,id
  loop
    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order,created_at,updated_at)
    values(requested_new_id,old_slot.slot_key,old_slot.name,old_slot.quantity,old_slot.sort_order,now(),now())
    returning id into new_slot_id;

    insert into public.booster_slot_rates(slot_id,rarity,percentage,updated_at)
    select new_slot_id,rarity,percentage,now()
    from public.booster_slot_rates
    where slot_id = old_slot.id;
  end loop;

  insert into public.booster_reward_cards(booster_id,card_id,quantity,weight,guaranteed,sort_order)
  select requested_new_id,card_id,quantity,weight,guaranteed,sort_order
  from public.booster_reward_cards
  where booster_id = requested_source_id;

  return jsonb_build_object('success',true,'id',requested_new_id,'sourceId',requested_source_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_booster(requested_id text, requested_name text, requested_clone_from text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_role text; new_id text:=lower(trim(requested_id)); src public.booster_types%rowtype; new_slot bigint; old_slot record;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 if new_id !~ '^[a-z0-9_]{3,40}$' then raise exception 'Booster ID must use lowercase letters, numbers, and underscores.'; end if;
 if requested_clone_from is not null and requested_clone_from<>'' then select * into src from public.booster_types where id=requested_clone_from; end if;
 insert into public.booster_types(id,name,description,star_bits_cost,is_active,sort_order,pack_image_url,card_back_url)
 values(new_id,coalesce(nullif(trim(requested_name),''),initcap(replace(new_id,'_',' '))),src.description,coalesce(src.star_bits_cost,100),false,100,coalesce(src.pack_image_url,'site_assets/series01_rising_star_booster.png'),coalesce(src.card_back_url,'site_assets/StarlightCard_Back_NewLogo.png'));
 if src.id is not null then
   for old_slot in select * from public.booster_slots where booster_id=src.id order by sort_order loop
     insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order) values(new_id,old_slot.slot_key,old_slot.name,old_slot.quantity,old_slot.sort_order) returning id into new_slot;
     insert into public.booster_slot_rates(slot_id,rarity,percentage) select new_slot,rarity,percentage from public.booster_slot_rates where slot_id=old_slot.id;
   end loop;
 else
   insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order) values(new_id,'rare_plus','Cards',4,10) returning id into new_slot;
   insert into public.booster_slot_rates(slot_id,rarity,percentage) values(new_slot,'Common',50),(new_slot,'Uncommon',25),(new_slot,'Rare',15),(new_slot,'Epic',8),(new_slot,'Legendary',2);
 end if;
 return jsonb_build_object('success',true,'id',new_id);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_booster_from_template_v897(requested_template_id text, requested_new_id text, requested_new_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  slot_id bigint;
  template_id text := lower(trim(requested_template_id));
  reward_mode_value text := 'slots';
  card_count_value integer := 4;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_new_id := lower(trim(requested_new_id));
  requested_new_name := trim(requested_new_name);

  if requested_new_id !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'The new booster ID is invalid.';
  end if;
  if requested_new_name is null or requested_new_name = '' then
    raise exception 'Enter a booster name.';
  end if;
  if exists(select 1 from public.booster_types where id = requested_new_id) then
    raise exception 'A booster with that ID already exists.';
  end if;
  if template_id not in ('standard','series','guaranteed','exact','custom') then
    raise exception 'Unknown booster template.';
  end if;

  if template_id = 'series' then reward_mode_value := 'series'; card_count_value := 4; end if;
  if template_id = 'exact' then reward_mode_value := 'exact'; card_count_value := 1; end if;
  if template_id = 'custom' then reward_mode_value := 'weighted_pool'; card_count_value := 4; end if;

  insert into public.booster_types(
    id,name,description,star_bits_cost,is_active,sort_order,
    pack_image_url,card_back_url,reward_mode,series_id,card_count,
    bonus_star_bits,archived,created_at,updated_at
  )
  values(
    requested_new_id,requested_new_name,
    case template_id
      when 'standard' then 'A standard four-card Starlight booster.'
      when 'series' then 'A four-card booster restricted to one series.'
      when 'guaranteed' then 'A premium booster with a guaranteed Epic-or-Legendary slot.'
      when 'exact' then 'A pack that awards specifically selected cards.'
      else 'A custom weighted booster.'
    end,
    0,false,0,
    'site_assets/series01_rising_star_booster.png',
    'site_assets/StarlightCard_Back_NewLogo.png',
    reward_mode_value,null,card_count_value,0,false,now(),now()
  );

  if template_id = 'standard' then
    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'common','Common Cards',2,10) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',100),(slot_id,'Uncommon',0),(slot_id,'Rare',0),(slot_id,'Epic',0),(slot_id,'Legendary',0);

    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'uncommon','Uncommon Card',1,20) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',0),(slot_id,'Uncommon',100),(slot_id,'Rare',0),(slot_id,'Epic',0),(slot_id,'Legendary',0);

    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'rare_plus','Rare or Better',1,30) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',0),(slot_id,'Uncommon',0),(slot_id,'Rare',70),(slot_id,'Epic',22),(slot_id,'Legendary',8);
  elsif template_id = 'guaranteed' then
    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'regular','Regular Cards',3,10) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',55),(slot_id,'Uncommon',30),(slot_id,'Rare',15),(slot_id,'Epic',0),(slot_id,'Legendary',0);

    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'epic_plus','Guaranteed Epic or Legendary',1,20) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',0),(slot_id,'Uncommon',0),(slot_id,'Rare',0),(slot_id,'Epic',85),(slot_id,'Legendary',15);
  end if;

  return jsonb_build_object('success',true,'id',requested_new_id,'template',template_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_card_series_v831(requested_id text, requested_name text, requested_description text DEFAULT NULL::text, requested_booster_image_url text DEFAULT NULL::text, requested_sort_order integer DEFAULT 0, requested_is_visible boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_role text;
  normalized_id text := trim(requested_id);
begin
  select sr.role into actor_role
  from public.site_roles sr
  where sr.user_id = auth.uid();

  if actor_role not in ('owner','admin') then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id is null or normalized_id !~ '^[A-Za-z0-9_-]{1,30}$' then
    raise exception 'Series ID must use letters, numbers, underscores, or hyphens.';
  end if;

  if nullif(trim(requested_name),'') is null then
    raise exception 'Series name is required.';
  end if;

  insert into public.card_series (
    id, name, description, booster_image_url,
    sort_order, is_visible, updated_at
  ) values (
    normalized_id,
    trim(requested_name),
    nullif(trim(requested_description),''),
    coalesce(nullif(trim(requested_booster_image_url),''),'site_assets/series01_rising_star_booster.png'),
    coalesce(requested_sort_order,0),
    coalesce(requested_is_visible,true),
    now()
  );

  return jsonb_build_object('success',true,'id',normalized_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_card_v831(requested_id text, requested_series_id text, requested_card_number text, requested_name text, requested_rarity text, requested_image_url text, requested_thumbnail_url text DEFAULT NULL::text, requested_description text DEFAULT NULL::text, requested_artist text DEFAULT NULL::text, requested_sort_order integer DEFAULT 0, requested_is_visible boolean DEFAULT true, requested_is_collectible boolean DEFAULT true, requested_is_pullable boolean DEFAULT true, requested_pull_weight numeric DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_role text;
  normalized_id text := lower(trim(requested_id));
begin
  select sr.role into actor_role
  from public.site_roles sr
  where sr.user_id = auth.uid();

  if actor_role not in ('owner','admin') then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id is null or normalized_id !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Card ID must use lowercase letters, numbers, underscores, or hyphens.';
  end if;

  if not exists (select 1 from public.card_series s where s.id = requested_series_id) then
    raise exception 'Selected card series does not exist.';
  end if;

  if requested_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then
    raise exception 'Invalid rarity.';
  end if;

  if nullif(trim(requested_card_number),'') is null
     or nullif(trim(requested_name),'') is null
     or nullif(trim(requested_image_url),'') is null then
    raise exception 'Card number, name, and front image are required.';
  end if;

  insert into public.cards (
    id, series_id, card_number, name, rarity,
    image_url, thumbnail_url, description, artist,
    sort_order, is_visible, is_collectible,
    pull_weight, is_pullable, updated_at
  ) values (
    normalized_id,
    requested_series_id,
    trim(requested_card_number),
    trim(requested_name),
    requested_rarity,
    trim(requested_image_url),
    coalesce(nullif(trim(requested_thumbnail_url),''),trim(requested_image_url)),
    nullif(trim(requested_description),''),
    nullif(trim(requested_artist),''),
    coalesce(requested_sort_order,0),
    coalesce(requested_is_visible,true),
    coalesce(requested_is_collectible,true),
    greatest(coalesce(requested_pull_weight,1),0),
    coalesce(requested_is_pullable,true),
    now()
  );

  return jsonb_build_object('success',true,'id',normalized_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_reward_code(requested_code text, requested_label text, requested_reward_type text, requested_card_id text DEFAULT NULL::text, requested_card_quantity integer DEFAULT NULL::integer, requested_booster_card_ids text[] DEFAULT NULL::text[], requested_star_bits_amount bigint DEFAULT NULL::bigint, requested_max_uses integer DEFAULT NULL::integer, requested_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone, requested_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid := auth.uid();
    normalized_code text;
    generated_hash text;
    new_code_id uuid;
begin
    if current_user_id is null or not public.is_site_admin() then
        raise exception 'Administrator access is required.';
    end if;

    normalized_code := regexp_replace(upper(trim(requested_code)), '[^A-Z0-9]', '', 'g');

    if char_length(normalized_code) < 6 or char_length(normalized_code) > 40 then
        raise exception 'Code must contain 6 to 40 letters or numbers.';
    end if;

    if nullif(trim(requested_label), '') is null then
        raise exception 'A label is required.';
    end if;

    if requested_reward_type not in ('single_card', 'booster', 'star_bits') then
        raise exception 'Invalid reward type.';
    end if;

    if requested_max_uses is not null and requested_max_uses < 1 then
        raise exception 'Maximum uses must be at least 1.';
    end if;

    if requested_expires_at is not null
       and requested_starts_at is not null
       and requested_expires_at <= requested_starts_at then
        raise exception 'Expiration must be after the start time.';
    end if;

    if requested_reward_type = 'single_card' then
        if requested_card_id is null or coalesce(requested_card_quantity, 0) < 1 then
            raise exception 'Single-card rewards require a valid card and quantity.';
        end if;
        if not exists (select 1 from public.cards where id = requested_card_id and is_collectible = true) then
            raise exception 'The selected card is not collectible.';
        end if;
    elsif requested_reward_type = 'booster' then
        if requested_booster_card_ids is null or cardinality(requested_booster_card_ids) < 1 then
            raise exception 'Booster rewards require at least one card.';
        end if;
        if exists (
            select 1
            from unnest(requested_booster_card_ids) supplied(card_id)
            left join public.cards on cards.id = supplied.card_id and cards.is_collectible = true
            where cards.id is null
        ) then
            raise exception 'One or more booster cards are invalid.';
        end if;
    elsif requested_reward_type = 'star_bits' then
        if coalesce(requested_star_bits_amount, 0) < 1 then
            raise exception 'Star Bits rewards must be at least 1.';
        end if;
    end if;

    generated_hash := encode(extensions.digest(normalized_code, 'sha256'), 'hex');

    insert into public.reward_codes (
        code_hash,
        code_preview,
        label,
        max_uses,
        starts_at,
        expires_at,
        created_by
    ) values (
        generated_hash,
        right(normalized_code, 4),
        trim(requested_label),
        requested_max_uses,
        requested_starts_at,
        requested_expires_at,
        current_user_id
    ) returning id into new_code_id;

    insert into public.reward_code_rewards (
        code_id,
        reward_type,
        card_id,
        card_quantity,
        booster_card_ids,
        star_bits_amount
    ) values (
        new_code_id,
        requested_reward_type,
        case when requested_reward_type = 'single_card' then requested_card_id else null end,
        case when requested_reward_type = 'single_card' then requested_card_quantity else null end,
        case when requested_reward_type = 'booster' then requested_booster_card_ids else null end,
        case when requested_reward_type = 'star_bits' then requested_star_bits_amount else null end
    );

    return jsonb_build_object(
        'success', true,
        'id', new_code_id,
        'code', normalized_code,
        'label', trim(requested_label),
        'rewardType', requested_reward_type
    );
exception
    when unique_violation then
        raise exception 'That redemption code already exists.';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_booster_v841(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if requested_id = 'free_daily' then
    raise exception 'The system Free Daily Booster cannot be deleted. Disable it or edit its configuration instead.';
  end if;

  begin
    delete from public.booster_types where id = requested_id;
  exception when foreign_key_violation then
    raise exception 'This booster has historical records that prevent deletion. Archive and deactivate it instead.';
  end;

  if not found then raise exception 'Booster not found.'; end if;
  return jsonb_build_object('success', true, 'deletedId', requested_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_booster_v9011(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  bid text:=lower(trim(requested_id));
  deleted_rules integer:=0;
  cancelled_gifts integer:=0;
  cleared_purchases integer:=0;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if bid='free_daily' then
    raise exception 'The system Free Daily Booster cannot be deleted. Disable or edit it instead.';
  end if;
  if not exists(select 1 from public.booster_types where id=bid) then
    raise exception using message=format('Booster %s does not exist.',bid);
  end if;

  if to_regclass('public.twitch_reward_rules') is not null then
    delete from public.twitch_reward_rules where booster_id=bid;
    get diagnostics deleted_rules=row_count;
  end if;

  if to_regclass('public.star_bits_booster_purchases') is not null then
    update public.star_bits_booster_purchases set booster_id=null where booster_id=bid;
    get diagnostics cleared_purchases=row_count;
  end if;

  if to_regclass('public.received_rewards') is not null then
    update public.received_rewards
    set status='cancelled',
        message=concat_ws(' ',message,'This booster was removed by an administrator.'),
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('deletedBoosterId',bid)
    where status='pending'
      and reward_type='booster'
      and reward_payload->>'boosterId'=bid;
    get diagnostics cancelled_gifts=row_count;
  end if;

  delete from public.booster_types where id=bid;

  return jsonb_build_object(
    'success',true,
    'deletedId',bid,
    'deletedTwitchRules',deleted_rules,
    'detachedPurchases',cleared_purchases,
    'cancelledPendingGifts',cancelled_gifts
  );
exception when foreign_key_violation then
  raise exception 'This booster still has a protected database reference. Use Inspect References and remove the listed dependency, then try again.';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_card_subcategory_v9021(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  used_count integer;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  select count(*) into used_count from public.cards where subcategory_id=requested_id;
  if used_count > 0 then
    raise exception 'This subcategory is assigned to % card(s). Reassign those cards or deactivate the subcategory instead.', used_count;
  end if;
  delete from public.card_subcategories where id=requested_id;
  return jsonb_build_object('success',true,'id',requested_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_card_v841(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  owner_total integer;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select count(*) into owner_total
  from public.user_cards
  where card_id = requested_id;

  if owner_total > 0 then
    raise exception 'This card is owned by % collector account(s). Archive it instead of deleting it so collections and history remain intact.', owner_total;
  end if;

  begin
    delete from public.cards where id = requested_id;
  exception when foreign_key_violation then
    raise exception 'This card is still referenced by a reward, trade, code, or historical record. Remove those references or archive the card instead.';
  end;

  if not found then raise exception 'Card not found.'; end if;
  return jsonb_build_object('success', true, 'deletedId', requested_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_event_v88(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if exists (
    select 1 from public.cards where event_id = requested_id
  ) or exists (
    select 1 from public.booster_types where event_id = requested_id
  ) then
    raise exception 'Remove this event from linked cards and boosters before deleting it.';
  end if;

  delete from public.starlight_events
  where id = requested_id;

  return jsonb_build_object('success', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_news_post(requested_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r text; begin select role::text into r from public.site_roles where user_id=auth.uid(); if coalesce(r,'') not in ('owner','admin','administrator') then raise exception 'Administrator access is required.'; end if; delete from public.starlight_news_posts where id=requested_id; return jsonb_build_object('success',true); end $function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_series_v841(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  card_total integer;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select count(*) into card_total
  from public.cards
  where series_id = requested_id;

  if card_total > 0 then
    raise exception 'This series still contains % card(s). Move or delete those cards first, or hide the series instead.', card_total;
  end if;

  delete from public.card_series where id = requested_id;
  if not found then raise exception 'Series not found.'; end if;

  return jsonb_build_object('success', true, 'deletedId', requested_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_twitch_reward_rule_v890(requested_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if; delete from public.twitch_reward_rules where id=requested_id; return found; end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_user_completely_v896(requested_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
    caller_id uuid := auth.uid();
    caller_role text;
    target_email text;
    fk record;
begin
    if caller_id is null then
        raise exception 'You must be signed in.';
    end if;

    select lower(sr.role::text)
      into caller_role
      from public.site_roles sr
     where sr.user_id = caller_id
     limit 1;

    if caller_role not in ('owner','admin','administrator') then
        raise exception 'Administrator access is required.';
    end if;

    if requested_user_id is null then
        raise exception 'A user ID is required.';
    end if;

    if requested_user_id = caller_id then
        raise exception 'You cannot delete your own account from this screen.';
    end if;

    select email into target_email
      from auth.users
     where id = requested_user_id;

    if target_email is null then
        raise exception 'The requested account does not exist.';
    end if;

    -- Delete rows from every single-column foreign key that directly points
    -- to auth.users(id). This keeps the function resilient as the project grows.
    for fk in
        select
            ns.nspname as schema_name,
            cls.relname as table_name,
            att.attname as column_name
        from pg_constraint con
        join pg_class cls on cls.oid = con.conrelid
        join pg_namespace ns on ns.oid = cls.relnamespace
        join pg_class refcls on refcls.oid = con.confrelid
        join pg_namespace refns on refns.oid = refcls.relnamespace
        join unnest(con.conkey) with ordinality ck(attnum, ord) on true
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ck.attnum
        where con.contype = 'f'
          and refns.nspname = 'auth'
          and refcls.relname = 'users'
          and array_length(con.conkey, 1) = 1
          and ns.nspname in ('public','storage')
    loop
        execute format(
            'delete from %I.%I where %I = $1',
            fk.schema_name,
            fk.table_name,
            fk.column_name
        ) using requested_user_id;
    end loop;

    delete from auth.users where id = requested_user_id;

    return jsonb_build_object(
        'deleted', true,
        'userId', requested_user_id,
        'email', target_email
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_detach_booster_from_shop_v901(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare saved public.booster_types;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  update public.booster_types
  set star_bits_cost=0,is_active=false,updated_at=now()
  where id=requested_id
  returning * into saved;
  if not found then raise exception 'Booster % does not exist.',requested_id; end if;
  return jsonb_build_object('success',true,'boosterId',saved.id,'starBitsCost',saved.star_bits_cost,'isActive',saved.is_active);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_export_database_backup_v902()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  return jsonb_build_object(
    'format','starlight-database-backup-v90.2',
    'exportedAt',now(),
    'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order,s.id) from public.card_series s),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order,x.id) from public.card_categories x),'[]'::jsonb),
    'subcategories',coalesce((select jsonb_agg(to_jsonb(x) order by x.category_id,x.sort_order,x.id) from public.card_subcategories x),'[]'::jsonb),
    'variants',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order,x.id) from public.card_variants x),'[]'::jsonb),
    'finishes',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order,x.id) from public.card_finishes x),'[]'::jsonb),
    'tags',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from public.card_tags x),'[]'::jsonb),
    'tagAssignments',coalesce((select jsonb_agg(to_jsonb(x) order by x.card_id,x.tag_id) from public.card_tag_assignments x),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(to_jsonb(c) order by c.series_id,c.sort_order,c.id) from public.cards c),'[]'::jsonb),
    'boosters',coalesce((select jsonb_agg(to_jsonb(b) order by b.sort_order,b.id) from public.booster_types b),'[]'::jsonb),
    'boosterSlots',coalesce((select jsonb_agg(to_jsonb(s) order by s.booster_id,s.sort_order,s.id) from public.booster_slots s),'[]'::jsonb),
    'boosterSlotRates',coalesce((select jsonb_agg(to_jsonb(r) order by r.slot_id,r.rarity) from public.booster_slot_rates r),'[]'::jsonb),
    'boosterRewardCards',coalesce((select jsonb_agg(to_jsonb(r) order by r.booster_id,r.sort_order,r.card_id) from public.booster_reward_cards r),'[]'::jsonb)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_asset_manifest_v87()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result jsonb;
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.folder, m.path), '[]'::jsonb)
  into result
  from public.site_asset_manifest m;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_booster_configuration()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_role text;
  result jsonb;
begin
  select sr.role into actor_role
  from public.site_roles sr
  where sr.user_id = auth.uid();

  if actor_role not in ('owner','admin') then
    raise exception 'Administrator access is required.';
  end if;

  select jsonb_build_object(
    'dailyMode', public.get_free_daily_booster_mode(),
    'boosters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',b.id,
          'name',b.name,
          'description',b.description,
          'starBitsCost',b.star_bits_cost,
          'isActive',b.is_active,
          'packImageUrl',b.pack_image_url,
          'cardBackUrl',b.card_back_url,
          'slots',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id',s.id,
                'slotKey',s.slot_key,
                'name',s.name,
                'quantity',s.quantity,
                'percentageTotal',t.percentage_total,
                'isValid',t.is_valid,
                'rates',coalesce((
                  select jsonb_object_agg(r.rarity,r.percentage)
                  from public.booster_slot_rates r
                  where r.slot_id=s.id
                ),'{}'::jsonb)
              ) order by s.sort_order,s.id
            )
            from public.booster_slots s
            join public.booster_slot_rate_totals t on t.slot_id=s.id
            where s.booster_id=b.id
          ),'[]'::jsonb)
        ) order by b.sort_order,b.id
      )
      from public.booster_types b
    ),'[]'::jsonb),
    'cards',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',c.id,
          'cardNumber',c.card_number,
          'name',c.name,
          'rarity',c.rarity,
          'pullWeight',c.pull_weight,
          'isPullable',c.is_pullable,
          'imageUrl',c.image_url,
          'thumbnailUrl',c.thumbnail_url,
          'seriesId',c.series_id
        ) order by c.series_id,c.sort_order
      ) from public.cards c
    ),'[]'::jsonb),
    'series',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',s.id,
          'name',s.name,
          'description',s.description,
          'boosterImageUrl',s.booster_image_url,
          'sortOrder',s.sort_order,
          'isVisible',s.is_visible
        ) order by s.sort_order,s.id
      ) from public.card_series s
    ),'[]'::jsonb)
  ) into result;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_content_studio()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  return jsonb_build_object(
    'dailyMode',public.get_free_daily_booster_mode(),
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description,'color',color,'sortOrder',sort_order,'isActive',is_active) order by sort_order,name) from public.card_categories),'[]'::jsonb),
    'subcategories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'categoryId',category_id,'name',name,'description',description,'sortOrder',sort_order,'isActive',is_active) order by category_id,sort_order,name) from public.card_subcategories),'[]'::jsonb),
    'variants',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'sortOrder',sort_order,'isActive',is_active) order by sort_order,name) from public.card_variants),'[]'::jsonb),
    'finishes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'sortOrder',sort_order,'isActive',is_active) order by sort_order,name) from public.card_finishes),'[]'::jsonb),
    'series',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'description',s.description,'boosterImageUrl',s.booster_image_url,'sortOrder',s.sort_order,'isVisible',s.is_visible,'cardCount',(select count(*) from public.cards c where c.series_id=s.id)) order by s.sort_order,s.id) from public.card_series s),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'seriesId',c.series_id,'cardNumber',c.card_number,'collectorNumber',c.collector_number,'name',c.name,'rarity',c.rarity,
      'categoryId',c.category_id,'subcategoryId',c.subcategory_id,'variantId',c.variant_id,'finishId',c.finish_id,
      'description',c.description,'artist',c.artist,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'cardBackUrl',c.card_back_url,
      'distributionType',c.distribution_type,'isPromo',c.is_promo,'isEventExclusive',c.is_event_exclusive,
      'availableFrom',c.available_from,'availableUntil',c.available_until,'publishStatus',c.publish_status,
      'sortOrder',c.sort_order,'isVisible',c.is_visible,'isCollectible',c.is_collectible,'isPullable',c.is_pullable,'pullWeight',c.pull_weight,
      'tags',coalesce((select jsonb_agg(t.name order by t.name) from public.card_tag_assignments a join public.card_tags t on t.id=a.tag_id where a.card_id=c.id),'[]'::jsonb)
    ) order by c.series_id,c.sort_order,c.id) from public.cards c),'[]'::jsonb),
    'boosters',coalesce((select jsonb_agg(jsonb_build_object(
      'id',b.id,'name',b.name,'description',b.description,'starBitsCost',b.star_bits_cost,'isActive',b.is_active,'sortOrder',b.sort_order,
      'packImageUrl',b.pack_image_url,'cardBackUrl',b.card_back_url,'rewardMode',b.reward_mode,'seriesId',b.series_id,'cardCount',b.card_count,
      'bonusStarBits',b.bonus_star_bits,'archived',b.archived,'builderMode',b.builder_mode,'oddsPreset',b.odds_preset,
      'categoryIds',to_jsonb(b.category_ids),'finishIds',to_jsonb(b.finish_ids),'excludePromos',b.exclude_promos,'allowDuplicates',b.allow_duplicates,
      'rewardCards',coalesce((select jsonb_agg(jsonb_build_object('cardId',rc.card_id,'quantity',rc.quantity,'weight',rc.weight,'guaranteed',rc.guaranteed,'sortOrder',rc.sort_order) order by rc.sort_order,rc.card_id) from public.booster_reward_cards rc where rc.booster_id=b.id),'[]'::jsonb),
      'slots',coalesce((select jsonb_agg(jsonb_build_object('id',sl.id,'slotKey',sl.slot_key,'name',sl.name,'quantity',sl.quantity,'sortOrder',sl.sort_order,'rates',coalesce((select jsonb_object_agg(r.rarity,r.percentage) from public.booster_slot_rates r where r.slot_id=sl.id),'{}'::jsonb)) order by sl.sort_order,sl.id) from public.booster_slots sl where sl.booster_id=b.id),'[]'::jsonb)
    ) order by b.sort_order,b.id) from public.booster_types b),'[]'::jsonb)
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_database_health_v902()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  report jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object(
      'cards', (select count(*) from public.cards),
      'publishedCards', (select count(*) from public.cards where publish_status='published'),
      'series', (select count(*) from public.card_series),
      'activeBoosters', (select count(*) from public.booster_types where is_active and not archived),
      'categories', (select count(*) from public.card_categories where is_active)
    ),
    'checks', jsonb_build_array(
      jsonb_build_object(
        'id','missing_classification','title','Cards missing Database 2.0 classification','severity','error','repairable',true,
        'count',(select count(*) from public.cards where category_id is null or variant_id is null or finish_id is null or collector_number is null or trim(coalesce(collector_number,''))=''),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'seriesId',series_id,'cardNumber',card_number) order by series_id,sort_order,id) from public.cards where category_id is null or variant_id is null or finish_id is null or collector_number is null or trim(coalesce(collector_number,''))=''),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','missing_artwork','title','Cards missing artwork','severity','error','repairable',false,
        'count',(select count(*) from public.cards where nullif(trim(coalesce(image_url,'')),'') is null or nullif(trim(coalesce(thumbnail_url,'')),'') is null),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'seriesId',series_id,'missingFront',nullif(trim(coalesce(image_url,'')),'') is null,'missingThumbnail',nullif(trim(coalesce(thumbnail_url,'')),'') is null) order by series_id,sort_order,id) from public.cards where nullif(trim(coalesce(image_url,'')),'') is null or nullif(trim(coalesce(thumbnail_url,'')),'') is null),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','duplicate_collector_numbers','title','Duplicate collector numbers within a series','severity','error','repairable',false,
        'count',(select count(*) from (select series_id,collector_number from public.cards where nullif(trim(coalesce(collector_number,'')),'') is not null group by series_id,collector_number having count(*)>1) d),
        'items',coalesce((select jsonb_agg(jsonb_build_object('seriesId',series_id,'collectorNumber',collector_number,'count',cnt,'cardIds',card_ids) order by series_id,collector_number) from (select series_id,collector_number,count(*) cnt,jsonb_agg(id order by id) card_ids from public.cards where nullif(trim(coalesce(collector_number,'')),'') is not null group by series_id,collector_number having count(*)>1) d),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','bad_slot_totals','title','Booster slots not totaling 100%','severity','error','repairable',true,
        'count',(select count(*) from (select s.id from public.booster_slots s left join public.booster_slot_rates r on r.slot_id=s.id group by s.id having abs(coalesce(sum(r.percentage),0)-100)>.001) d),
        'items',coalesce((select jsonb_agg(jsonb_build_object('slotId',slot_id,'boosterId',booster_id,'slotName',slot_name,'total',total) order by booster_id,slot_id) from (select s.id slot_id,s.booster_id,s.name slot_name,coalesce(sum(r.percentage),0) total from public.booster_slots s left join public.booster_slot_rates r on r.slot_id=s.id group by s.id,s.booster_id,s.name having abs(coalesce(sum(r.percentage),0)-100)>.001) d),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','empty_active_boosters','title','Active boosters with no eligible cards','severity','error','repairable',false,
        'count',(select count(*) from public.booster_types b where b.is_active and not b.archived and not exists(select 1 from public.cards c where public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'rewardMode',b.reward_mode,'seriesId',b.series_id) order by b.sort_order,b.id) from public.booster_types b where b.is_active and not b.archived and not exists(select 1 from public.cards c where public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','pullable_unreachable','title','Pullable cards excluded from every active booster','severity','warning','repairable',false,
        'count',(select count(*) from public.cards c where c.is_pullable and c.is_collectible and c.is_visible and c.publish_status='published' and c.pull_weight>0 and not exists(select 1 from public.booster_types b where b.is_active and not b.archived and public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'seriesId',c.series_id,'rarity',c.rarity,'categoryId',c.category_id) order by c.series_id,c.sort_order,c.id) from public.cards c where c.is_pullable and c.is_collectible and c.is_visible and c.publish_status='published' and c.pull_weight>0 and not exists(select 1 from public.booster_types b where b.is_active and not b.archived and public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','archived_in_active_pools','title','Archived cards referenced by active booster pools','severity','warning','repairable',true,
        'count',(select count(*) from public.booster_reward_cards rc join public.cards c on c.id=rc.card_id join public.booster_types b on b.id=rc.booster_id where c.publish_status='archived' and b.is_active and not b.archived),
        'items',coalesce((select jsonb_agg(jsonb_build_object('boosterId',rc.booster_id,'cardId',c.id,'cardName',c.name) order by rc.booster_id,c.id) from public.booster_reward_cards rc join public.cards c on c.id=rc.card_id join public.booster_types b on b.id=rc.booster_id where c.publish_status='archived' and b.is_active and not b.archived),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','invalid_availability','title','Cards with invalid availability dates','severity','warning','repairable',false,
        'count',(select count(*) from public.cards where available_from is not null and available_until is not null and available_until<=available_from),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'availableFrom',available_from,'availableUntil',available_until) order by id) from public.cards where available_from is not null and available_until is not null and available_until<=available_from),'[]'::jsonb)
      )
    )
  ) into report;
  return report;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_events_v88()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'bannerImageUrl', e.banner_image_url,
        'accentColor', e.accent_color,
        'startAt', e.start_at,
        'endAt', e.end_at,
        'isActive', e.is_active,
        'isHidden', e.is_hidden,
        'sortOrder', e.sort_order,
        'boosterCount', (
          select count(*)
          from public.booster_types b
          where b.event_id = e.id
        ),
        'cardCount', (
          select count(*)
          from public.cards c
          where c.event_id = e.id
        ),
        'cardIds', (
          select coalesce(
            jsonb_agg(c.id order by c.sort_order, c.id),
            '[]'::jsonb
          )
          from public.cards c
          where c.event_id = e.id
        ),
        'boosterIds', (
          select coalesce(
            jsonb_agg(b.id order by b.sort_order, b.id),
            '[]'::jsonb
          )
          from public.booster_types b
          where b.event_id = e.id
        ),
        'achievements', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', a.id,
                'key', a.achievement_key,
                'name', a.name,
                'description', a.description,
                'requirementType', a.requirement_type,
                'requirementValue', a.requirement_value,
                'rewardStarBits', a.reward_star_bits,
                'rewardTitle', a.reward_title,
                'isActive', a.is_active,
                'sortOrder', a.sort_order
              )
              order by a.sort_order, a.id
            ),
            '[]'::jsonb
          )
          from public.event_achievements a
          where a.event_id = e.id
        )
      )
      order by e.sort_order, e.start_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.starlight_events e;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_gift_history_v895(requested_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when public.is_content_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'userId',r.user_id,'recipient',coalesce(nullif(p.display_name,''),nullif(p.username,''),u.email,'Collector'),
    'title',r.title,'message',r.message,'rewardType',r.reward_type,'rewardPayload',r.reward_payload,
    'status',r.status,'createdAt',r.created_at,'claimedAt',r.claimed_at,'createdBy',r.created_by
  ) order by r.created_at desc),'[]'::jsonb) else '[]'::jsonb end
  from (select * from public.received_rewards where source_type='gift' order by created_at desc limit least(greatest(coalesce(requested_limit,100),1),500)) r
  join auth.users u on u.id=r.user_id left join public.profiles p on p.id=r.user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_system_diagnostics_v87()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  cards_count bigint;
  series_count bigint;
  boosters_count bigint;
  users_count bigint;
  manifest_count bigint;
  storage_count bigint;
  last_card_update timestamptz;
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  select count(*), max(updated_at) into cards_count, last_card_update from public.cards;
  select count(*) into series_count from public.card_series;
  select count(*) into boosters_count from public.booster_types;
  select count(*) into users_count from auth.users;
  select count(*) into manifest_count from public.site_asset_manifest;
  select count(*) into storage_count from storage.objects where bucket_id = 'site-assets';

  return jsonb_build_object(
    'siteVersion', 'V87.0',
    'databaseConnected', true,
    'siteAssetsBucketExists', exists(select 1 from storage.buckets where id = 'site-assets'),
    'cards', cards_count,
    'series', series_count,
    'boosters', boosters_count,
    'registeredUsers', users_count,
    'registeredManagedAssets', manifest_count,
    'physicalStorageObjects', storage_count,
    'lastCardUpdate', last_card_update,
    'checkedAt', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_twitch_dashboard_v890()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  config jsonb;
  rules jsonb;
  connections jsonb;
  grants jsonb;
  events jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select public.get_twitch_public_config_v890() into config;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  into rules
  from public.twitch_reward_rules r;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId',c.user_id,
        'twitchUserId',c.twitch_user_id,
        'login',c.twitch_login,
        'displayName',c.twitch_display_name,
        'avatarUrl',c.twitch_avatar_url,
        'linkedAt',c.linked_at,
        'profileName',coalesce(p.display_name,p.username),
        'username',p.username
      ) order by c.linked_at desc
    ),
    '[]'::jsonb
  )
  into connections
  from public.twitch_connections c
  left join public.profiles p on p.id=c.user_id;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.granted_at desc),'[]'::jsonb)
  into grants
  from (
    select * from public.twitch_reward_grants
    order by granted_at desc
    limit 200
  ) g;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.received_at desc),'[]'::jsonb)
  into events
  from (
    select * from public.twitch_reward_events
    order by received_at desc
    limit 500
  ) e;

  return jsonb_build_object(
    'config',config,
    'rules',rules,
    'connections',connections,
    'grants',grants,
    'events',events
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_news_posts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r text; result jsonb; begin select role::text into r from public.site_roles where user_id=auth.uid(); if coalesce(r,'') not in ('owner','admin','administrator') then raise exception 'Administrator access is required.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'summary',n.summary,'body',n.body,'imageUrl',n.image_url,'publishedAt',n.published_at,'isPublished',n.is_published,'isPinned',n.is_pinned,'createdAt',n.created_at,'updatedAt',n.updated_at) order by n.is_pinned desc,n.published_at desc),'[]'::jsonb) into result from public.starlight_news_posts n; return result; end $function$
;

CREATE OR REPLACE FUNCTION public.admin_list_reward_codes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    if auth.uid() is null or not public.is_site_admin() then
        raise exception 'Administrator access is required.';
    end if;

    return coalesce((
        select jsonb_agg(
            jsonb_build_object(
                'id', reward_codes.id,
                'label', reward_codes.label,
                'codePreview', reward_codes.code_preview,
                'active', reward_codes.active,
                'maxUses', reward_codes.max_uses,
                'currentUses', reward_codes.current_uses,
                'startsAt', reward_codes.starts_at,
                'expiresAt', reward_codes.expires_at,
                'createdAt', reward_codes.created_at,
                'rewardType', reward_code_rewards.reward_type,
                'cardId', reward_code_rewards.card_id,
                'cardQuantity', reward_code_rewards.card_quantity,
                'boosterCardIds', reward_code_rewards.booster_card_ids,
                'starBitsAmount', reward_code_rewards.star_bits_amount
            ) order by reward_codes.created_at desc
        )
        from public.reward_codes
        join public.reward_code_rewards on reward_code_rewards.code_id = reward_codes.id
    ), '[]'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_staff_audit_log(requested_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
    actor_role text;
    safe_limit integer;
    result jsonb;
begin
    select role into actor_role
    from public.site_roles
    where user_id = auth.uid();

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    safe_limit := greatest(1, least(coalesce(requested_limit, 100), 500));

    select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb)
    into result
    from (
        select
            l.created_at,
            jsonb_build_object(
                'id', l.id,
                'createdAt', l.created_at,
                'action', l.action,
                'actorUserId', l.actor_user_id,
                'actorEmail', actor.email,
                'targetUserId', l.target_user_id,
                'targetEmail', target.email,
                'resourceType', l.target_resource_type,
                'resourceId', l.target_resource_id,
                'details', l.details
            ) as row_data
        from public.staff_audit_log l
        left join auth.users actor on actor.id = l.actor_user_id
        left join auth.users target on target.id = l.target_user_id
        order by l.created_at desc
        limit safe_limit
    ) q;

    return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_staff_users()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
    actor_role text;
    result jsonb;
begin
    select role into actor_role
    from public.site_roles
    where user_id = auth.uid();

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    select coalesce(jsonb_agg(
        jsonb_build_object(
            'userId', u.id,
            'email', u.email,
            'username', p.username,
            'displayName', p.display_name,
            'role', r.role,
            'assignedAt', r.created_at,
            'updatedAt', r.updated_at
        ) order by
            public.staff_role_rank(coalesce(r.role, '')) desc,
            coalesce(p.display_name, u.email)
    ), '[]'::jsonb)
    into result
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.site_roles r on r.user_id = u.id;

    return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_user_directory(requested_search text DEFAULT NULL::text, requested_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare out_json jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',u.id,'email',u.email,'accountCreatedAt',u.created_at,'lastSignInAt',u.last_sign_in_at,'username',p.username,'displayName',p.display_name,'profileVisibility',p.profile_visibility,'role',coalesce(sr.role::text,'collector'),'twitchLogin',tc.twitch_login,'twitchDisplayName',tc.twitch_display_name) order by u.created_at desc),'[]'::jsonb) into out_json
  from auth.users u left join public.profiles p on p.id=u.id left join public.site_roles sr on sr.user_id=u.id left join public.twitch_connections tc on tc.user_id=u.id
  where requested_search is null or requested_search='' or lower(coalesce(u.email,'')||' '||coalesce(p.username,'')||' '||coalesce(p.display_name,'')||' '||coalesce(tc.twitch_login,'')) like '%'||lower(requested_search)||'%'
  limit greatest(1,least(coalesce(requested_limit,500),2000));
  return out_json;
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_manual_twitch_reward_v890(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare target record; result jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  select * into target from public.twitch_connections where lower(twitch_login)=lower(trim(payload->>'twitchLogin'));
  if not found then raise exception 'No linked collector was found for that Twitch username.'; end if;
  result:=public.apply_twitch_reward_v890(target.user_id,payload->>'rewardType',nullif(payload->>'starBitsAmount','')::bigint,nullif(payload->>'cardId',''),nullif(payload->>'cardQuantity','')::integer,nullif(payload->>'boosterId',''),null,null,target.twitch_user_id,'manual',auth.uid());
  return result||jsonb_build_object('collectorUserId',target.user_id,'twitchLogin',target.twitch_login);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_register_site_asset_v87(asset_path text, original_name text, mime_type text, file_size bigint, public_url text, asset_folder text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  insert into public.site_asset_manifest (
    path, original_name, mime_type, file_size, public_url,
    folder, uploaded_by, created_at, updated_at
  ) values (
    asset_path, original_name, mime_type, file_size, public_url,
    asset_folder, auth.uid(), now(), now()
  )
  on conflict (path) do update set
    original_name = excluded.original_name,
    mime_type = excluded.mime_type,
    file_size = excluded.file_size,
    public_url = excluded.public_url,
    folder = excluded.folder,
    uploaded_by = auth.uid(),
    updated_at = now();

  return jsonb_build_object('success', true, 'path', asset_path);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_register_site_asset_v8703(asset_path text, original_name text, mime_type text, file_size bigint, public_url text, asset_folder text, source_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  insert into public.site_asset_manifest (
    path, original_name, mime_type, file_size, public_url,
    folder, source_url, uploaded_by, created_at, updated_at
  ) values (
    asset_path, original_name, mime_type, file_size, public_url,
    asset_folder, nullif(trim(source_url),''), auth.uid(), now(), now()
  )
  on conflict (path) do update set
    original_name = excluded.original_name,
    mime_type = excluded.mime_type,
    file_size = excluded.file_size,
    public_url = excluded.public_url,
    folder = excluded.folder,
    source_url = coalesce(excluded.source_url, public.site_asset_manifest.source_url),
    uploaded_by = auth.uid(),
    updated_at = now();

  return jsonb_build_object('success', true, 'path', asset_path, 'publicUrl', public_url);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_relink_migrated_assets_v8703()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  card_fronts integer := 0;
  card_thumbs integer := 0;
  booster_packs integer := 0;
  booster_backs integer := 0;
  series_images integer := 0;
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  -- Prefer an exact original URL match when available. Fall back to the
  -- deterministic migration filename used by the Content Studio.
  with chosen as (
    select c.id,
      coalesce(
        (select m.public_url from public.site_asset_manifest m
         where m.source_url = c.image_url and m.folder='card-fronts'
         order by m.updated_at desc limit 1),
        (select m.public_url from public.site_asset_manifest m
         where m.folder='card-fronts'
           and m.path like 'card-fronts/migrated-card-' || lower(regexp_replace(c.id,'[^a-zA-Z0-9._-]+','-','g')) || '-front.%'
         order by m.updated_at desc limit 1)
      ) new_url
    from public.cards c
  )
  update public.cards c
  set image_url=chosen.new_url, updated_at=now()
  from chosen
  where c.id=chosen.id and chosen.new_url is not null and c.image_url is distinct from chosen.new_url;
  get diagnostics card_fronts = row_count;

  with chosen as (
    select c.id,
      coalesce(
        (select m.public_url from public.site_asset_manifest m
         where m.source_url = c.thumbnail_url and m.folder='thumbnails'
         order by m.updated_at desc limit 1),
        (select m.public_url from public.site_asset_manifest m
         where m.folder='thumbnails'
           and m.path like 'thumbnails/migrated-card-' || lower(regexp_replace(c.id,'[^a-zA-Z0-9._-]+','-','g')) || '-thumb.%'
         order by m.updated_at desc limit 1)
      ) new_url
    from public.cards c
  )
  update public.cards c
  set thumbnail_url=chosen.new_url, updated_at=now()
  from chosen
  where c.id=chosen.id and chosen.new_url is not null and c.thumbnail_url is distinct from chosen.new_url;
  get diagnostics card_thumbs = row_count;

  with chosen as (
    select b.id,
      coalesce(
        (select m.public_url from public.site_asset_manifest m
         where m.source_url = b.pack_image_url and m.folder='booster-packs'
         order by m.updated_at desc limit 1),
        (select m.public_url from public.site_asset_manifest m
         where m.folder='booster-packs'
           and m.path like 'booster-packs/migrated-booster-' || lower(regexp_replace(b.id,'[^a-zA-Z0-9._-]+','-','g')) || '-pack.%'
         order by m.updated_at desc limit 1)
      ) new_url
    from public.booster_types b
  )
  update public.booster_types b
  set pack_image_url=chosen.new_url, updated_at=now()
  from chosen
  where b.id=chosen.id and chosen.new_url is not null and b.pack_image_url is distinct from chosen.new_url;
  get diagnostics booster_packs = row_count;

  with chosen as (
    select b.id,
      coalesce(
        (select m.public_url from public.site_asset_manifest m
         where m.source_url = b.card_back_url and m.folder='card-backs'
         order by m.updated_at desc limit 1),
        (select m.public_url from public.site_asset_manifest m
         where m.folder='card-backs'
           and m.path like 'card-backs/migrated-booster-' || lower(regexp_replace(b.id,'[^a-zA-Z0-9._-]+','-','g')) || '-back.%'
         order by m.updated_at desc limit 1)
      ) new_url
    from public.booster_types b
  )
  update public.booster_types b
  set card_back_url=chosen.new_url, updated_at=now()
  from chosen
  where b.id=chosen.id and chosen.new_url is not null and b.card_back_url is distinct from chosen.new_url;
  get diagnostics booster_backs = row_count;

  with chosen as (
    select s.id,
      coalesce(
        (select m.public_url from public.site_asset_manifest m
         where m.source_url = s.booster_image_url and m.folder='series'
         order by m.updated_at desc limit 1),
        (select m.public_url from public.site_asset_manifest m
         where m.folder='series'
           and m.path like 'series/migrated-series-' || lower(regexp_replace(s.id,'[^a-zA-Z0-9._-]+','-','g')) || '.%'
         order by m.updated_at desc limit 1)
      ) new_url
    from public.card_series s
  )
  update public.card_series s
  set booster_image_url=chosen.new_url, updated_at=now()
  from chosen
  where s.id=chosen.id and chosen.new_url is not null and s.booster_image_url is distinct from chosen.new_url;
  get diagnostics series_images = row_count;

  return jsonb_build_object(
    'success', true,
    'cardFrontsUpdated', card_fronts,
    'cardThumbnailsUpdated', card_thumbs,
    'boosterPacksUpdated', booster_packs,
    'boosterBacksUpdated', booster_backs,
    'seriesImagesUpdated', series_images,
    'totalUpdated', card_fronts + card_thumbs + booster_packs + booster_backs + series_images
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_remove_staff_role(requested_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    actor_id uuid := auth.uid();
    actor_role text;
    target_role text;
    owner_count integer;
begin
    select role into actor_role
    from public.site_roles
    where user_id = actor_id;

    select role into target_role
    from public.site_roles
    where user_id = requested_user_id;

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    if target_role is null then
        return jsonb_build_object('success', true, 'removed', false);
    end if;

    if requested_user_id = actor_id then
        raise exception 'You cannot remove your own staff access.';
    end if;

    if actor_role = 'admin' and target_role in ('owner', 'admin') then
        raise exception 'Administrators cannot remove owners or other administrators.';
    end if;

    if target_role = 'owner' then
        select count(*) into owner_count
        from public.site_roles
        where role = 'owner';

        if owner_count <= 1 then
            raise exception 'The final owner cannot be removed.';
        end if;
    end if;

    delete from public.site_roles
    where user_id = requested_user_id;

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id,
        'staff_role_removed',
        requested_user_id,
        'user',
        requested_user_id::text,
        jsonb_build_object('oldRole', target_role)
    );

    return jsonb_build_object('success', true, 'removed', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_rename_booster_id_v901(requested_old_id text, requested_new_id text, requested_new_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_row public.booster_types;
  new_payload jsonb;
  ref record;
  changed bigint;
  updates jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_old_id := lower(trim(requested_old_id));
  requested_new_id := lower(trim(requested_new_id));

  if requested_new_id is null or requested_new_id !~ '^[a-z0-9_-]{3,80}$' then
    raise exception 'The new booster ID may only contain lowercase letters, numbers, underscores, and hyphens.';
  end if;
  if requested_old_id=requested_new_id then
    raise exception 'Enter a different booster ID.';
  end if;

  select * into old_row from public.booster_types where id=requested_old_id for update;
  if not found then raise exception 'Booster % does not exist.',requested_old_id; end if;
  if exists(select 1 from public.booster_types where id=requested_new_id) then
    raise exception 'A booster with ID % already exists.',requested_new_id;
  end if;

  new_payload := to_jsonb(old_row) || jsonb_build_object(
    'id',requested_new_id,
    'name',coalesce(nullif(trim(requested_new_name),''),old_row.name),
    'updated_at',now()
  );

  insert into public.booster_types
  select (jsonb_populate_record(null::public.booster_types,new_payload)).*;

  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name
    from pg_constraint c
    join unnest(c.conkey) with ordinality ck(attnum,ord) on true
    join unnest(c.confkey) with ordinality fk(attnum,ord) using(ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=ck.attnum
    join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=fk.attnum
    where c.contype='f'
      and c.confrelid='public.booster_types'::regclass
      and pa.attname='id'
  loop
    execute format('update %s set %I=$1 where %I=$2',ref.table_name,ref.column_name,ref.column_name)
      using requested_new_id,requested_old_id;
    get diagnostics changed=row_count;
    updates := updates || jsonb_build_array(jsonb_build_object(
      'table',ref.table_name,'column',ref.column_name,'updated',changed
    ));
  end loop;

  -- Repair known JSON metadata links that are not protected by foreign keys.
  if to_regclass('public.received_rewards') is not null then
    execute $q$
      update public.received_rewards
      set reward_payload=jsonb_set(reward_payload,'{boosterId}',to_jsonb($1::text),true)
      where reward_payload->>'boosterId'=$2
    $q$ using requested_new_id,requested_old_id;
  end if;

  if to_regclass('public.star_bits_transactions') is not null then
    execute $q$
      update public.star_bits_transactions
      set metadata=jsonb_set(metadata,'{boosterId}',to_jsonb($1::text),true)
      where metadata->>'boosterId'=$2
    $q$ using requested_new_id,requested_old_id;
  end if;

  if to_regclass('public.user_notifications') is not null then
    execute $q$
      update public.user_notifications
      set route_params=jsonb_set(coalesce(route_params,'{}'::jsonb),'{boosterId}',to_jsonb($1::text),true)
      where route_params->>'boosterId'=$2
    $q$ using requested_new_id,requested_old_id;
  end if;

  delete from public.booster_types where id=requested_old_id;

  return jsonb_build_object(
    'success',true,
    'oldId',requested_old_id,
    'newId',requested_new_id,
    'referencesUpdated',updates
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_repair_database_health_v902(requested_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare affected integer := 0;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  case requested_action
    when 'missing_classification' then
      update public.cards set
        category_id=coalesce(category_id,'character'),
        variant_id=coalesce(variant_id,'standard-art'),
        finish_id=coalesce(finish_id,'standard'),
        collector_number=coalesce(nullif(trim(collector_number),''),card_number),
        updated_at=now()
      where category_id is null or variant_id is null or finish_id is null or collector_number is null or trim(coalesce(collector_number,''))='';
      get diagnostics affected = row_count;
    when 'bad_slot_totals' then
      with totals as (
        select slot_id,sum(percentage) total from public.booster_slot_rates group by slot_id having sum(percentage)>0 and abs(sum(percentage)-100)>.001
      )
      update public.booster_slot_rates r set percentage=round((r.percentage/t.total)*100,4)
      from totals t where r.slot_id=t.slot_id;
      get diagnostics affected = row_count;
    when 'archived_in_active_pools' then
      delete from public.booster_reward_cards rc using public.cards c, public.booster_types b
      where c.id=rc.card_id and b.id=rc.booster_id and c.publish_status='archived' and b.is_active and not b.archived;
      get diagnostics affected = row_count;
    else
      raise exception 'Unknown or unsafe repair action: %', requested_action;
  end case;

  return jsonb_build_object('success',true,'action',requested_action,'affected',affected);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_safe_delete_booster_v901(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ref record;
  ref_count bigint;
  blockers jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if not exists(select 1 from public.booster_types where id=requested_id) then
    raise exception 'Booster % does not exist.',requested_id;
  end if;

  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confdeltype
    from pg_constraint c
    join unnest(c.conkey) with ordinality ck(attnum,ord) on true
    join unnest(c.confkey) with ordinality fk(attnum,ord) using(ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=ck.attnum
    join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=fk.attnum
    where c.contype='f'
      and c.confrelid='public.booster_types'::regclass
      and pa.attname='id'
      and c.confdeltype in ('a','r')
  loop
    execute format('select count(*) from %s where %I=$1',ref.table_name,ref.column_name)
      into ref_count using requested_id;
    if ref_count>0 then
      blockers := blockers || jsonb_build_array(jsonb_build_object(
        'table',ref.table_name,'column',ref.column_name,'count',ref_count
      ));
    end if;
  end loop;

  if jsonb_array_length(blockers)>0 then
    raise exception 'This booster still has protected references. Use Inspect References, rename it, detach it, or archive it first. Details: %',blockers::text;
  end if;

  delete from public.booster_types where id=requested_id;
  return jsonb_build_object('success',true,'deletedId',requested_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_safe_delete_booster_v9013(requested_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  normalized_id text := lower(trim(requested_id));
  affected bigint := 0;
  cleanup jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id is null or normalized_id = '' then
    raise exception 'Choose a booster to delete.';
  end if;

  if normalized_id = 'free_daily' then
    raise exception 'The system Daily Free Booster cannot be deleted.';
  end if;

  if not exists (
    select 1 from public.booster_types where id = normalized_id
  ) then
    raise exception using message = format(
      'Booster "%s" does not exist.',
      normalized_id
    );
  end if;

  -- These operational references may safely be removed or detached.
  if to_regclass('public.twitch_reward_rules') is not null then
    delete from public.twitch_reward_rules where booster_id = normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(
      jsonb_build_object('table', 'twitch_reward_rules', 'action', 'deleted', 'count', affected)
    );
  end if;

  if to_regclass('public.star_bits_booster_purchases') is not null then
    update public.star_bits_booster_purchases
    set booster_id = null
    where booster_id = normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(
      jsonb_build_object('table', 'star_bits_booster_purchases', 'action', 'detached', 'count', affected)
    );
  end if;

  if to_regclass('public.received_rewards') is not null then
    update public.received_rewards
    set status = case when status = 'pending' then 'cancelled' else status end,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'deletedBoosterId', normalized_id
        )
    where booster_id = normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(
      jsonb_build_object('table', 'received_rewards', 'action', 'cancelled/detached', 'count', affected)
    );
  end if;

  -- Child configuration tables use ON DELETE CASCADE.
  delete from public.booster_types
  where id = normalized_id;

  return jsonb_build_object(
    'success', true,
    'deletedId', normalized_id,
    'cleanup', cleanup
  );
exception
  when foreign_key_violation then
    raise exception using message = format(
      'Booster "%s" is still referenced elsewhere. Use Inspect References, detach those records, and try again.',
      normalized_id
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_booster_complete_v9012(payload jsonb, requested_slots jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  bid text := lower(trim(payload->>'id'));
  reward_mode text := coalesce(nullif(payload->>'rewardMode', ''), 'slots');
  slot_item jsonb;
  slot_id_value bigint;
  slot_key_value text;
  slot_name_value text;
  rate_pair record;
  rate_total numeric;
  kept_keys text[] := array[]::text[];
  result jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Booster ID is invalid.';
  end if;

  -- Save or create the parent booster before its child slot records.
  result := public.admin_save_booster_v90(payload);

  if reward_mode = 'slots' then
    if jsonb_typeof(coalesce(requested_slots, '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(requested_slots, '[]'::jsonb)) = 0 then
      raise exception
        'This booster uses rarity slots, but no slots were provided.';
    end if;

    for slot_item in
      select value
      from jsonb_array_elements(
        coalesce(requested_slots, '[]'::jsonb)
      )
    loop
      slot_key_value := lower(
        regexp_replace(
          coalesce(
            nullif(trim(slot_item->>'slotKey'), ''),
            'slot_' ||
            (coalesce(array_length(kept_keys, 1), 0) + 1)::text
          ),
          '[^a-z0-9_-]+',
          '_',
          'g'
        )
      );

      slot_name_value := coalesce(
        nullif(trim(slot_item->>'name'), ''),
        initcap(replace(slot_key_value, '_', ' '))
      );

      kept_keys := array_append(kept_keys, slot_key_value);

      select coalesce(sum(value::numeric), 0)
      into rate_total
      from jsonb_each_text(
        coalesce(slot_item->'rates', '{}'::jsonb)
      );

      if abs(rate_total - 100) > 0.001 then
        raise exception
          'Slot "%" totals %. Every rarity slot must total exactly 100%%.',
          slot_name_value,
          rate_total;
      end if;

      insert into public.booster_slots (
        booster_id,
        slot_key,
        name,
        quantity,
        sort_order,
        updated_at
      )
      values (
        bid,
        slot_key_value,
        slot_name_value,
        greatest(
          coalesce((slot_item->>'quantity')::integer, 1),
          1
        ),
        coalesce((slot_item->>'sortOrder')::integer, 0),
        now()
      )
      on conflict (booster_id, slot_key)
      do update set
        name = excluded.name,
        quantity = excluded.quantity,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id into slot_id_value;

      delete from public.booster_slot_rates
      where slot_id = slot_id_value;

      for rate_pair in
        select key, value
        from jsonb_each_text(
          coalesce(slot_item->'rates', '{}'::jsonb)
        )
      loop
        insert into public.booster_slot_rates (
          slot_id,
          rarity,
          percentage
        )
        values (
          slot_id_value,
          rate_pair.key,
          greatest(rate_pair.value::numeric, 0)
        );
      end loop;
    end loop;

    delete from public.booster_slots
    where booster_id = bid
      and not (slot_key = any(kept_keys));
  else
    -- Remove obsolete rarity slots when switching the booster
    -- to a non-slot reward mode.
    delete from public.booster_slots
    where booster_id = bid;
  end if;

  return result || jsonb_build_object(
    'success', true,
    'id', bid,
    'slotCount',
      case
        when reward_mode = 'slots'
          then coalesce(array_length(kept_keys, 1), 0)
        else 0
      end
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_booster_complete_v9013(payload jsonb, requested_slots jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  bid text := lower(trim(payload->>'id'));
  reward_mode text := coalesce(nullif(payload->>'rewardMode', ''), 'slots');
  slot_item jsonb;
  slot_id_value bigint;
  slot_key_value text;
  slot_name_value text;
  rate_pair record;
  rate_total numeric;
  kept_keys text[] := array[]::text[];
  saved_slot_count integer := 0;
  result jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Booster ID is invalid.';
  end if;

  if nullif(trim(payload->>'name'), '') is null then
    raise exception 'Booster name is required.';
  end if;

  -- Save the parent record and its exact/custom reward-card rows first.
  result := public.admin_save_booster_v90(payload);

  if reward_mode = 'slots' then
    if jsonb_typeof(coalesce(requested_slots, '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(requested_slots, '[]'::jsonb)) = 0 then
      raise exception 'This booster uses rarity slots, but no slots were provided.';
    end if;

    for slot_item in
      select value
      from jsonb_array_elements(coalesce(requested_slots, '[]'::jsonb))
    loop
      slot_key_value := lower(
        regexp_replace(
          coalesce(
            nullif(trim(slot_item->>'slotKey'), ''),
            'slot_' || (saved_slot_count + 1)::text
          ),
          '[^a-z0-9_-]+',
          '_',
          'g'
        )
      );

      if slot_key_value = any(kept_keys) then
        raise exception using message = format(
          'Two rarity slots use the same key "%s". Give each slot a unique name.',
          slot_key_value
        );
      end if;

      slot_name_value := coalesce(
        nullif(trim(slot_item->>'name'), ''),
        initcap(replace(slot_key_value, '_', ' '))
      );

      select coalesce(sum(value::numeric), 0)
      into rate_total
      from jsonb_each_text(coalesce(slot_item->'rates', '{}'::jsonb));

      if abs(rate_total - 100) > 0.001 then
        raise exception using message = format(
          'Slot "%s" totals %s%%. Every rarity slot must total exactly 100%%.',
          slot_name_value,
          trim(to_char(rate_total, 'FM999999990.####'))
        );
      end if;

      kept_keys := array_append(kept_keys, slot_key_value);
      saved_slot_count := saved_slot_count + 1;

      insert into public.booster_slots (
        booster_id,
        slot_key,
        name,
        quantity,
        sort_order,
        updated_at
      )
      values (
        bid,
        slot_key_value,
        slot_name_value,
        greatest(coalesce((slot_item->>'quantity')::integer, 1), 1),
        coalesce((slot_item->>'sortOrder')::integer, (saved_slot_count - 1) * 10),
        now()
      )
      on conflict (booster_id, slot_key)
      do update set
        name = excluded.name,
        quantity = excluded.quantity,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id into slot_id_value;

      delete from public.booster_slot_rates
      where slot_id = slot_id_value;

      for rate_pair in
        select key, value
        from jsonb_each_text(coalesce(slot_item->'rates', '{}'::jsonb))
      loop
        if rate_pair.key not in ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary') then
          raise exception using message = format(
            'Slot "%s" contains the unsupported rarity "%s".',
            slot_name_value,
            rate_pair.key
          );
        end if;

        if rate_pair.value::numeric < 0 or rate_pair.value::numeric > 100 then
          raise exception using message = format(
            'The %s rate in slot "%s" must be between 0 and 100.',
            rate_pair.key,
            slot_name_value
          );
        end if;

        insert into public.booster_slot_rates (
          slot_id,
          rarity,
          percentage,
          updated_at
        )
        values (
          slot_id_value,
          rate_pair.key,
          rate_pair.value::numeric,
          now()
        );
      end loop;
    end loop;

    delete from public.booster_slots
    where booster_id = bid
      and not (slot_key = any(kept_keys));
  else
    -- Non-slot packs should not retain stale rarity-slot configuration.
    delete from public.booster_slots
    where booster_id = bid;
  end if;

  return coalesce(result, '{}'::jsonb) || jsonb_build_object(
    'success', true,
    'id', bid,
    'slotCount', saved_slot_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_booster_v84(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare bid text:=lower(trim(payload->>'id')); rewards jsonb:=coalesce(payload->'rewardCards','[]'::jsonb); r jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then raise exception 'Booster ID is invalid.'; end if;
  insert into public.booster_types(id,name,description,star_bits_cost,is_active,sort_order,pack_image_url,card_back_url,reward_mode,series_id,card_count,bonus_star_bits,archived,updated_at)
  values(bid,trim(payload->>'name'),nullif(trim(payload->>'description'),''),greatest(coalesce((payload->>'starBitsCost')::integer,0),0),coalesce((payload->>'isActive')::boolean,false),coalesce((payload->>'sortOrder')::integer,0),coalesce(nullif(trim(payload->>'packImageUrl'),''),'site_assets/series01_rising_star_booster.png'),coalesce(nullif(trim(payload->>'cardBackUrl'),''),'site_assets/StarlightCard_Back_NewLogo.png'),coalesce(payload->>'rewardMode','slots'),nullif(payload->>'seriesId',''),greatest(coalesce((payload->>'cardCount')::integer,1),1),greatest(coalesce((payload->>'bonusStarBits')::integer,0),0),coalesce((payload->>'archived')::boolean,false),now())
  on conflict(id) do update set name=excluded.name,description=excluded.description,star_bits_cost=excluded.star_bits_cost,is_active=excluded.is_active,sort_order=excluded.sort_order,pack_image_url=excluded.pack_image_url,card_back_url=excluded.card_back_url,reward_mode=excluded.reward_mode,series_id=excluded.series_id,card_count=excluded.card_count,bonus_star_bits=excluded.bonus_star_bits,archived=excluded.archived,updated_at=now();
  delete from public.booster_reward_cards where booster_id=bid;
  for r in select * from jsonb_array_elements(rewards) loop
    insert into public.booster_reward_cards(booster_id,card_id,quantity,weight,guaranteed,sort_order)
    values(bid,r->>'cardId',greatest(coalesce((r->>'quantity')::integer,1),1),greatest(coalesce((r->>'weight')::numeric,1),0),coalesce((r->>'guaranteed')::boolean,false),coalesce((r->>'sortOrder')::integer,0));
  end loop;
  return jsonb_build_object('success',true,'id',bid);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_booster_v90(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result jsonb;
begin
  result:=public.admin_save_booster_v84(payload);
  update public.booster_types set
    builder_mode=coalesce(nullif(payload->>'builderMode',''),'guided'),
    odds_preset=coalesce(nullif(payload->>'oddsPreset',''),'standard'),
    category_ids=coalesce(array(select jsonb_array_elements_text(coalesce(payload->'categoryIds','[]'::jsonb))),'{}'),
    finish_ids=coalesce(array(select jsonb_array_elements_text(coalesce(payload->'finishIds','[]'::jsonb))),'{}'),
    exclude_promos=coalesce((payload->>'excludePromos')::boolean,true),
    allow_duplicates=coalesce((payload->>'allowDuplicates')::boolean,true),
    updated_at=now()
  where id=lower(trim(payload->>'id'));
  return result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_booster_v9011(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result jsonb;
  bid text:=lower(trim(payload->>'id'));
  reward_mode text:=coalesce(nullif(payload->>'rewardMode',''),'slots');
  slot jsonb;
  saved_slot_id bigint;
  keep_slot_keys text[]:=array[]::text[];
  slot_key_value text;
  rarity_name text;
  rarity_value numeric;
  rarity_total numeric;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Booster ID is invalid.';
  end if;

  result:=public.admin_save_booster_v90(payload);

  if reward_mode='slots' then
    if jsonb_typeof(coalesce(payload->'slots','[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(payload->'slots','[]'::jsonb))=0 then
      raise exception 'This booster uses rarity slots, but no slots were provided.';
    end if;

    for slot in select value from jsonb_array_elements(coalesce(payload->'slots','[]'::jsonb)) loop
      slot_key_value:=lower(regexp_replace(
        coalesce(nullif(trim(slot->>'slotKey'),''),'slot_'||(coalesce(array_length(keep_slot_keys,1),0)+1)::text),
        '[^a-z0-9_-]+','_','g'
      ));

      if slot_key_value=any(keep_slot_keys) then
        raise exception using message=format('Duplicate booster slot key: %s',slot_key_value);
      end if;
      keep_slot_keys:=array_append(keep_slot_keys,slot_key_value);

      select coalesce(sum(value::numeric),0)
      into rarity_total
      from jsonb_each_text(coalesce(slot->'rates','{}'::jsonb));

      if abs(rarity_total-100)>0.001 then
        raise exception using message=format(
          'Slot "%s" totals %s%%. Every rarity slot must total exactly 100%%.',
          coalesce(nullif(trim(slot->>'name'),''),slot_key_value),rarity_total
        );
      end if;

      insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order,updated_at)
      values(
        bid,
        slot_key_value,
        coalesce(nullif(trim(slot->>'name'),''),'Card Slot'),
        greatest(coalesce((slot->>'quantity')::integer,1),1),
        coalesce((slot->>'sortOrder')::integer,0),
        now()
      )
      on conflict(booster_id,slot_key) do update set
        name=excluded.name,
        quantity=excluded.quantity,
        sort_order=excluded.sort_order,
        updated_at=now()
      returning id into saved_slot_id;

      delete from public.booster_slot_rates where slot_id=saved_slot_id;
      foreach rarity_name in array array['Common','Uncommon','Rare','Epic','Legendary'] loop
        rarity_value:=coalesce((slot->'rates'->>rarity_name)::numeric,0);
        insert into public.booster_slot_rates(slot_id,rarity,percentage,updated_at)
        values(saved_slot_id,rarity_name,greatest(least(rarity_value,100),0),now());
      end loop;
    end loop;

    delete from public.booster_slots
    where booster_id=bid and not(slot_key=any(keep_slot_keys));
  else
    delete from public.booster_slots where booster_id=bid;
  end if;

  return result||jsonb_build_object('success',true,'id',bid,'savedSlots',coalesce(array_length(keep_slot_keys,1),0));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_card_subcategory_v9021(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sid text := lower(trim(payload->>'id'));
  sname text := trim(payload->>'name');
  suggested_category text := nullif(trim(payload->>'categoryId'),'');
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if sid is null or sid !~ '^[a-z0-9][a-z0-9_-]{1,59}$' then
    raise exception 'Subcategory ID must use 2–60 lowercase letters, numbers, hyphens, or underscores.';
  end if;
  if sname is null or length(sname) < 2 then
    raise exception 'Subcategory name is required.';
  end if;
  if suggested_category is not null and not exists(select 1 from public.card_categories where id=suggested_category) then
    raise exception 'The suggested category does not exist.';
  end if;

  insert into public.card_subcategories(id,category_id,name,description,sort_order,is_active)
  values(
    sid,
    suggested_category,
    sname,
    nullif(trim(payload->>'description'),''),
    coalesce((payload->>'sortOrder')::integer,0),
    coalesce((payload->>'isActive')::boolean,true)
  )
  on conflict(id) do update set
    category_id=excluded.category_id,
    name=excluded.name,
    description=excluded.description,
    sort_order=excluded.sort_order,
    is_active=excluded.is_active;

  return jsonb_build_object('success',true,'id',sid);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_card_v84(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cid text:=lower(trim(payload->>'id')); sid text:=payload->>'seriesId';
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if cid is null or cid !~ '^[a-z0-9_-]{3,60}$' then raise exception 'Card ID is invalid.'; end if;
  if not exists(select 1 from public.card_series where id=sid) then raise exception 'Select a valid series.'; end if;
  insert into public.cards(id,series_id,card_number,name,rarity,image_url,thumbnail_url,description,artist,sort_order,is_visible,is_collectible,is_pullable,pull_weight,updated_at)
  values(cid,sid,trim(payload->>'cardNumber'),trim(payload->>'name'),payload->>'rarity',trim(payload->>'imageUrl'),coalesce(nullif(trim(payload->>'thumbnailUrl'),''),trim(payload->>'imageUrl')),nullif(trim(payload->>'description'),''),nullif(trim(payload->>'artist'),''),coalesce((payload->>'sortOrder')::integer,0),coalesce((payload->>'isVisible')::boolean,true),coalesce((payload->>'isCollectible')::boolean,true),coalesce((payload->>'isPullable')::boolean,true),greatest(coalesce((payload->>'pullWeight')::numeric,1),0),now())
  on conflict(id) do update set series_id=excluded.series_id,card_number=excluded.card_number,name=excluded.name,rarity=excluded.rarity,image_url=excluded.image_url,thumbnail_url=excluded.thumbnail_url,description=excluded.description,artist=excluded.artist,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_collectible=excluded.is_collectible,is_pullable=excluded.is_pullable,pull_weight=excluded.pull_weight,updated_at=now();
  return jsonb_build_object('success',true,'id',cid);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_card_v90(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cid text:=lower(trim(payload->>'id')); sid text:=payload->>'seriesId'; tag_name text; tag_id_value bigint;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if cid is null or cid !~ '^[a-z0-9_-]{3,60}$' then raise exception 'Card ID is invalid.'; end if;
  if not exists(select 1 from public.card_series where id=sid) then raise exception 'Select a valid series.'; end if;
  insert into public.cards(id,series_id,card_number,collector_number,name,rarity,category_id,subcategory_id,variant_id,finish_id,image_url,thumbnail_url,card_back_url,description,artist,distribution_type,is_promo,is_event_exclusive,available_from,available_until,publish_status,sort_order,is_visible,is_collectible,is_pullable,pull_weight,updated_at)
  values(cid,sid,trim(payload->>'cardNumber'),coalesce(nullif(trim(payload->>'collectorNumber'),''),trim(payload->>'cardNumber')),trim(payload->>'name'),payload->>'rarity',nullif(payload->>'categoryId',''),nullif(payload->>'subcategoryId',''),nullif(payload->>'variantId',''),nullif(payload->>'finishId',''),trim(payload->>'imageUrl'),coalesce(nullif(trim(payload->>'thumbnailUrl'),''),trim(payload->>'imageUrl')),nullif(trim(payload->>'cardBackUrl'),''),nullif(trim(payload->>'description'),''),nullif(trim(payload->>'artist'),''),coalesce(nullif(payload->>'distributionType',''),'booster_pull'),coalesce((payload->>'isPromo')::boolean,false),coalesce((payload->>'isEventExclusive')::boolean,false),nullif(payload->>'availableFrom','')::timestamptz,nullif(payload->>'availableUntil','')::timestamptz,coalesce(nullif(payload->>'publishStatus',''),'published'),coalesce((payload->>'sortOrder')::integer,0),coalesce((payload->>'isVisible')::boolean,true),coalesce((payload->>'isCollectible')::boolean,true),coalesce((payload->>'isPullable')::boolean,true),greatest(coalesce((payload->>'pullWeight')::numeric,1),0),now())
  on conflict(id) do update set series_id=excluded.series_id,card_number=excluded.card_number,collector_number=excluded.collector_number,name=excluded.name,rarity=excluded.rarity,category_id=excluded.category_id,subcategory_id=excluded.subcategory_id,variant_id=excluded.variant_id,finish_id=excluded.finish_id,image_url=excluded.image_url,thumbnail_url=excluded.thumbnail_url,card_back_url=excluded.card_back_url,description=excluded.description,artist=excluded.artist,distribution_type=excluded.distribution_type,is_promo=excluded.is_promo,is_event_exclusive=excluded.is_event_exclusive,available_from=excluded.available_from,available_until=excluded.available_until,publish_status=excluded.publish_status,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_collectible=excluded.is_collectible,is_pullable=excluded.is_pullable,pull_weight=excluded.pull_weight,updated_at=now();
  delete from public.card_tag_assignments where card_id=cid;
  for tag_name in select trim(value) from jsonb_array_elements_text(coalesce(payload->'tags','[]'::jsonb)) loop
    if tag_name<>'' then
      insert into public.card_tags(name,slug) values(tag_name,lower(regexp_replace(tag_name,'[^a-zA-Z0-9]+','-','g'))) on conflict(name) do update set name=excluded.name returning id into tag_id_value;
      insert into public.card_tag_assignments(card_id,tag_id) values(cid,tag_id_value) on conflict do nothing;
    end if;
  end loop;
  return jsonb_build_object('success',true,'id',cid);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_event_v88(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  eid text := lower(trim(payload ->> 'id'));
  ach jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if eid is null or eid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Event ID is invalid.';
  end if;

  if nullif(trim(payload ->> 'name'), '') is null then
    raise exception 'Event name is required.';
  end if;

  insert into public.starlight_events (
    id,
    name,
    description,
    banner_image_url,
    accent_color,
    start_at,
    end_at,
    is_active,
    is_hidden,
    sort_order,
    updated_at
  )
  values (
    eid,
    trim(payload ->> 'name'),
    nullif(trim(payload ->> 'description'), ''),
    nullif(trim(payload ->> 'bannerImageUrl'), ''),
    coalesce(nullif(payload ->> 'accentColor', ''), '#ff82c8'),
    (payload ->> 'startAt')::timestamptz,
    (payload ->> 'endAt')::timestamptz,
    coalesce((payload ->> 'isActive')::boolean, true),
    coalesce((payload ->> 'isHidden')::boolean, false),
    coalesce((payload ->> 'sortOrder')::integer, 0),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    banner_image_url = excluded.banner_image_url,
    accent_color = excluded.accent_color,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    is_active = excluded.is_active,
    is_hidden = excluded.is_hidden,
    sort_order = excluded.sort_order,
    updated_at = now();

  update public.cards
  set event_id = null,
      is_event_exclusive = false
  where event_id = eid;

  update public.booster_types
  set event_id = null
  where event_id = eid;

  update public.cards
  set event_id = eid,
      is_event_exclusive = true
  where id in (
    select jsonb_array_elements_text(
      coalesce(payload -> 'cardIds', '[]'::jsonb)
    )
  );

  update public.booster_types
  set event_id = eid
  where id in (
    select jsonb_array_elements_text(
      coalesce(payload -> 'boosterIds', '[]'::jsonb)
    )
  );

  delete from public.event_achievements
  where event_id = eid;

  for ach in
    select value
    from jsonb_array_elements(
      coalesce(payload -> 'achievements', '[]'::jsonb)
    )
  loop
    insert into public.event_achievements (
      event_id,
      achievement_key,
      name,
      description,
      requirement_type,
      requirement_value,
      reward_star_bits,
      reward_title,
      is_active,
      sort_order
    )
    values (
      eid,
      lower(trim(ach ->> 'key')),
      trim(ach ->> 'name'),
      nullif(trim(ach ->> 'description'), ''),
      coalesce(ach ->> 'requirementType', 'collect_event_cards'),
      greatest(coalesce((ach ->> 'requirementValue')::integer, 1), 1),
      greatest(coalesce((ach ->> 'rewardStarBits')::integer, 0), 0),
      nullif(trim(ach ->> 'rewardTitle'), ''),
      coalesce((ach ->> 'isActive')::boolean, true),
      coalesce((ach ->> 'sortOrder')::integer, 0)
    );
  end loop;

  return jsonb_build_object('success', true, 'id', eid);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_news_post(requested_post jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r text; target uuid; begin select role::text into r from public.site_roles where user_id=auth.uid(); if coalesce(r,'') not in ('owner','admin','administrator') then raise exception 'Administrator access is required.'; end if; if trim(coalesce(requested_post->>'title',''))='' then raise exception 'A title is required.'; end if; target=nullif(requested_post->>'id','')::uuid;
 if target is null then insert into public.starlight_news_posts(title,summary,body,image_url,published_at,is_published,is_pinned,created_by) values(trim(requested_post->>'title'),nullif(trim(requested_post->>'summary'),''),nullif(trim(requested_post->>'body'),''),nullif(trim(requested_post->>'imageUrl'),''),coalesce(nullif(requested_post->>'publishedAt','')::timestamptz,now()),coalesce((requested_post->>'isPublished')::boolean,true),coalesce((requested_post->>'isPinned')::boolean,false),auth.uid()) returning id into target;
 else update public.starlight_news_posts set title=trim(requested_post->>'title'),summary=nullif(trim(requested_post->>'summary'),''),body=nullif(trim(requested_post->>'body'),''),image_url=nullif(trim(requested_post->>'imageUrl'),''),published_at=coalesce(nullif(requested_post->>'publishedAt','')::timestamptz,published_at),is_published=coalesce((requested_post->>'isPublished')::boolean,is_published),is_pinned=coalesce((requested_post->>'isPinned')::boolean,is_pinned),updated_at=now() where id=target; end if; return jsonb_build_object('success',true,'id',target); end $function$
;

CREATE OR REPLACE FUNCTION public.admin_save_series_v84(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare sid text:=trim(payload->>'id');
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if sid is null or sid !~ '^[A-Za-z0-9_-]{1,30}$' then raise exception 'Series ID is invalid.'; end if;
  insert into public.card_series(id,name,description,booster_image_url,sort_order,is_visible,updated_at)
  values(sid,trim(payload->>'name'),nullif(trim(payload->>'description'),''),coalesce(nullif(trim(payload->>'boosterImageUrl'),''),'site_assets/series01_rising_star_booster.png'),coalesce((payload->>'sortOrder')::integer,0),coalesce((payload->>'isVisible')::boolean,true),now())
  on conflict(id) do update set name=excluded.name,description=excluded.description,booster_image_url=excluded.booster_image_url,sort_order=excluded.sort_order,is_visible=excluded.is_visible,updated_at=now();
  return jsonb_build_object('success',true,'id',sid);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_twitch_config_v890(requested_worker_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  insert into public.twitch_integration_config(id,worker_base_url,updated_at,updated_by)
  values(true,nullif(trim(trailing '/' from requested_worker_url),''),now(),auth.uid())
  on conflict(id) do update set worker_base_url=excluded.worker_base_url,updated_at=now(),updated_by=auth.uid();
  return public.get_twitch_public_config_v890();
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_twitch_reward_rule_v890(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  rid uuid:=nullif(payload->>'id','')::uuid;
  event_name text:=nullif(trim(payload->>'eventType'),'');
  reward_name text:=nullif(trim(payload->>'rewardType'),'');
  saved public.twitch_reward_rules;
  clean_twitch_reward_id text;
  clean_bits bigint;
  clean_card_id text;
  clean_card_quantity integer;
  clean_booster_id text;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if nullif(trim(payload->>'name'),'') is null then raise exception 'Enter a rule name.'; end if;
  if event_name not in ('channel_points','subscription','follow','manual','attendance') then
    raise exception 'Choose a supported Twitch event.';
  end if;
  if reward_name not in ('star_bits','single_card','booster') then
    raise exception 'Choose a supported site reward.';
  end if;

  clean_twitch_reward_id:=case when event_name='channel_points' then nullif(trim(payload->>'twitchRewardId'),'') else null end;
  if event_name='channel_points' and clean_twitch_reward_id is null then
    raise exception 'Select a Twitch Channel Points reward.';
  end if;

  clean_bits:=case when reward_name='star_bits' then nullif(payload->>'starBitsAmount','')::bigint else null end;
  clean_card_id:=case when reward_name='single_card' then nullif(payload->>'cardId','') else null end;
  clean_card_quantity:=case when reward_name='single_card' then greatest(coalesce(nullif(payload->>'cardQuantity','')::integer,1),1) else null end;
  clean_booster_id:=case when reward_name='booster' then nullif(payload->>'boosterId','') else null end;

  if reward_name='star_bits' and coalesce(clean_bits,0)<=0 then raise exception 'Enter a positive Star Bits amount.'; end if;
  if reward_name='single_card' and clean_card_id is null then raise exception 'Select a card.'; end if;
  if reward_name='booster' and clean_booster_id is null then raise exception 'Select a booster pack.'; end if;

  if rid is null then
    insert into public.twitch_reward_rules(
      name,event_type,twitch_reward_id,reward_type,star_bits_amount,card_id,card_quantity,
      booster_id,cooldown_minutes,max_claims_per_user,active,created_by
    ) values(
      trim(payload->>'name'),event_name,clean_twitch_reward_id,reward_name,clean_bits,clean_card_id,
      clean_card_quantity,clean_booster_id,coalesce(nullif(payload->>'cooldownMinutes','')::integer,0),
      nullif(payload->>'maxClaimsPerUser','')::integer,coalesce((payload->>'active')::boolean,true),auth.uid()
    ) returning * into saved;
  else
    update public.twitch_reward_rules set
      name=trim(payload->>'name'),event_type=event_name,twitch_reward_id=clean_twitch_reward_id,
      reward_type=reward_name,star_bits_amount=clean_bits,card_id=clean_card_id,
      card_quantity=clean_card_quantity,booster_id=clean_booster_id,
      cooldown_minutes=coalesce(nullif(payload->>'cooldownMinutes','')::integer,0),
      max_claims_per_user=nullif(payload->>'maxClaimsPerUser','')::integer,
      active=coalesce((payload->>'active')::boolean,true),updated_at=now()
    where id=rid returning * into saved;
    if saved.id is null then raise exception 'Reward rule was not found.'; end if;
  end if;
  return to_jsonb(saved);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_send_gift_v895(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_id uuid;
  target_label text;
  reward_type text:=coalesce(nullif(payload->>'rewardType',''),'star_bits');
  reward_payload jsonb;
  queued jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  target_id:=nullif(payload->>'userId','')::uuid;
  if target_id is null then raise exception 'Choose a registered collector.'; end if;
  select coalesce(nullif(p.display_name,''),nullif(p.username,''),u.email,'Collector') into target_label
  from auth.users u left join public.profiles p on p.id=u.id where u.id=target_id;
  if target_label is null then raise exception 'The selected collector no longer exists.'; end if;
  reward_payload:=case reward_type
    when 'star_bits' then jsonb_build_object('amount',greatest(coalesce(nullif(payload->>'starBitsAmount','')::integer,0),0))
    when 'single_card' then jsonb_build_object('cardId',nullif(payload->>'cardId',''),'quantity',greatest(coalesce(nullif(payload->>'cardQuantity','')::integer,1),1))
    when 'booster' then jsonb_build_object('boosterId',nullif(payload->>'boosterId',''))
    else '{}'::jsonb end;
  if reward_type='star_bits' and coalesce((reward_payload->>'amount')::integer,0)<=0 then raise exception 'Enter a Star Bits amount greater than zero.'; end if;
  if reward_type='single_card' and nullif(reward_payload->>'cardId','') is null then raise exception 'Choose a card.'; end if;
  if reward_type='booster' and nullif(reward_payload->>'boosterId','') is null then raise exception 'Choose a booster.'; end if;
  queued:=public.queue_received_reward_v892(
    target_id,'gift','admin-gift:'||gen_random_uuid()::text,
    coalesce(nullif(trim(payload->>'title'),''),'A gift from the Starlight team'),
    coalesce(nullif(trim(payload->>'message'),''),'A special gift is ready for you.'),
    reward_type,reward_payload,auth.uid(),
    jsonb_build_object('recipientLabel',target_label,'sentByAdmin',true),null
  );
  return jsonb_build_object('success',true,'giftId',queued->>'id','recipientId',target_id,'recipientLabel',target_label,'rewardType',reward_type,'rewardPayload',reward_payload,'status','pending');
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_daily_booster_mode(requested_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_role text;
begin
  select role into actor_role from public.site_roles where user_id=auth.uid();
  if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
  if requested_mode not in ('daily','unlimited','disabled') then raise exception 'Invalid free booster mode.'; end if;
  insert into public.site_settings(setting_key,setting_value,updated_at,updated_by)
  values('free_daily_booster_mode',to_jsonb(requested_mode),now(),auth.uid())
  on conflict(setting_key) do update set setting_value=excluded.setting_value,updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('success',true,'mode',requested_mode);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_reward_code_active(requested_code_id uuid, requested_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    if auth.uid() is null or not public.is_site_admin() then
        raise exception 'Administrator access is required.';
    end if;

    update public.reward_codes
    set active = requested_active, updated_at = now()
    where id = requested_code_id;

    if not found then
        raise exception 'Reward code not found.';
    end if;

    return jsonb_build_object('success', true, 'active', requested_active);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_staff_role(requested_user_id uuid, requested_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    actor_id uuid := auth.uid();
    actor_role text;
    target_old_role text;
begin
    select role into actor_role
    from public.site_roles
    where user_id = actor_id;

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    if requested_role not in ('owner', 'admin', 'super_moderator', 'moderator') then
        raise exception 'Invalid staff role.';
    end if;

    select role into target_old_role
    from public.site_roles
    where user_id = requested_user_id;

    if actor_role = 'admin' then
        if requested_role in ('owner', 'admin') then
            raise exception 'Only an owner may assign owner or administrator access.';
        end if;

        if target_old_role in ('owner', 'admin') then
            raise exception 'Administrators cannot modify owners or other administrators.';
        end if;
    end if;

    if requested_user_id = actor_id and requested_role <> actor_role then
        raise exception 'You cannot change your own role.';
    end if;

    insert into public.site_roles (
        user_id, role, assigned_by, created_at, updated_at
    ) values (
        requested_user_id, requested_role, actor_id, now(), now()
    )
    on conflict (user_id)
    do update set
        role = excluded.role,
        assigned_by = excluded.assigned_by,
        updated_at = now();

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id,
        'staff_role_set',
        requested_user_id,
        'user',
        requested_user_id::text,
        jsonb_build_object('oldRole', target_old_role, 'newRole', requested_role)
    );

    return jsonb_build_object(
        'success', true,
        'userId', requested_user_id,
        'role', requested_role
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_twitch_redeems_enabled_v894(requested_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  update public.twitch_integration_config
  set redeems_enabled=coalesce(requested_enabled,true),
      updated_at=now(),
      updated_by=auth.uid()
  where id=true;

  return public.get_twitch_public_config_v890();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_simulate_booster_v91(requested_booster_id text, requested_openings integer DEFAULT 1000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n integer := greatest(1, least(coalesce(requested_openings, 1000), 10000));
  ids text[];
  cid text;
  rarity_counts jsonb := '{}'::jsonb;
  card_counts jsonb := '{}'::jsonb;
  i integer;
  rarity_name text;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  for i in 1..n
  loop
    ids := public.draw_configured_booster_cards(requested_booster_id);

    foreach cid in array ids
    loop
      select rarity into rarity_name from public.cards where id = cid;

      rarity_counts := jsonb_set(
        rarity_counts,
        array[coalesce(rarity_name, 'Unknown')],
        to_jsonb(coalesce((rarity_counts ->> coalesce(rarity_name, 'Unknown'))::integer, 0) + 1),
        true
      );

      card_counts := jsonb_set(
        card_counts,
        array[cid],
        to_jsonb(coalesce((card_counts ->> cid)::integer, 0) + 1),
        true
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'boosterId', requested_booster_id,
    'openings', n,
    'rarityCounts', rarity_counts,
    'cardCounts', card_counts
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_unregister_site_asset_v87(asset_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  delete from public.site_asset_manifest where path = asset_path;
  return jsonb_build_object('success', true, 'path', asset_path);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_booster(requested_booster_id text, requested_name text, requested_description text, requested_star_bits_cost integer, requested_is_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_role text;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
    if requested_star_bits_cost < 0 then raise exception 'Star Bits cost cannot be negative.'; end if;

    update public.booster_types
    set name = nullif(trim(requested_name), ''),
        description = nullif(trim(requested_description), ''),
        star_bits_cost = requested_star_bits_cost,
        is_active = requested_is_active,
        updated_at = now()
    where id = requested_booster_id;

    if not found then raise exception 'Booster not found.'; end if;

    insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
    values (auth.uid(), 'booster_configuration_updated', 'booster_type', requested_booster_id,
        jsonb_build_object('cost', requested_star_bits_cost, 'isActive', requested_is_active));

    return jsonb_build_object('success', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_booster_slot(requested_slot_id bigint, requested_quantity integer, requested_rates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    actor_role text;
    rate_total numeric;
    rarity_name text;
    rarity_value numeric;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
    if requested_quantity < 1 or requested_quantity > 20 then raise exception 'Slot quantity must be between 1 and 20.'; end if;

    select coalesce(sum(value::numeric), 0)
    into rate_total
    from jsonb_each_text(coalesce(requested_rates, '{}'::jsonb));

    if abs(rate_total - 100) >= 0.0001 then
        raise exception 'Rarity percentages must total exactly 100%%. Current total: %', rate_total;
    end if;

    update public.booster_slots
    set quantity = requested_quantity, updated_at = now()
    where id = requested_slot_id;
    if not found then raise exception 'Booster slot not found.'; end if;

    delete from public.booster_slot_rates where slot_id = requested_slot_id;

    for rarity_name, rarity_value in
        select key, value::numeric from jsonb_each_text(requested_rates)
    loop
        if rarity_name not in ('Common','Uncommon','Rare','Epic','Legendary') then
            raise exception 'Invalid rarity: %', rarity_name;
        end if;
        if rarity_value < 0 or rarity_value > 100 then
            raise exception 'Each percentage must be between 0 and 100.';
        end if;
        if rarity_value > 0 then
            insert into public.booster_slot_rates(slot_id, rarity, percentage)
            values (requested_slot_id, rarity_name, rarity_value);
        end if;
    end loop;

    insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
    values (auth.uid(), 'booster_slot_rates_updated', 'booster_slot', requested_slot_id::text,
        jsonb_build_object('quantity', requested_quantity, 'rates', requested_rates));

    return jsonb_build_object('success', true, 'percentageTotal', rate_total);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_booster_v83(requested_booster_id text, requested_name text, requested_description text, requested_star_bits_cost integer, requested_is_active boolean, requested_pack_image_url text, requested_card_back_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_role text;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 update public.booster_types set name=nullif(trim(requested_name),''),description=nullif(trim(requested_description),''),star_bits_cost=greatest(requested_star_bits_cost,0),is_active=requested_is_active,pack_image_url=coalesce(nullif(trim(requested_pack_image_url),''),'site_assets/series01_rising_star_booster.png'),card_back_url=coalesce(nullif(trim(requested_card_back_url),''),'site_assets/StarlightCard_Back_NewLogo.png'),updated_at=now() where id=requested_booster_id;
 if not found then raise exception 'Booster not found.'; end if; return jsonb_build_object('success',true);
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_card_pull_settings(requested_card_id text, requested_rarity text, requested_pull_weight numeric, requested_is_pullable boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_role text;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
    if requested_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then raise exception 'Invalid rarity.'; end if;
    if requested_pull_weight < 0 then raise exception 'Pull weight cannot be negative.'; end if;

    update public.cards
    set rarity = requested_rarity,
        pull_weight = requested_pull_weight,
        is_pullable = requested_is_pullable,
        updated_at = now()
    where id = requested_card_id;
    if not found then raise exception 'Card not found.'; end if;

    insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
    values (auth.uid(), 'card_pull_settings_updated', 'card', requested_card_id,
        jsonb_build_object('rarity', requested_rarity, 'pullWeight', requested_pull_weight, 'isPullable', requested_is_pullable));

    return jsonb_build_object('success', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_card_pull_settings_v83(requested_card_id text, requested_rarity text, requested_pull_weight numeric, requested_is_pullable boolean, requested_image_url text, requested_thumbnail_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_role text;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 if requested_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then raise exception 'Invalid rarity.'; end if;
 update public.cards set rarity=requested_rarity,pull_weight=greatest(requested_pull_weight,0),is_pullable=requested_is_pullable,image_url=coalesce(nullif(trim(requested_image_url),''),image_url),thumbnail_url=coalesce(nullif(trim(requested_thumbnail_url),''),thumbnail_url),updated_at=now() where id=requested_card_id;
 if not found then raise exception 'Card not found.'; end if; return jsonb_build_object('success',true);
end;$function$
;

CREATE OR REPLACE FUNCTION public.apply_twitch_reward_v890(requested_user_id uuid, requested_reward_type text, requested_star_bits bigint DEFAULT NULL::bigint, requested_card_id text DEFAULT NULL::text, requested_card_quantity integer DEFAULT NULL::integer, requested_booster_id text DEFAULT NULL::text, requested_event_id text DEFAULT NULL::text, requested_rule_id uuid DEFAULT NULL::uuid, requested_twitch_user_id text DEFAULT NULL::text, requested_source text DEFAULT 'twitch'::text, requested_granted_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare payload jsonb; queued jsonb;
begin
  payload:=case requested_reward_type
    when 'star_bits' then jsonb_build_object('amount',requested_star_bits)
    when 'single_card' then jsonb_build_object('cardId',requested_card_id,'quantity',greatest(coalesce(requested_card_quantity,1),1))
    when 'booster' then jsonb_build_object('boosterId',requested_booster_id)
    else '{}'::jsonb end;
  queued:=public.queue_received_reward_v892(requested_user_id,case when requested_source='manual' then 'manual' else 'twitch' end,coalesce(requested_event_id,requested_source||':'||coalesce(requested_twitch_user_id,'')||':'||extract(epoch from now())::bigint),'Twitch reward',case when requested_source='manual' then 'A one-time reward was sent to you.' else 'Your Twitch activity unlocked a Starlight reward.' end,requested_reward_type,payload,requested_granted_by,jsonb_build_object('ruleId',requested_rule_id,'twitchUserId',requested_twitch_user_id,'eventId',requested_event_id),null);
  insert into public.twitch_reward_grants(event_id,rule_id,user_id,twitch_user_id,reward_snapshot,source,granted_by)
  values(requested_event_id,requested_rule_id,requested_user_id,requested_twitch_user_id,jsonb_build_object('pending',true,'receivedRewardId',queued->>'id','rewardType',requested_reward_type,'payload',payload),coalesce(requested_source,'twitch'),requested_granted_by);
  return jsonb_build_object('success',true,'pending',true,'receivedRewardId',queued->>'id');
end;$function$
;

CREATE OR REPLACE FUNCTION public.audit_reward_code_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    insert into public.staff_audit_log (
        actor_user_id,
        action,
        target_resource_type,
        target_resource_id,
        details
    ) values (
        auth.uid(),
        case when tg_op = 'INSERT' then 'reward_code_created' else 'reward_code_updated' end,
        'reward_code',
        coalesce(new.id, old.id)::text,
        jsonb_build_object(
            'label', coalesce(new.label, old.label),
            'active', coalesce(new.active, old.active),
            'operation', tg_op
        )
    );

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.award_collector_xp_from_card_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    gained_quantity integer := 0;
    rarity_points integer := 0;
begin
    if tg_op = 'INSERT' then
        gained_quantity := greatest(coalesce(new.quantity, 0), 0);
    elsif tg_op = 'UPDATE' then
        gained_quantity := greatest(
            coalesce(new.quantity, 0) - coalesce(old.quantity, 0),
            0
        );
    end if;

    if gained_quantity <= 0 then
        return new;
    end if;

    select case rarity
        when 'Common' then 1
        when 'Uncommon' then 2
        when 'Rare' then 5
        when 'Epic' then 15
        when 'Legendary' then 50
        else 0
    end
    into rarity_points
    from public.cards
    where id = new.card_id;

    insert into public.user_wallets (
        user_id,
        collector_xp
    )
    values (
        new.user_id,
        gained_quantity * coalesce(rarity_points, 0)
    )
    on conflict (user_id)
    do update set
        collector_xp = public.user_wallets.collector_xp
            + excluded.collector_xp,
        updated_at = now();

    return new;
end;
$function$
;

create or replace view "public"."booster_slot_rate_totals" as  SELECT b.id AS booster_id,
    b.name AS booster_name,
    s.id AS slot_id,
    s.slot_key,
    s.name AS slot_name,
    s.quantity,
    (COALESCE(sum(r.percentage), (0)::numeric))::numeric(7,4) AS percentage_total,
    (abs((COALESCE(sum(r.percentage), (0)::numeric) - (100)::numeric)) < 0.0001) AS is_valid
   FROM ((public.booster_types b
     JOIN public.booster_slots s ON ((s.booster_id = b.id)))
     LEFT JOIN public.booster_slot_rates r ON ((r.slot_id = s.id)))
  GROUP BY b.id, b.name, s.id, s.slot_key, s.name, s.quantity;


CREATE OR REPLACE FUNCTION public.build_and_award_booster(requested_booster_id text, requested_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ids text[]; rewards jsonb; bonus integer:=0; new_balance bigint;
begin
  ids:=public.draw_configured_booster_cards(requested_booster_id);
  insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
  select requested_user_id,x.card_id,x.qty,false,now(),now(),now() from (select card_id,count(*)::integer qty from unnest(ids) card_id group by card_id)x
  on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
  select coalesce(bonus_star_bits,0) into bonus from public.booster_types where id=requested_booster_id;
  if bonus>0 then
    insert into public.user_wallets(user_id,star_bits,lifetime_star_bits_earned) values(requested_user_id,bonus,bonus)
    on conflict(user_id) do update set star_bits=public.user_wallets.star_bits+bonus,lifetime_star_bits_earned=public.user_wallets.lifetime_star_bits_earned+bonus,updated_at=now();
    insert into public.star_bits_transactions(user_id,transaction_type,star_bits_change,description,metadata)
    values(requested_user_id,'reward',bonus,'Booster bonus Star Bits.',jsonb_build_object('boosterId',requested_booster_id));
  end if;
  select jsonb_agg(jsonb_build_object('id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesId',c.series_id,'seriesName',s.name,'artist',c.artist,'description',c.description,'quantity',uc.quantity,'isDuplicate',uc.quantity>1) order by p.pos)
  into rewards from unnest(ids) with ordinality p(card_id,pos) join public.cards c on c.id=p.card_id join public.card_series s on s.id=c.series_id join public.user_cards uc on uc.user_id=requested_user_id and uc.card_id=c.id;
  select star_bits into new_balance from public.user_wallets where user_id=requested_user_id;
  return jsonb_build_object('cards',coalesce(rewards,'[]'::jsonb),'bonusStarBits',bonus,'newStarBitsBalance',coalesce(new_balance,0));
end;$function$
;

CREATE OR REPLACE FUNCTION public.card_is_booster_eligible_v90(c public.cards, b public.booster_types)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select c.is_visible and c.is_collectible and c.is_pullable and c.pull_weight>0
    and c.publish_status='published'
    and (c.available_from is null or c.available_from<=now())
    and (c.available_until is null or c.available_until>now())
    and (not b.exclude_promos or not c.is_promo)
    and (cardinality(b.category_ids)=0 or c.category_id=any(b.category_ids))
    and (cardinality(b.finish_ids)=0 or c.finish_id=any(b.finish_ids));
$function$
;

CREATE OR REPLACE FUNCTION public.claim_my_received_reward_v892(requested_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); r public.received_rewards; snapshot jsonb:='{}'::jsonb; qty integer; card_ids text[]; cards_json jsonb:='[]'::jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into r from public.received_rewards where id=requested_id and user_id=uid for update;
  if not found then raise exception 'Reward was not found.'; end if;
  if r.status<>'pending' then raise exception 'This reward is no longer available.'; end if;
  if r.available_at>now() then raise exception 'This reward is not available yet.'; end if;
  if r.expires_at is not null and r.expires_at<=now() then update public.received_rewards set status='expired' where id=r.id; raise exception 'This reward has expired.'; end if;
  if r.reward_type='star_bits' then
    qty:=greatest(coalesce((r.reward_payload->>'amount')::integer,0),0); if qty<=0 then raise exception 'This reward is invalid.'; end if;
    insert into public.user_wallets(user_id,star_bits,lifetime_star_bits_earned) values(uid,qty,qty)
    on conflict(user_id) do update set star_bits=public.user_wallets.star_bits+excluded.star_bits,lifetime_star_bits_earned=public.user_wallets.lifetime_star_bits_earned+excluded.lifetime_star_bits_earned,updated_at=now();
    snapshot=jsonb_build_object('type','star_bits','amount',qty);
  elsif r.reward_type='single_card' then
    qty:=greatest(coalesce((r.reward_payload->>'quantity')::integer,1),1);
    insert into public.user_cards(user_id,card_id,quantity) values(uid,r.reward_payload->>'cardId',qty)
    on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
    select jsonb_build_object('type','single_card','cards',jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'cardNumber',c.card_number,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'quantity',qty))) into snapshot from public.cards c where c.id=r.reward_payload->>'cardId';
  elsif r.reward_type='booster' and nullif(r.reward_payload->>'boosterId','') is not null then
    snapshot:=public.build_and_award_booster(r.reward_payload->>'boosterId',uid);
  elsif r.reward_type in ('booster','card_bundle') then
    select array_agg(value::text) into card_ids from jsonb_array_elements_text(coalesce(r.reward_payload->'cardIds','[]'::jsonb));
    if coalesce(cardinality(card_ids),0)=0 then raise exception 'This reward has no cards.'; end if;
    insert into public.user_cards(user_id,card_id,quantity)
    select uid,x.card_id,count(*)::integer from unnest(card_ids) x(card_id) group by x.card_id
    on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
    select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'cardNumber',c.card_number,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url) order by u.ord),'[]'::jsonb) into cards_json from unnest(card_ids) with ordinality u(card_id,ord) join public.cards c on c.id=u.card_id;
    snapshot=jsonb_build_object('type','booster','cards',cards_json);
  else raise exception 'Unsupported reward type.'; end if;
  update public.received_rewards set status='claimed',claimed_snapshot=snapshot,claimed_at=now() where id=r.id;
  return jsonb_build_object('success',true,'rewardId',r.id,'title',r.title,'rewardType',r.reward_type,'snapshot',snapshot);
end;$function$
;

CREATE OR REPLACE FUNCTION public.convert_all_duplicates_to_star_bits()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    current_user_id uuid;

    converted_card_types integer := 0;
    converted_duplicate_copies integer := 0;
    star_bits_earned bigint := 0;
    new_star_bits_balance bigint := 0;

    conversion_details jsonb := '[]'::jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to convert duplicate cards.';
    end if;

    -- Ensure the user has a wallet.
    insert into public.user_wallets (
        user_id
    )
    values (
        current_user_id
    )
    on conflict (user_id)
    do nothing;

    -- Lock the wallet row so simultaneous conversion requests
    -- cannot update the same balance at the same time.
    perform 1
    from public.user_wallets
    where user_id = current_user_id
    for update;

    -- Lock every duplicate ownership row involved in the exchange.
    perform 1
    from public.user_cards
    where user_id = current_user_id
      and quantity > 1
    for update;

    -- Calculate totals from the locked rows.
    select
        count(*),
        coalesce(
            sum(
                user_cards.quantity - 1
            ),
            0
        ),
        coalesce(
            sum(
                (
                    user_cards.quantity - 1
                )
                *
                star_bits_values.bits_per_duplicate
            ),
            0
        )
    into
        converted_card_types,
        converted_duplicate_copies,
        star_bits_earned

    from public.user_cards

    join public.cards
      on cards.id =
         user_cards.card_id

    join public.star_bits_values
      on star_bits_values.rarity =
         cards.rarity

    where user_cards.user_id =
          current_user_id
      and user_cards.quantity > 1;

    if converted_duplicate_copies = 0 then
        select star_bits
        into new_star_bits_balance
        from public.user_wallets
        where user_id = current_user_id;

        return jsonb_build_object(
            'success', true,
            'nothingToConvert', true,
            'convertedCardTypes', 0,
            'convertedDuplicateCopies', 0,
            'starBitsEarned', 0,
            'newStarBitsBalance',
                coalesce(new_star_bits_balance, 0),
            'convertedCards',
                '[]'::jsonb
        );
    end if;

    -- Build a permanent record of what is about to be converted.
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'cardId',
                    conversion_data.card_id,

                'cardNumber',
                    conversion_data.card_number,

                'name',
                    conversion_data.name,

                'rarity',
                    conversion_data.rarity,

                'duplicateQuantity',
                    conversion_data.duplicate_quantity,

                'bitsPerDuplicate',
                    conversion_data.bits_per_duplicate,

                'starBitsEarned',
                    conversion_data.star_bits_earned
            )
            order by
                conversion_data.series_sort,
                conversion_data.card_sort
        ),
        '[]'::jsonb
    )
    into conversion_details

    from (
        select
            cards.id as card_id,
            cards.card_number,
            cards.name,
            cards.rarity,
            card_series.sort_order as series_sort,
            cards.sort_order as card_sort,

            user_cards.quantity - 1
                as duplicate_quantity,

            star_bits_values.bits_per_duplicate,

            (
                user_cards.quantity - 1
            )
            *
            star_bits_values.bits_per_duplicate
                as star_bits_earned

        from public.user_cards

        join public.cards
          on cards.id =
             user_cards.card_id

        join public.card_series
          on card_series.id =
             cards.series_id

        join public.star_bits_values
          on star_bits_values.rarity =
             cards.rarity

        where user_cards.user_id =
              current_user_id
          and user_cards.quantity > 1
    ) as conversion_data;

    -- Record one transaction for each converted card type.
    insert into public.star_bits_transactions (
        user_id,
        transaction_type,
        star_bits_change,
        card_id,
        card_quantity_change,
        description,
        metadata
    )
    select
        current_user_id,
        'duplicate_conversion',
        (
            user_cards.quantity - 1
        )
        *
        star_bits_values.bits_per_duplicate,

        cards.id,

        -(
            user_cards.quantity - 1
        ),

        'Converted duplicate copies of '
        || cards.name
        || ' into Star Bits.',

        jsonb_build_object(
            'cardNumber',
                cards.card_number,

            'cardName',
                cards.name,

            'rarity',
                cards.rarity,

            'duplicatesConverted',
                user_cards.quantity - 1,

            'bitsPerDuplicate',
                star_bits_values.bits_per_duplicate
        )

    from public.user_cards

    join public.cards
      on cards.id =
         user_cards.card_id

    join public.star_bits_values
      on star_bits_values.rarity =
         cards.rarity

    where user_cards.user_id =
          current_user_id
      and user_cards.quantity > 1;

    -- Reduce each affected card to one permanent copy.
    update public.user_cards
    set
        quantity = 1,
        updated_at = now()
    where user_id = current_user_id
      and quantity > 1;

    -- Credit the wallet.
    update public.user_wallets
    set
        star_bits =
            star_bits
            +
            star_bits_earned,

        lifetime_star_bits_earned =
            lifetime_star_bits_earned
            +
            star_bits_earned,

        updated_at =
            now()

    where user_id =
          current_user_id

    returning star_bits
    into new_star_bits_balance;

    return jsonb_build_object(
        'success', true,
        'nothingToConvert', false,
        'convertedCardTypes',
            converted_card_types,
        'convertedDuplicateCopies',
            converted_duplicate_copies,
        'starBitsEarned',
            star_bits_earned,
        'newStarBitsBalance',
            new_star_bits_balance,
        'convertedCards',
            conversion_details
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.convert_selected_duplicates_to_star_bits(requested_selections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    current_user_id uuid;
    selection jsonb;
    selected_card_id text;
    selected_quantity integer;
    available_duplicates integer;
    bits_per_copy integer;
    earned_for_card bigint;
    total_copies_converted integer := 0;
    total_star_bits_earned bigint := 0;
    new_balance bigint := 0;
    converted_cards jsonb := '[]'::jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception 'You must be signed in to convert duplicate cards.';
    end if;

    if requested_selections is null
       or jsonb_typeof(requested_selections) <> 'array'
       or jsonb_array_length(requested_selections) = 0 then
        raise exception 'Choose at least one duplicate card to convert.';
    end if;

    insert into public.user_wallets (user_id)
    values (current_user_id)
    on conflict (user_id) do nothing;

    perform 1
    from public.user_wallets
    where user_id = current_user_id
    for update;

    for selection in
        select value
        from jsonb_array_elements(requested_selections)
    loop
        selected_card_id := nullif(trim(selection ->> 'cardId'), '');
        selected_quantity := floor(coalesce((selection ->> 'quantity')::numeric, 0))::integer;

        if selected_card_id is null or selected_quantity <= 0 then
            continue;
        end if;

        select
            greatest(user_cards.quantity - 1, 0),
            star_bits_values.bits_per_duplicate
        into
            available_duplicates,
            bits_per_copy
        from public.user_cards
        join public.cards
          on cards.id = user_cards.card_id
        join public.star_bits_values
          on star_bits_values.rarity = cards.rarity
        where user_cards.user_id = current_user_id
          and user_cards.card_id = selected_card_id
        for update of user_cards;

        if not found then
            raise exception 'Card % is not owned or cannot be converted.', selected_card_id;
        end if;

        if selected_quantity > available_duplicates then
            raise exception
                'Only % duplicate copy/copies of card % are available.',
                available_duplicates,
                selected_card_id;
        end if;

        earned_for_card := selected_quantity::bigint * bits_per_copy::bigint;

        update public.user_cards
        set
            quantity = quantity - selected_quantity,
            updated_at = now()
        where user_id = current_user_id
          and card_id = selected_card_id;

        insert into public.star_bits_transactions (
            user_id,
            transaction_type,
            star_bits_change,
            card_id,
            card_quantity_change,
            description,
            metadata
        )
        select
            current_user_id,
            'duplicate_conversion',
            earned_for_card,
            cards.id,
            -selected_quantity,
            'Converted selected duplicate copies of ' || cards.name || ' into Star Bits.',
            jsonb_build_object(
                'cardNumber', cards.card_number,
                'cardName', cards.name,
                'rarity', cards.rarity,
                'duplicatesConverted', selected_quantity,
                'bitsPerDuplicate', bits_per_copy
            )
        from public.cards
        where cards.id = selected_card_id;

        converted_cards := converted_cards || jsonb_build_array(
            jsonb_build_object(
                'cardId', selected_card_id,
                'quantityConverted', selected_quantity,
                'starBitsEarned', earned_for_card
            )
        );

        total_copies_converted := total_copies_converted + selected_quantity;
        total_star_bits_earned := total_star_bits_earned + earned_for_card;
    end loop;

    if total_copies_converted <= 0 then
        raise exception 'Choose at least one duplicate card to convert.';
    end if;

    update public.user_wallets
    set
        star_bits = star_bits + total_star_bits_earned,
        lifetime_star_bits_earned = lifetime_star_bits_earned + total_star_bits_earned,
        updated_at = now()
    where user_id = current_user_id
    returning star_bits into new_balance;

    return jsonb_build_object(
        'success', true,
        'convertedDuplicateCopies', total_copies_converted,
        'starBitsEarned', total_star_bits_earned,
        'newStarBitsBalance', new_balance,
        'convertedCards', converted_cards
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_trade_offer(requested_username text, offered_items jsonb, requested_items jsonb, requested_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  target_id uuid;
  new_id uuid;
  offered_entry jsonb;
  requested_entry jsonb;
  cid text;
  qty integer;
  allowed integer;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  select p.id
  into target_id
  from public.profiles p
  where lower(p.username) = lower(trim(requested_username))
    and p.onboarding_complete = true
  limit 1;

  if target_id is null then
    raise exception 'Collector not found.';
  end if;

  if target_id = uid then
    raise exception 'You cannot trade with yourself.';
  end if;

  if jsonb_typeof(offered_items) <> 'array'
     or jsonb_typeof(requested_items) <> 'array' then
    raise exception 'Invalid trade items.';
  end if;

  if jsonb_array_length(offered_items) = 0
     or jsonb_array_length(requested_items) = 0 then
    raise exception 'A trade must include cards from both collectors.';
  end if;

  if jsonb_array_length(offered_items) > 12
     or jsonb_array_length(requested_items) > 12 then
    raise exception 'A trade may include at most 12 card types per side.';
  end if;

  for offered_entry in
    select offered.value
    from jsonb_array_elements(offered_items) as offered(value)
  loop
    cid := nullif(trim(offered_entry ->> 'cardId'), '');
    qty := coalesce((offered_entry ->> 'quantity')::integer, 0);

    select greatest(uc.quantity - 1, 0)
    into allowed
    from public.user_cards uc
    where uc.user_id = uid
      and uc.card_id = cid;

    if cid is null or qty < 1 or qty > coalesce(allowed, 0) then
      raise exception 'One of your offered card quantities is no longer available.';
    end if;
  end loop;

  for requested_entry in
    select requested.value
    from jsonb_array_elements(requested_items) as requested(value)
  loop
    cid := nullif(trim(requested_entry ->> 'cardId'), '');
    qty := coalesce((requested_entry ->> 'quantity')::integer, 0);

    select greatest(uc.quantity - 1, 0)
    into allowed
    from public.user_cards uc
    where uc.user_id = target_id
      and uc.card_id = cid;

    if cid is null or qty < 1 or qty > coalesce(allowed, 0) then
      raise exception 'One of the requested card quantities is no longer available.';
    end if;
  end loop;

  insert into public.trade_offers (
    proposer_id,
    recipient_id,
    note
  )
  values (
    uid,
    target_id,
    nullif(trim(requested_note), '')
  )
  returning id into new_id;

  insert into public.trade_offer_items (
    offer_id,
    side,
    card_id,
    quantity
  )
  select
    new_id,
    'proposer',
    normalized.card_id,
    sum(normalized.quantity)::integer
  from (
    select
      offered.value ->> 'cardId' as card_id,
      (offered.value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(offered_items) as offered(value)
  ) as normalized
  group by normalized.card_id;

  insert into public.trade_offer_items (
    offer_id,
    side,
    card_id,
    quantity
  )
  select
    new_id,
    'recipient',
    normalized.card_id,
    sum(normalized.quantity)::integer
  from (
    select
      requested.value ->> 'cardId' as card_id,
      (requested.value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(requested_items) as requested(value)
  ) as normalized
  group by normalized.card_id;

  return jsonb_build_object(
    'success', true,
    'offerId', new_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_notification_v881(requested_user_id uuid, requested_type text, requested_title text, requested_body text, requested_icon text DEFAULT '✦'::text, requested_route text DEFAULT NULL::text, requested_route_params jsonb DEFAULT '{}'::jsonb, requested_source_key text DEFAULT NULL::text, requested_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_id bigint; normalized_source text:=nullif(trim(requested_source_key),'');
begin
  if requested_user_id is null or nullif(trim(requested_title),'') is null then return null; end if;
  if not public.notification_type_enabled_v882(requested_user_id, requested_type) then return null; end if;
  if normalized_source is not null and exists(
    select 1 from public.notification_dismissals d
    where d.user_id=requested_user_id and d.source_key=normalized_source
  ) then return null; end if;
  insert into public.user_notifications(user_id,notification_type,title,body,icon,route,route_params,source_key,expires_at)
  values(requested_user_id,coalesce(nullif(trim(requested_type),''),'general'),trim(requested_title),nullif(trim(requested_body),''),coalesce(nullif(requested_icon,''),'✦'),nullif(trim(requested_route),''),coalesce(requested_route_params,'{}'::jsonb),normalized_source,requested_expires_at)
  on conflict (user_id,source_key) where source_key is not null do nothing returning id into new_id;
  return new_id;
end;$function$
;

CREATE OR REPLACE FUNCTION public.delete_notification_v881(requested_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n public.user_notifications%rowtype;
begin
  select * into n from public.user_notifications where id=requested_id and user_id=auth.uid();
  if not found then return false; end if;
  if n.source_key is not null then
    insert into public.notification_dismissals(user_id,source_key,dismissed_at)
    values(n.user_id,n.source_key,now())
    on conflict(user_id,source_key) do update set dismissed_at=excluded.dismissed_at;
  end if;
  delete from public.user_notifications where id=requested_id and user_id=auth.uid();
  return found;
end;$function$
;

CREATE OR REPLACE FUNCTION public.delete_read_notifications_v881()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare n integer; begin delete from public.user_notifications where user_id=auth.uid() and is_read=true; get diagnostics n=row_count; return n; end;$function$
;

CREATE OR REPLACE FUNCTION public.dismiss_my_received_reward_v892(requested_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin update public.received_rewards set status='cancelled' where id=requested_id and user_id=auth.uid() and status in ('claimed','expired'); return found; end;$function$
;

CREATE OR REPLACE FUNCTION public.draw_configured_booster_cards(requested_booster_id text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.booster_types%rowtype;
  selected_ids text[] := array[]::text[];
  slot_rec record;
  i integer;
  chosen text;
  chosen_rarity text;
  rarity_roll numeric;
  rate_total numeric;
  attempts integer;
begin
  select *
  into b
  from public.booster_types
  where id = requested_booster_id
    and is_active = true
    and archived = false;

  if not found then
    raise exception 'This booster is not active.';
  end if;

  if b.reward_mode = 'slots' then
    for slot_rec in
      select id, quantity, name
      from public.booster_slots
      where booster_id = b.id
      order by sort_order, id
    loop
      select coalesce(sum(percentage), 0)
      into rate_total
      from public.booster_slot_rates
      where slot_id = slot_rec.id
        and percentage > 0;

      if abs(rate_total - 100) > 0.001 then
        raise exception using message = format(
          'Slot "%s" totals %s%%. Every rarity slot must total exactly 100%%.',
          slot_rec.name,
          rate_total
        );
      end if;

      for i in 1..greatest(slot_rec.quantity, 1)
      loop
        attempts := 0;
        chosen := null;

        loop
          attempts := attempts + 1;
          rarity_roll := random() * 100;

          with rates as (
            select
              rarity,
              percentage,
              sum(percentage) over (
                order by case rarity
                  when 'Common' then 1
                  when 'Uncommon' then 2
                  when 'Rare' then 3
                  when 'Epic' then 4
                  when 'Legendary' then 5
                  else 99
                end
              ) as cumulative
            from public.booster_slot_rates
            where slot_id = slot_rec.id
              and percentage > 0
          )
          select rarity
          into chosen_rarity
          from rates
          where rarity_roll < cumulative
          order by cumulative
          limit 1;

          select c.id
          into chosen
          from public.cards c
          where c.rarity = chosen_rarity
            and public.card_is_booster_eligible_v90(c, b)
            and (b.series_id is null or c.series_id = b.series_id)
            and (b.allow_duplicates or not c.id = any(selected_ids))
          order by (-ln(greatest(random(), 0.0000001)) / greatest(c.pull_weight, 0.0000001))
          limit 1;

          exit when chosen is not null or attempts >= 20;
        end loop;

        if chosen is null then
          raise exception using message = format(
            'No eligible %s card is available for slot "%s".',
            coalesce(chosen_rarity, 'configured'),
            slot_rec.name
          );
        end if;

        selected_ids := array_append(selected_ids, chosen);
      end loop;
    end loop;

  elsif b.reward_mode = 'series' then
    for i in 1..greatest(b.card_count, 1)
    loop
      select c.id
      into chosen
      from public.cards c
      where c.series_id = b.series_id
        and public.card_is_booster_eligible_v90(c, b)
        and (b.allow_duplicates or not c.id = any(selected_ids))
      order by (-ln(greatest(random(), 0.0000001)) / greatest(c.pull_weight, 0.0000001))
      limit 1;

      if chosen is null then
        raise exception 'This series has no eligible cards.';
      end if;

      selected_ids := array_append(selected_ids, chosen);
    end loop;

  elsif b.reward_mode in ('exact', 'single', 'mixed') then
    for slot_rec in
      select *
      from public.booster_reward_cards
      where booster_id = b.id
      order by sort_order, card_id
    loop
      for i in 1..greatest(slot_rec.quantity, 1)
      loop
        selected_ids := array_append(selected_ids, slot_rec.card_id);
      end loop;
    end loop;

  elsif b.reward_mode = 'weighted_pool' then
    for i in 1..greatest(b.card_count, 1)
    loop
      select rc.card_id
      into chosen
      from public.booster_reward_cards rc
      join public.cards c on c.id = rc.card_id
      where rc.booster_id = b.id
        and rc.weight > 0
        and public.card_is_booster_eligible_v90(c, b)
        and (b.allow_duplicates or not c.id = any(selected_ids))
      order by (-ln(greatest(random(), 0.0000001)) / greatest(rc.weight, 0.0000001))
      limit 1;

      if chosen is null then
        raise exception 'This booster custom pool is empty.';
      end if;

      selected_ids := array_append(selected_ids, chosen);
    end loop;
  end if;

  if cardinality(selected_ids) = 0 then
    raise exception 'This booster has no card rewards configured.';
  end if;

  return selected_ids;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_profile_moderation_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    if auth.uid() = old.id
       and exists (
           select 1
           from public.profile_moderation_state
           where user_id = old.id
             and profile_edit_locked = true
       ) then
        raise exception 'This profile is temporarily locked by the moderation team.';
    end if;

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    insert into public.user_wallets (
        user_id
    )
    values (
        new.id
    )
    on conflict (user_id)
    do nothing;

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_starlight_events_v88()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'bannerImageUrl', e.banner_image_url,
        'accentColor', e.accent_color,
        'startAt', e.start_at,
        'endAt', e.end_at,
        'boosters', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', b.id,
                'name', b.name,
                'description', b.description,
                'packImageUrl', b.pack_image_url,
                'starBitsCost', b.star_bits_cost
              )
              order by b.sort_order, b.id
            ),
            '[]'::jsonb
          )
          from public.booster_types b
          where b.event_id = e.id
            and b.is_active = true
            and coalesce(b.archived, false) = false
            and (b.visible_from is null or now() >= b.visible_from)
            and (b.visible_until is null or now() <= b.visible_until)
        ),
        'cards', (
          select count(*)
          from public.cards c
          where c.event_id = e.id
            and c.is_visible = true
        ),
        'achievements', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'name', a.name,
                'description', a.description,
                'rewardStarBits', a.reward_star_bits,
                'rewardTitle', a.reward_title
              )
              order by a.sort_order, a.id
            ),
            '[]'::jsonb
          )
          from public.event_achievements a
          where a.event_id = e.id
            and a.is_active = true
        )
      )
      order by e.sort_order, e.start_at
    ),
    '[]'::jsonb
  )
  from public.starlight_events e
  where e.is_active = true
    and e.is_hidden = false
    and now() between e.start_at and e.end_at;
$function$
;

CREATE OR REPLACE FUNCTION public.get_daily_booster_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); mode text; today date; next_at timestamptz; claim public.daily_booster_claims%rowtype;
begin
  if uid is null then raise exception 'You must be signed in to check your daily booster.'; end if;
  mode:=public.get_free_daily_booster_mode(); today:=timezone('America/New_York',now())::date;
  next_at:=((today+1)::timestamp at time zone 'America/New_York');
  if mode='disabled' then return jsonb_build_object('available',false,'disabled',true,'mode',mode,'nextClaimAt',null,'cardsAwarded','[]'::jsonb); end if;
  if mode='unlimited' then return jsonb_build_object('available',true,'disabled',false,'mode',mode,'nextClaimAt',null,'cardsAwarded','[]'::jsonb); end if;
  select * into claim from public.daily_booster_claims where user_id=uid and claim_date=today limit 1;
  if found then return jsonb_build_object('available',false,'disabled',false,'mode',mode,'claimDate',today,'claimedAt',claim.claimed_at,'nextClaimAt',next_at,'cardsAwarded',claim.cards_awarded); end if;
  return jsonb_build_object('available',true,'disabled',false,'mode',mode,'claimDate',today,'nextClaimAt',next_at,'cardsAwarded','[]'::jsonb);
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_free_daily_booster_mode()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select setting_value #>> '{}' from public.site_settings where setting_key='free_daily_booster_mode'),'daily')
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_notifications_v881(requested_limit integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); result jsonb; unread integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  perform public.sync_my_notifications_v881();
  select count(*) into unread from public.user_notifications where user_id=uid and is_read=false and (expires_at is null or expires_at>now());
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) into result from (select * from public.user_notifications where user_id=uid and (expires_at is null or expires_at>now()) order by created_at desc limit greatest(1,least(coalesce(requested_limit,60),200))) n;
  return jsonb_build_object('notifications',result,'unreadCount',unread);
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_my_profile_extras()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
    if uid is null then raise exception 'You must be signed in.'; end if;
    perform public.sync_my_achievements();
    return jsonb_build_object(
        'avatarUrl', (select avatar_url from public.profiles where id::text = uid::text),
        'selectedTitleId', (select selected_title_id from public.profiles where id::text = uid::text),
        'titles', coalesce((
            select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'description', t.description) order by t.sort_order)
            from public.user_titles ut join public.collector_titles t on t.id = ut.title_id
            where ut.user_id = uid and t.is_active = true
        ), '[]'::jsonb),
        'achievements', coalesce((
            select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'description', a.description, 'icon', a.icon, 'unlockedAt', ua.unlocked_at) order by a.sort_order)
            from public.user_achievements ua join public.achievement_definitions a on a.id = ua.achievement_id
            where ua.user_id = uid and a.is_active = true
        ), '[]'::jsonb)
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_received_rewards_v892(requested_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'pendingCount',count(*) filter(where status='pending' and available_at<=now() and (expires_at is null or expires_at>now())),
    'rewards',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'sourceType',source_type,'sourceId',source_id,'title',title,'message',message,
      'rewardType',reward_type,'rewardPayload',reward_payload,'status',status,'claimedSnapshot',claimed_snapshot,
      'availableAt',available_at,'expiresAt',expires_at,'claimedAt',claimed_at,'createdAt',created_at,'metadata',metadata
    ) order by created_at desc) filter(where requested_status is null or status=requested_status),'[]'::jsonb)
  ) from public.received_rewards where user_id=auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_staff_access()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    staff_role_value text;
begin
    select site_roles.role
    into staff_role_value
    from public.site_roles
    where site_roles.user_id = auth.uid()
    limit 1;

    return jsonb_build_object(
        'isStaff', staff_role_value is not null,
        'role', staff_role_value,
        'canManageCodes', staff_role_value in ('owner', 'admin'),
        'canManageRoles', staff_role_value in ('owner', 'admin'),
        'canAssignAdmins', staff_role_value = 'owner',
        'canModerate', staff_role_value in ('owner', 'admin', 'super_moderator', 'moderator'),
        'canViewAuditLog', staff_role_value in ('owner', 'admin')
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_trade_lists()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  result_cards jsonb;
  public_setting boolean := true;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  insert into public.user_trade_settings(user_id)
  values(uid) on conflict(user_id) do nothing;

  select public_lists into public_setting
  from public.user_trade_settings where user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'ownedQuantity', coalesce(uc.quantity,0),
    'duplicateQuantity', greatest(coalesce(uc.quantity,0)-1,0),
    'wishlisted', coalesce(p.wishlisted,false),
    'tradeQuantity', least(coalesce(p.trade_quantity,0), greatest(coalesce(uc.quantity,0)-1,0))
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into result_cards
  from public.cards c
  join public.card_series s on s.id = c.series_id
  left join public.user_cards uc on uc.user_id = uid and uc.card_id = c.id
  left join public.user_card_preferences p on p.user_id = uid and p.card_id = c.id
  where c.is_visible = true and c.is_collectible = true;

  return jsonb_build_object('publicLists', public_setting, 'cards', result_cards);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_trade_offers()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); incoming jsonb; outgoing jsonb;
begin
 if uid is null then raise exception 'You must be signed in.'; end if;
 with offer_data as (
   select o.*,
     pp.username proposer_username,pp.display_name proposer_name,pp.avatar_url proposer_avatar,
     rp.username recipient_username,rp.display_name recipient_name,rp.avatar_url recipient_avatar,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='proposer'),'[]'::jsonb) proposer_items,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='recipient'),'[]'::jsonb) recipient_items
   from public.trade_offers o join public.profiles pp on pp.id=o.proposer_id join public.profiles rp on rp.id=o.recipient_id
   where uid in(o.proposer_id,o.recipient_id)
 )
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into incoming from offer_data x where x.recipient_id=uid;
 with offer_data as (
   select o.*,
     pp.username proposer_username,pp.display_name proposer_name,pp.avatar_url proposer_avatar,
     rp.username recipient_username,rp.display_name recipient_name,rp.avatar_url recipient_avatar,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='proposer'),'[]'::jsonb) proposer_items,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='recipient'),'[]'::jsonb) recipient_items
   from public.trade_offers o join public.profiles pp on pp.id=o.proposer_id join public.profiles rp on rp.id=o.recipient_id
   where uid in(o.proposer_id,o.recipient_id)
 )
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into outgoing from offer_data x where x.proposer_id=uid;
 return jsonb_build_object('incoming',incoming,'outgoing',outgoing);
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_my_twitch_connection_v890()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); c record;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into c from public.twitch_connections where user_id=uid;
  if not found then return jsonb_build_object('linked',false); end if;
  return jsonb_build_object('linked',true,'twitchUserId',c.twitch_user_id,'login',c.twitch_login,'displayName',c.twitch_display_name,'avatarUrl',c.twitch_avatar_url,'linkedAt',c.linked_at);
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_notification_preferences_v882()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); p public.notification_preferences%rowtype;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  insert into public.notification_preferences(user_id) values(uid) on conflict(user_id) do nothing;
  select * into p from public.notification_preferences where user_id=uid;
  return jsonb_build_object(
    'daily_booster',p.daily_booster,'trade',p.trade,'achievement',p.achievement,
    'reward',p.reward,'event',p.event,'broadcast',p.broadcast
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_public_card_catalog_v1()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select jsonb_build_object(
 'generatedAt',now(),
 'catalogUpdatedAt',greatest(coalesce((select max(updated_at) from public.cards),'epoch'::timestamptz),coalesce((select max(updated_at) from public.card_series),'epoch'::timestamptz)),
 'cards',coalesce((select jsonb_agg(jsonb_build_object(
   'id',c.id,'number',c.card_number,'collectorNumber',c.collector_number,'name',c.name,
   'seriesId',s.id,'seriesName',s.name,'seriesSort',s.sort_order,'seriesDescription',s.description,'boosterImageUrl',s.booster_image_url,
   'rarity',c.rarity,'categoryId',c.category_id,'categoryName',cat.name,'subcategoryId',c.subcategory_id,
   'variantId',c.variant_id,'finishId',c.finish_id,'distributionType',c.distribution_type,'publishStatus',c.publish_status,
   'tags',coalesce((select jsonb_agg(t.name order by t.name) from public.card_tag_assignments a join public.card_tags t on t.id=a.tag_id where a.card_id=c.id),'[]'::jsonb),
   'imageUrl',c.image_url,'thumbnailUrl',coalesce(c.thumbnail_url,c.image_url),'cardDescription',c.description,'artist',c.artist,
   'sortOrder',c.sort_order,'isVisible',c.is_visible,'isCollectible',c.is_collectible,'isPullable',c.is_pullable,'pullWeight',c.pull_weight,'updatedAt',c.updated_at
 ) order by s.sort_order,c.sort_order,c.card_number,c.id) from public.cards c join public.card_series s on s.id=c.series_id left join public.card_categories cat on cat.id=c.category_id where c.is_visible=true and c.publish_status='published' and s.is_visible=true),'[]'::jsonb)
);
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_collector_profile(requested_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    target_profile public.profiles%rowtype;
    normalized_username text;

    total_catalog_cards integer := 0;
    unique_cards_owned integer := 0;
    total_copies_owned integer := 0;

    rarity_counts jsonb := '{}'::jsonb;
    series_progress jsonb := '[]'::jsonb;
    favorite_cards jsonb := '[]'::jsonb;
    showcase_card jsonb := null;
begin
    normalized_username :=
        lower(trim(requested_username));

    if normalized_username is null
       or normalized_username = '' then
        raise exception 'A collector username is required.';
    end if;

    select *
    into target_profile
    from public.profiles
    where lower(username) = normalized_username
      and onboarding_complete = true
    limit 1;

    if not found then
        return jsonb_build_object(
            'found', false
        );
    end if;

    /*
     * Private profiles reveal only that the profile exists
     * and is private.
     */
    if target_profile.profile_visibility = 'private'
       and target_profile.id is distinct from auth.uid() then
        return jsonb_build_object(
            'found', true,
            'private', true,
            'username', target_profile.username
        );
    end if;

    select count(*)
    into total_catalog_cards
    from public.cards
    where is_visible = true
      and is_collectible = true;

    if target_profile.show_collection_stats then
        select
            count(*),
            coalesce(sum(quantity), 0)
        into
            unique_cards_owned,
            total_copies_owned
        from public.user_cards
        where user_id = target_profile.id;

        select jsonb_build_object(
            'Common',
                count(*) filter (
                    where cards.rarity = 'Common'
                ),

            'Uncommon',
                count(*) filter (
                    where cards.rarity = 'Uncommon'
                ),

            'Rare',
                count(*) filter (
                    where cards.rarity = 'Rare'
                ),

            'Epic',
                count(*) filter (
                    where cards.rarity = 'Epic'
                ),

            'Legendary',
                count(*) filter (
                    where cards.rarity = 'Legendary'
                )
        )
        into rarity_counts
        from public.user_cards
        join public.cards
          on cards.id = user_cards.card_id
        where user_cards.user_id = target_profile.id;

        select coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'seriesId',
                        series_data.series_id,

                    'seriesName',
                        series_data.series_name,

                    'owned',
                        series_data.owned_count,

                    'total',
                        series_data.total_count
                )
                order by series_data.sort_order
            ),
            '[]'::jsonb
        )
        into series_progress
        from (
            select
                card_series.id as series_id,
                card_series.name as series_name,
                card_series.sort_order,

                count(cards.id) filter (
                    where cards.is_visible = true
                      and cards.is_collectible = true
                ) as total_count,

                count(user_cards.card_id) as owned_count

            from public.card_series

            left join public.cards
              on cards.series_id = card_series.id
             and cards.is_visible = true
             and cards.is_collectible = true

            left join public.user_cards
              on user_cards.card_id = cards.id
             and user_cards.user_id = target_profile.id

            where card_series.is_visible = true

            group by
                card_series.id,
                card_series.name,
                card_series.sort_order
        ) as series_data;
    end if;

    if target_profile.show_favorites then
        select coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id',
                        favorite_data.id,

                    'cardNumber',
                        favorite_data.card_number,

                    'name',
                        favorite_data.name,

                    'rarity',
                        favorite_data.rarity,

                    'imageUrl',
                        favorite_data.image_url,

                    'thumbnailUrl',
                        favorite_data.thumbnail_url,

                    'seriesId',
                        favorite_data.series_id,

                    'seriesName',
                        favorite_data.series_name
                )
                order by favorite_data.sort_order
            ),
            '[]'::jsonb
        )
        into favorite_cards
        from (
            select
                cards.id,
                cards.card_number,
                cards.name,
                cards.rarity,
                cards.image_url,
                cards.thumbnail_url,
                cards.series_id,
                card_series.name as series_name,
                cards.sort_order

            from public.user_cards

            join public.cards
              on cards.id = user_cards.card_id

            join public.card_series
              on card_series.id = cards.series_id

            where user_cards.user_id = target_profile.id
              and user_cards.is_favorite = true
              and cards.is_visible = true

            limit 12
        ) as favorite_data;
    end if;

    if target_profile.show_featured_cards
       and target_profile.favorite_card_id is not null then
        select jsonb_build_object(
            'id',
                cards.id,

            'cardNumber',
                cards.card_number,

            'name',
                cards.name,

            'rarity',
                cards.rarity,

            'imageUrl',
                cards.image_url,

            'thumbnailUrl',
                cards.thumbnail_url,

            'seriesId',
                cards.series_id,

            'seriesName',
                card_series.name,

            'description',
                cards.description,

            'artist',
                cards.artist
        )
        into showcase_card
        from public.cards

        join public.card_series
          on card_series.id = cards.series_id

        join public.user_cards
          on user_cards.card_id = cards.id
         and user_cards.user_id = target_profile.id

        where cards.id = target_profile.favorite_card_id
          and cards.is_visible = true

        limit 1;
    end if;

    return jsonb_build_object(
        'found',
            true,

        'private',
            false,

        'profile',
            jsonb_build_object(
                'username',
                    target_profile.username,

                'displayName',
                    target_profile.display_name,

                'bio',
                    target_profile.bio,

                'visibility',
                    target_profile.profile_visibility,

                'memberSince',
                    target_profile.created_at,

                'showCollectionStats',
                    target_profile.show_collection_stats,

                'showFavorites',
                    target_profile.show_favorites,

                'showFeaturedCards',
                    target_profile.show_featured_cards
            ),

        'collection',
            case
                when target_profile.show_collection_stats then
                    jsonb_build_object(
                        'uniqueCards',
                            unique_cards_owned,

                        'totalCopies',
                            total_copies_owned,

                        'catalogTotal',
                            total_catalog_cards,

                        'completionPercent',
                            case
                                when total_catalog_cards > 0 then
                                    round(
                                        (
                                            unique_cards_owned::numeric
                                            /
                                            total_catalog_cards::numeric
                                        ) * 100
                                    )
                                else 0
                            end,

                        'rarityCounts',
                            rarity_counts,

                        'seriesProgress',
                            series_progress
                    )
                else null
            end,

        'showcaseCard',
            showcase_card,

        'favoriteCards',
            favorite_cards
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_profile_extras(requested_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    target_profile_id text;
    target_user_id uuid;
begin
    select id::text
    into target_profile_id
    from public.profiles
    where lower(username) = lower(trim(requested_username))
      and onboarding_complete = true
      and profile_visibility in ('public','unlisted')
    limit 1;

    if target_profile_id is null then
        return jsonb_build_object('found', false);
    end if;

    begin
        target_user_id := target_profile_id::uuid;
    exception when invalid_text_representation then
        return jsonb_build_object('found', false);
    end;

    return jsonb_build_object(
        'found', true,
        'avatarUrl', (
            select avatar_url
            from public.profiles
            where id::text = target_profile_id
        ),
        'title', (
            select jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'description', t.description
            )
            from public.profiles p
            join public.collector_titles t
              on t.id::text = p.selected_title_id::text
            where p.id::text = target_profile_id
        ),
        'achievements', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'name', a.name,
                    'description', a.description,
                    'icon', a.icon,
                    'unlockedAt', ua.unlocked_at
                )
                order by a.sort_order
            )
            from public.user_achievements ua
            join public.achievement_definitions a
              on a.id = ua.achievement_id
            where ua.user_id = target_user_id
              and a.is_active = true
        ), '[]'::jsonb)
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_trade_lists(requested_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_user_id uuid;
  normalized_username text := lower(trim(requested_username));
  lists_are_public boolean := false;
  viewer_id uuid := auth.uid();
  wishlist_cards jsonb := '[]'::jsonb;
  trade_cards jsonb := '[]'::jsonb;
begin
  if normalized_username is null or normalized_username = '' then
    raise exception 'A collector username is required.';
  end if;

  select id into target_user_id
  from public.profiles
  where lower(username) = normalized_username
    and onboarding_complete = true
    and profile_visibility in ('public','unlisted')
  limit 1;

  if target_user_id is null then
    return jsonb_build_object('found',false);
  end if;

  select coalesce(public_lists,true) into lists_are_public
  from public.user_trade_settings
  where user_id = target_user_id;

  if not found then lists_are_public := true; end if;

  if lists_are_public = false and viewer_id is distinct from target_user_id then
    return jsonb_build_object('found',true,'publicLists',false,'wishlist','[]'::jsonb,'forTrade','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'viewerOwnsThis', case when viewer_id is null then false else exists(
      select 1 from public.user_cards vuc where vuc.user_id = viewer_id and vuc.card_id = c.id and vuc.quantity > 0
    ) end
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into wishlist_cards
  from public.user_card_preferences p
  join public.cards c on c.id = p.card_id
  join public.card_series s on s.id = c.series_id
  where p.user_id = target_user_id and p.wishlisted = true and c.is_visible = true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'tradeQuantity', least(p.trade_quantity,greatest(uc.quantity-1,0)),
    'viewerWantsThis', case when viewer_id is null then false else exists(
      select 1 from public.user_card_preferences vp where vp.user_id = viewer_id and vp.card_id = c.id and vp.wishlisted = true
    ) end
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into trade_cards
  from public.user_card_preferences p
  join public.user_cards uc on uc.user_id = target_user_id and uc.card_id = p.card_id
  join public.cards c on c.id = p.card_id
  join public.card_series s on s.id = c.series_id
  where p.user_id = target_user_id
    and p.trade_quantity > 0
    and uc.quantity > 1
    and c.is_visible = true;

  return jsonb_build_object(
    'found',true,
    'publicLists',true,
    'username',normalized_username,
    'wishlist',wishlist_cards,
    'forTrade',trade_cards
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_twitch_connection_v890(requested_username text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select jsonb_build_object('linked',true,'login',c.twitch_login,'displayName',c.twitch_display_name,'avatarUrl',c.twitch_avatar_url) from public.profiles p join public.twitch_connections c on c.user_id=p.id where lower(p.username)=lower(requested_username) and coalesce(p.profile_visibility,'public')='public'),jsonb_build_object('linked',false));
$function$
;

CREATE OR REPLACE FUNCTION public.get_published_news_posts(requested_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'summary',n.summary,'body',n.body,'imageUrl',n.image_url,'publishedAt',n.published_at,'isPinned',n.is_pinned) order by n.is_pinned desc,n.published_at desc),'[]'::jsonb)
 from (select * from public.starlight_news_posts where is_published=true and published_at<=now() order by is_pinned desc,published_at desc limit greatest(1,least(coalesce(requested_limit,30),100))) n;
$function$
;

CREATE OR REPLACE FUNCTION public.get_star_bits_exchange_preview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid;

    current_balance bigint := 0;
    duplicate_card_types integer := 0;
    total_duplicate_copies integer := 0;
    total_exchange_value bigint := 0;

    duplicate_cards jsonb := '[]'::jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to view your Star Bits exchange.';
    end if;

    insert into public.user_wallets (
        user_id
    )
    values (
        current_user_id
    )
    on conflict (user_id)
    do nothing;

    select
        star_bits
    into
        current_balance
    from public.user_wallets
    where user_id =
        current_user_id;

    select
        count(*),
        coalesce(
            sum(
                user_cards.quantity - 1
            ),
            0
        ),
        coalesce(
            sum(
                (
                    user_cards.quantity - 1
                )
                *
                star_bits_values.bits_per_duplicate
            ),
            0
        )
    into
        duplicate_card_types,
        total_duplicate_copies,
        total_exchange_value
    from public.user_cards

    join public.cards
      on cards.id =
         user_cards.card_id

    join public.star_bits_values
      on star_bits_values.rarity =
         cards.rarity

    where user_cards.user_id =
          current_user_id
      and user_cards.quantity > 1;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'cardId',
                    duplicate_data.card_id,

                'cardNumber',
                    duplicate_data.card_number,

                'name',
                    duplicate_data.name,

                'rarity',
                    duplicate_data.rarity,

                'imageUrl',
                    duplicate_data.image_url,

                'thumbnailUrl',
                    duplicate_data.thumbnail_url,

                'seriesId',
                    duplicate_data.series_id,

                'seriesName',
                    duplicate_data.series_name,

                'totalQuantity',
                    duplicate_data.total_quantity,

                'keptQuantity',
                    1,

                'duplicateQuantity',
                    duplicate_data.duplicate_quantity,

                'bitsPerDuplicate',
                    duplicate_data.bits_per_duplicate,

                'totalBitValue',
                    duplicate_data.total_bit_value
            )
            order by
                duplicate_data.series_sort,
                duplicate_data.card_sort
        ),
        '[]'::jsonb
    )
    into duplicate_cards

    from (
        select
            cards.id as card_id,
            cards.card_number,
            cards.name,
            cards.rarity,
            cards.image_url,
            cards.thumbnail_url,
            cards.series_id,
            card_series.name as series_name,
            card_series.sort_order as series_sort,
            cards.sort_order as card_sort,

            user_cards.quantity as total_quantity,

            user_cards.quantity - 1
                as duplicate_quantity,

            star_bits_values.bits_per_duplicate,

            (
                user_cards.quantity - 1
            )
            *
            star_bits_values.bits_per_duplicate
                as total_bit_value

        from public.user_cards

        join public.cards
          on cards.id =
             user_cards.card_id

        join public.card_series
          on card_series.id =
             cards.series_id

        join public.star_bits_values
          on star_bits_values.rarity =
             cards.rarity

        where user_cards.user_id =
              current_user_id
          and user_cards.quantity > 1
    ) as duplicate_data;

    return jsonb_build_object(
        'starBitsBalance',
            current_balance,

        'duplicateCardTypes',
            duplicate_card_types,

        'totalDuplicateCopies',
            total_duplicate_copies,

        'totalExchangeValue',
            total_exchange_value,

        'duplicateCards',
            duplicate_cards,

        'exchangeRates',
            jsonb_build_object(
                'Common', 5,
                'Uncommon', 10,
                'Rare', 25,
                'Epic', 75,
                'Legendary', 250
            )
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_trade_offer_context(requested_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  target public.profiles%rowtype;
  my_cards jsonb := '[]'::jsonb;
  their_cards jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into target from public.profiles
  where lower(username)=lower(trim(requested_username)) and onboarding_complete=true limit 1;
  if not found then raise exception 'Collector not found.'; end if;
  if target.id = uid then raise exception 'You cannot trade with yourself.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
    'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesName',s.name,
    'available',greatest(uc.quantity-1,0),
    'wantedByOther',coalesce(tp.wishlisted,false)
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into my_cards
  from public.user_cards uc
  join public.cards c on c.id=uc.card_id
  join public.card_series s on s.id=c.series_id
  left join public.user_card_preferences tp on tp.user_id=target.id and tp.card_id=c.id
  where uc.user_id=uid and uc.quantity>1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
    'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesName',s.name,
    'available',greatest(uc.quantity-1,0),
    'onMyWishlist',coalesce(mp.wishlisted,false)
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into their_cards
  from public.user_cards uc
  join public.cards c on c.id=uc.card_id
  join public.card_series s on s.id=c.series_id
  left join public.user_card_preferences mp on mp.user_id=uid and mp.card_id=c.id
  where uc.user_id=target.id and uc.quantity>1;

  return jsonb_build_object(
    'recipient',jsonb_build_object('id',target.id,'username',target.username,'displayName',target.display_name,'avatarUrl',target.avatar_url),
    'myAvailableCards',my_cards,'theirAvailableCards',their_cards
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_twitch_public_config_v890()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'workerBaseUrl',coalesce(worker_base_url,''),
    'broadcasterLinked',broadcaster_twitch_user_id is not null,
    'broadcasterLogin',broadcaster_login,
    'broadcasterDisplayName',broadcaster_display_name,
    'broadcasterAvatarUrl',broadcaster_avatar_url,
    'eventSubStatus',eventsub_status,
    'lastEventSubSyncAt',last_eventsub_sync_at,
    'redeemsEnabled',coalesce(redeems_enabled,true),
    'lastEventReceivedAt',last_event_received_at,
    'lastRewardDeliveryAt',last_reward_delivery_at
  )
  from public.twitch_integration_config
  where id=true;
$function$
;

CREATE OR REPLACE FUNCTION public.get_twitch_shop_redeems_v892()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('ruleId',r.id,'name',r.name,'boosterId',r.booster_id,'twitchRewardId',r.twitch_reward_id) order by r.name),'[]'::jsonb)
  from public.twitch_reward_rules r
  where r.active=true and r.event_type='channel_points' and r.reward_type='booster' and r.booster_id is not null;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
    insert into public.profiles (
        id,
        username,
        display_name
    )
    values (
        new.id,
        'collector_' || substr(replace(new.id::text, '-', ''), 1, 10),
        'New Collector'
    );

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.import_legacy_collection(collected_card_ids text[], requested_import_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid;
    valid_card_ids text[];
    imported_count integer := 0;
    already_imported boolean := false;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception 'You must be signed in to import a collection.';
    end if;

    if requested_import_hash is null
       or length(trim(requested_import_hash)) < 8 then
        raise exception 'The import hash is invalid.';
    end if;

    if collected_card_ids is null then
        raise exception 'No collection data was supplied.';
    end if;

    if cardinality(collected_card_ids) > 1000 then
        raise exception 'The collection import is too large.';
    end if;

    select exists (
        select 1
        from public.collection_imports
        where user_id = current_user_id
          and import_hash = requested_import_hash
    )
    into already_imported;

    if already_imported then
        return jsonb_build_object(
            'success', true,
            'alreadyImported', true,
            'importedCount', 0
        );
    end if;

    select coalesce(
        array_agg(cards.id order by cards.id),
        array[]::text[]
    )
    into valid_card_ids
    from public.cards
    where cards.id = any(collected_card_ids)
      and cards.is_visible = true
      and cards.is_collectible = true;

    insert into public.user_cards (
        user_id,
        card_id,
        quantity,
        is_favorite
    )
    select
        current_user_id,
        valid_card_id,
        1,
        false
    from unnest(valid_card_ids) as valid_card_id
    on conflict (user_id, card_id)
    do nothing;

    get diagnostics imported_count = row_count;

    insert into public.collection_imports (
        user_id,
        import_version,
        import_hash,
        imported_card_count,
        imported_favorite_count
    )
    values (
        current_user_id,
        'v79.9-local-storage',
        requested_import_hash,
        imported_count,
        0
    );

    return jsonb_build_object(
        'success', true,
        'alreadyImported', false,
        'requestedCount', cardinality(collected_card_ids),
        'validCount', cardinality(valid_card_ids),
        'importedCount', imported_count
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_content_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.site_roles where user_id=auth.uid() and role in ('owner','admin'));
$function$
;

CREATE OR REPLACE FUNCTION public.is_site_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.site_roles
        where user_id = auth.uid()
          and role in ('owner', 'admin')
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_starlight_asset_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.site_roles sr
        where sr.user_id = check_user_id
          and lower(sr.role::text) in (
              'owner',
              'admin',
              'administrator'
          )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read_v881()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare n integer; begin update public.user_notifications set is_read=true,read_at=coalesce(read_at,now()) where user_id=auth.uid() and is_read=false; get diagnostics n=row_count; return n; end;$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read_v881(requested_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin update public.user_notifications set is_read=true,read_at=coalesce(read_at,now()) where id=requested_id and user_id=auth.uid(); return found; end;$function$
;

CREATE OR REPLACE FUNCTION public.notification_type_enabled_v882(requested_user_id uuid, requested_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.notification_preferences%rowtype;
begin
  select * into p from public.notification_preferences where user_id = requested_user_id;
  if not found then return true; end if;
  return case lower(coalesce(requested_type,'general'))
    when 'daily_booster' then p.daily_booster
    when 'trade' then p.trade
    when 'achievement' then p.achievement
    when 'reward' then p.reward
    when 'event' then p.event
    when 'broadcast' then p.broadcast
    else true
  end;
end;$function$
;

CREATE OR REPLACE FUNCTION public.notify_achievement_v881()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a record;
begin
  select name,description,icon into a from public.achievement_definitions where id=new.achievement_id;
  perform public.create_user_notification_v881(new.user_id,'achievement','Achievement unlocked: '||coalesce(a.name,new.achievement_id),a.description,coalesce(a.icon,'🏆'),'profile','{}'::jsonb,'achievement:'||new.achievement_id,null);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.notify_redemption_v881()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare label text;
begin
  select rc.label into label from public.reward_codes rc where rc.id=new.code_id;
  perform public.create_user_notification_v881(new.user_id,'reward','Reward code accepted',coalesce(label,'Your Starlight reward')||' is being prepared in Received Rewards.','🎟️','rewards','{}'::jsonb,'redemption:'||new.id,null);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.notify_trade_offer_v881()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare proposer_name text; recipient_name text;
begin
  select coalesce(display_name,username,'A collector') into proposer_name from public.profiles where id=new.proposer_id;
  select coalesce(display_name,username,'A collector') into recipient_name from public.profiles where id=new.recipient_id;
  if tg_op='INSERT' then
    perform public.create_user_notification_v881(new.recipient_id,'trade','New trade offer',proposer_name||' sent you a trade offer.','🤝','offers','{}'::jsonb,'trade-new:'||new.id,null);
  elsif old.status is distinct from new.status then
    if new.status='accepted' then
      perform public.create_user_notification_v881(new.proposer_id,'trade','Trade accepted',recipient_name||' accepted your trade offer.','✅','offers','{}'::jsonb,'trade-status:'||new.id||':accepted',null);
      perform public.create_user_notification_v881(new.recipient_id,'trade','Trade completed','Your trade with '||proposer_name||' was completed.','✅','offers','{}'::jsonb,'trade-status-recipient:'||new.id||':accepted',null);
    elsif new.status='declined' then
      perform public.create_user_notification_v881(new.proposer_id,'trade','Trade declined',recipient_name||' declined your trade offer.','💌','offers','{}'::jsonb,'trade-status:'||new.id||':declined',null);
    elsif new.status='cancelled' then
      perform public.create_user_notification_v881(new.recipient_id,'trade','Trade offer cancelled',proposer_name||' cancelled a trade offer.','↩️','offers','{}'::jsonb,'trade-status:'||new.id||':cancelled',null);
    end if;
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.open_daily_booster()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); mode text; today date; next_at timestamptz; claim_id bigint; selected text[]; rewards jsonb;
begin
 if uid is null then raise exception 'You must be signed in to open a daily booster.'; end if;
 mode:=public.get_free_daily_booster_mode();
 if mode='disabled' then raise exception 'The Free Daily Booster is currently disabled.'; end if;
 today:=timezone('America/New_York',now())::date; next_at:=((today+1)::timestamp at time zone 'America/New_York');
 if mode='daily' then
   insert into public.daily_booster_claims(user_id,claim_date,cards_awarded) values(uid,today,'[]'::jsonb)
   on conflict(user_id,claim_date) do nothing returning id into claim_id;
   if claim_id is null then return jsonb_build_object('success',false,'alreadyClaimed',true,'message','Today''s daily booster has already been opened.','nextClaimAt',next_at); end if;
 end if;
 begin selected:=public.draw_configured_booster_cards('free_daily'); exception when others then if claim_id is not null then delete from public.daily_booster_claims where id=claim_id; end if; raise; end;
 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select uid,x.card_id,x.qty,false,now(),now(),now() from (select card_id,count(*)::int qty from unnest(selected) card_id group by card_id)x
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
 select jsonb_agg(jsonb_build_object('id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesId',c.series_id,'seriesName',s.name,'artist',c.artist,'description',c.description,'quantity',uc.quantity,'isDuplicate',uc.quantity>1) order by p.pos)
 into rewards from unnest(selected) with ordinality p(card_id,pos) join public.cards c on c.id=p.card_id join public.card_series s on s.id=c.series_id join public.user_cards uc on uc.user_id=uid and uc.card_id=c.id;
 if claim_id is not null then update public.daily_booster_claims set cards_awarded=rewards where id=claim_id; end if;
 return jsonb_build_object('success',true,'alreadyClaimed',false,'mode',mode,'claimDate',today,'claimedAt',now(),'nextClaimAt',case when mode='daily' then next_at else null end,'cards',rewards);
end;$function$
;

CREATE OR REPLACE FUNCTION public.open_star_bits_booster()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$select public.open_star_bits_booster_by_id('standard_star_bits');$function$
;

CREATE OR REPLACE FUNCTION public.open_star_bits_booster_by_id(requested_booster_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); cost integer; balance bigint; result jsonb; purchase_id bigint;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select star_bits_cost into cost from public.booster_types where id=requested_booster_id and is_active=true and archived=false;
  if cost is null or cost<=0 then raise exception 'This booster is not available for Star Bits.'; end if;
  insert into public.user_wallets(user_id) values(uid) on conflict(user_id) do nothing;
  select star_bits into balance from public.user_wallets where user_id=uid for update;
  if balance<cost then raise exception 'You do not have enough Star Bits.'; end if;
  update public.user_wallets set star_bits=star_bits-cost,lifetime_star_bits_spent=lifetime_star_bits_spent+cost,updated_at=now() where user_id=uid;
  insert into public.star_bits_booster_purchases(user_id,star_bits_cost,booster_id,cards_awarded) values(uid,cost,requested_booster_id,'[]'::jsonb) returning id into purchase_id;
  begin result:=public.build_and_award_booster(requested_booster_id,uid); exception when others then raise; end;
  update public.star_bits_booster_purchases set cards_awarded=result->'cards' where id=purchase_id;
  insert into public.star_bits_transactions(user_id,transaction_type,star_bits_change,description,metadata) values(uid,'purchase',-cost,'Purchased '||requested_booster_id||' booster.',jsonb_build_object('boosterId',requested_booster_id,'purchaseId',purchase_id));
  return result||jsonb_build_object('success',true,'purchaseId',purchase_id,'boosterId',requested_booster_id);
end;$function$
;

CREATE OR REPLACE FUNCTION public.queue_received_reward_v892(requested_user_id uuid, requested_source_type text, requested_source_id text, requested_title text, requested_message text, requested_reward_type text, requested_reward_payload jsonb, requested_created_by uuid DEFAULT NULL::uuid, requested_metadata jsonb DEFAULT '{}'::jsonb, requested_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare saved public.received_rewards;
begin
  if requested_user_id is null then raise exception 'A collector account is required.'; end if;
  insert into public.received_rewards(user_id,source_type,source_id,title,message,reward_type,reward_payload,created_by,metadata,expires_at)
  values(requested_user_id,requested_source_type,nullif(requested_source_id,''),coalesce(nullif(trim(requested_title),''),'Starlight Reward'),requested_message,requested_reward_type,coalesce(requested_reward_payload,'{}'::jsonb),requested_created_by,coalesce(requested_metadata,'{}'::jsonb),requested_expires_at)
  on conflict(user_id,source_type,source_id) where source_id is not null do update set metadata=public.received_rewards.metadata||excluded.metadata
  returning * into saved;
  if to_regclass('public.user_notifications') is not null then
    perform public.create_user_notification_v881(requested_user_id,'reward','New reward ready to claim',saved.title||' is waiting in Received Rewards.','🎁','rewards',jsonb_build_object('rewardId',saved.id),case when saved.source_id is null then 'received:'||saved.id else 'received:'||saved.source_type||':'||saved.source_id end,requested_expires_at);
  end if;
  return to_jsonb(saved);
end;$function$
;

CREATE OR REPLACE FUNCTION public.redeem_reward_code(requested_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); normalized text; generated_hash text; c public.reward_codes%rowtype; rw public.reward_code_rewards%rowtype; redemption_id bigint; queued jsonb; payload jsonb;
begin
  if uid is null then raise exception 'You must be signed in to redeem a code.'; end if;
  normalized:=regexp_replace(upper(trim(requested_code)),'[^A-Z0-9]','','g'); if normalized='' then raise exception 'Enter a redemption code.'; end if;
  generated_hash:=encode(digest(normalized,'sha256'),'hex'); select * into c from public.reward_codes where code_hash=generated_hash for update;
  if not found then return jsonb_build_object('success',false,'message','That redemption code is not valid.'); end if;
  if not c.active or (c.starts_at is not null and now()<c.starts_at) or (c.expires_at is not null and now()>=c.expires_at) or (c.max_uses is not null and c.current_uses>=c.max_uses) then return jsonb_build_object('success',false,'message','That redemption code is not currently available.'); end if;
  insert into public.reward_code_redemptions(code_id,user_id) values(c.id,uid) on conflict(code_id,user_id) do nothing returning id into redemption_id;
  if redemption_id is null then return jsonb_build_object('success',false,'message','You have already redeemed this code.'); end if;
  select * into rw from public.reward_code_rewards where code_id=c.id;
  payload:=case rw.reward_type when 'star_bits' then jsonb_build_object('amount',rw.star_bits_amount) when 'single_card' then jsonb_build_object('cardId',rw.card_id,'quantity',rw.card_quantity) else jsonb_build_object('cardIds',to_jsonb(rw.booster_card_ids)) end;
  queued:=public.queue_received_reward_v892(uid,'reward_code',c.id::text,c.label,'A reward code was redeemed and is ready to open.',case when rw.reward_type='booster' then 'card_bundle' else rw.reward_type end,payload,null,jsonb_build_object('redemptionId',redemption_id),c.expires_at);
  update public.reward_codes set current_uses=current_uses+1,updated_at=now() where id=c.id;
  update public.reward_code_redemptions set reward_snapshot=jsonb_build_object('pending',true,'receivedRewardId',queued->>'id','label',c.label,'rewardType',rw.reward_type) where id=redemption_id;
  return jsonb_build_object('success',true,'pending',true,'receivedRewardId',queued->>'id','label',c.label,'rewardType',rw.reward_type,'message','Reward added to Received Rewards.');
end;$function$
;

CREATE OR REPLACE FUNCTION public.respond_to_trade_offer(requested_offer_id uuid, requested_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 uid uuid:=auth.uid(); offer public.trade_offers%rowtype; item record; available integer;
begin
 if uid is null then raise exception 'You must be signed in.'; end if;
 select * into offer from public.trade_offers where id=requested_offer_id for update;
 if not found then raise exception 'Trade offer not found.'; end if;
 if offer.status<>'pending' then raise exception 'This trade offer is no longer pending.'; end if;
 if requested_action='cancel' then
   if offer.proposer_id<>uid then raise exception 'Only the sender can cancel this offer.'; end if;
   update public.trade_offers set status='cancelled',updated_at=now(),responded_at=now() where id=offer.id;
   return jsonb_build_object('success',true,'status','cancelled');
 elsif requested_action='decline' then
   if offer.recipient_id<>uid then raise exception 'Only the recipient can decline this offer.'; end if;
   update public.trade_offers set status='declined',updated_at=now(),responded_at=now() where id=offer.id;
   return jsonb_build_object('success',true,'status','declined');
 elsif requested_action<>'accept' then raise exception 'Invalid trade action.'; end if;
 if offer.recipient_id<>uid then raise exception 'Only the recipient can accept this offer.'; end if;

 perform 1 from public.user_cards uc where uc.user_id in(offer.proposer_id,offer.recipient_id) and uc.card_id in(select card_id from public.trade_offer_items where offer_id=offer.id) for update;
 for item in select * from public.trade_offer_items where offer_id=offer.id loop
   if item.side='proposer' then
     select greatest(quantity-1,0) into available from public.user_cards where user_id=offer.proposer_id and card_id=item.card_id;
   else
     select greatest(quantity-1,0) into available from public.user_cards where user_id=offer.recipient_id and card_id=item.card_id;
   end if;
   if item.quantity>coalesce(available,0) then raise exception 'A duplicate card is no longer available. The trade was not completed.'; end if;
 end loop;

 update public.user_cards uc set quantity=uc.quantity-i.quantity,updated_at=now(),last_obtained_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer' and uc.user_id=offer.proposer_id and uc.card_id=i.card_id;
 update public.user_cards uc set quantity=uc.quantity-i.quantity,updated_at=now(),last_obtained_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient' and uc.user_id=offer.recipient_id and uc.card_id=i.card_id;

 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select offer.recipient_id,i.card_id,i.quantity,false,now(),now(),now() from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer'
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select offer.proposer_id,i.card_id,i.quantity,false,now(),now(),now() from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient'
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();

 update public.user_card_preferences p set trade_quantity=greatest(0,p.trade_quantity-i.quantity),updated_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer' and p.user_id=offer.proposer_id and p.card_id=i.card_id;
 update public.user_card_preferences p set trade_quantity=greatest(0,p.trade_quantity-i.quantity),updated_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient' and p.user_id=offer.recipient_id and p.card_id=i.card_id;

 update public.trade_offers set status='accepted',updated_at=now(),responded_at=now() where id=offer.id;
 return jsonb_build_object('success',true,'status','accepted');
end;$function$
;

CREATE OR REPLACE FUNCTION public.save_notification_preferences_v882(requested_preferences jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  insert into public.notification_preferences(user_id,daily_booster,trade,achievement,reward,event,broadcast,updated_at)
  values(
    uid,
    coalesce((requested_preferences->>'daily_booster')::boolean,true),
    coalesce((requested_preferences->>'trade')::boolean,true),
    coalesce((requested_preferences->>'achievement')::boolean,true),
    coalesce((requested_preferences->>'reward')::boolean,true),
    coalesce((requested_preferences->>'event')::boolean,true),
    coalesce((requested_preferences->>'broadcast')::boolean,true),
    now()
  )
  on conflict(user_id) do update set
    daily_booster=excluded.daily_booster, trade=excluded.trade,
    achievement=excluded.achievement, reward=excluded.reward,
    event=excluded.event, broadcast=excluded.broadcast, updated_at=now();
  return public.get_notification_preferences_v882();
end;$function$
;

CREATE OR REPLACE FUNCTION public.set_card_favorite(requested_card_id text, favorite_state boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid;
    affected_rows integer := 0;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception 'You must be signed in.';
    end if;

    update public.user_cards
    set
        is_favorite = favorite_state,
        updated_at = now()
    where user_id = current_user_id
      and card_id = requested_card_id;

    get diagnostics affected_rows = row_count;

    if affected_rows = 0 then
        raise exception 'You do not own this card.';
    end if;

    return jsonb_build_object(
        'success', true,
        'cardId', requested_card_id,
        'isFavorite', favorite_state
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_card_trade_preference(requested_card_id text, requested_wishlisted boolean, requested_trade_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  owned_qty integer := 0;
  max_trade integer := 0;
  final_trade integer := 0;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if not exists(select 1 from public.cards where id = requested_card_id and is_visible = true) then
    raise exception 'Card not found.';
  end if;

  select coalesce(quantity,0) into owned_qty
  from public.user_cards where user_id = uid and card_id = requested_card_id;
  max_trade := greatest(owned_qty - 1, 0);
  final_trade := least(greatest(coalesce(requested_trade_quantity,0),0), max_trade);

  insert into public.user_card_preferences(user_id, card_id, wishlisted, trade_quantity, updated_at)
  values(uid, requested_card_id, coalesce(requested_wishlisted,false), final_trade, now())
  on conflict(user_id, card_id) do update set
    wishlisted = excluded.wishlisted,
    trade_quantity = excluded.trade_quantity,
    updated_at = now();

  return jsonb_build_object('success',true,'cardId',requested_card_id,'wishlisted',coalesce(requested_wishlisted,false),'tradeQuantity',final_trade,'maximumTradeQuantity',max_trade);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_my_profile_extras(requested_avatar_url text, requested_title_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    uid uuid := auth.uid();
begin
    if uid is null then raise exception 'You must be signed in.'; end if;

    if requested_title_id is not null and not exists (
        select 1 from public.user_titles
        where user_id = uid and title_id = requested_title_id
    ) then
        raise exception 'That collector title is not unlocked.';
    end if;

    update public.profiles
    set avatar_url = nullif(trim(requested_avatar_url), ''),
        selected_title_id = requested_title_id,
        updated_at = now()
    where id::text = uid::text;

    return jsonb_build_object('success', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_profile_favorite_card(requested_card_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in.';
    end if;

    if requested_card_id is not null
       and not exists (
            select 1
            from public.user_cards
            where user_id =
                  current_user_id
              and card_id =
                  requested_card_id
       ) then
        raise exception
            'You do not own that card.';
    end if;

    update public.profiles
    set
        favorite_card_id =
            requested_card_id,

        updated_at =
            now()

    where id =
        current_user_id;

    return jsonb_build_object(
        'success', true,
        'favoriteCardId', requested_card_id
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_trade_list_visibility(requested_public boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  insert into public.user_trade_settings(user_id, public_lists, updated_at)
  values(uid, coalesce(requested_public,true), now())
  on conflict(user_id) do update set public_lists = excluded.public_lists, updated_at = now();
  return jsonb_build_object('success',true,'publicLists',coalesce(requested_public,true));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.staff_list_profile_reports(requested_status text DEFAULT NULL::text, requested_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
    staff_role text;
    result jsonb;
begin
    select role into staff_role from public.site_roles where user_id = auth.uid();
    if staff_role not in ('owner','admin','super_moderator','moderator') then
        raise exception 'Moderator access is required.';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'category', r.category,
        'details', r.details,
        'createdAt', r.created_at,
        'updatedAt', r.updated_at,
        'resolutionNote', r.resolution_note,
        'targetUserId', r.target_user_id,
        'targetUsername', tp.username,
        'targetDisplayName', tp.display_name,
        'reporterEmail', ru.email,
        'assignedTo', r.assigned_to,
        'profileHidden', coalesce(ms.profile_hidden, false),
        'profileEditLocked', coalesce(ms.profile_edit_locked, false),
        'moderationReason', ms.reason
    ) order by r.created_at desc), '[]'::jsonb)
    into result
    from public.profile_reports r
    join public.profiles tp on tp.id = r.target_user_id
    join auth.users ru on ru.id = r.reporter_user_id
    left join public.profile_moderation_state ms on ms.user_id = r.target_user_id
    where requested_status is null or requested_status = 'all' or r.status = requested_status
    limit greatest(1, least(coalesce(requested_limit,100),250));

    return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.staff_role_rank(requested_role text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
    select case requested_role
        when 'owner' then 40
        when 'admin' then 30
        when 'super_moderator' then 20
        when 'moderator' then 10
        else 0
    end;
$function$
;

CREATE OR REPLACE FUNCTION public.staff_set_profile_moderation(requested_user_id uuid, requested_hidden boolean, requested_edit_locked boolean, requested_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    actor_id uuid := auth.uid();
    staff_role text;
    target_role text;
    reason_text text := nullif(trim(requested_reason),'');
begin
    select role into staff_role from public.site_roles where user_id = actor_id;
    if staff_role not in ('owner','admin','super_moderator','moderator') then
        raise exception 'Moderator access is required.';
    end if;

    select role into target_role from public.site_roles where user_id = requested_user_id;
    if target_role in ('owner','admin') and staff_role <> 'owner' then
        raise exception 'Only an owner may moderate an owner or administrator profile.';
    end if;

    if (not requested_hidden or not requested_edit_locked)
       and staff_role not in ('owner','admin','super_moderator') then
        raise exception 'A super moderator or higher is required to restore profile access.';
    end if;

    if (requested_hidden or requested_edit_locked) and reason_text is null then
        raise exception 'A moderation reason is required.';
    end if;

    insert into public.profile_moderation_state (
        user_id, profile_hidden, profile_edit_locked, reason, updated_by, updated_at
    ) values (
        requested_user_id, requested_hidden, requested_edit_locked, reason_text, actor_id, now()
    ) on conflict (user_id) do update set
        profile_hidden = excluded.profile_hidden,
        profile_edit_locked = excluded.profile_edit_locked,
        reason = excluded.reason,
        updated_by = excluded.updated_by,
        updated_at = now();

    if requested_hidden then
        update public.profiles set profile_visibility = 'private', updated_at = now()
        where id = requested_user_id;
    end if;

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id, 'profile_moderation_changed', requested_user_id, 'profile', requested_user_id::text,
        jsonb_build_object('hidden',requested_hidden,'editLocked',requested_edit_locked,'reason',reason_text)
    );

    return jsonb_build_object(
        'success',true,'userId',requested_user_id,
        'profileHidden',requested_hidden,'profileEditLocked',requested_edit_locked
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.staff_update_profile_report(requested_report_id bigint, requested_status text, requested_resolution_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    actor_id uuid := auth.uid();
    staff_role text;
    target_id uuid;
begin
    select role into staff_role from public.site_roles where user_id = actor_id;
    if staff_role not in ('owner','admin','super_moderator','moderator') then
        raise exception 'Moderator access is required.';
    end if;

    if requested_status not in ('open','reviewing','resolved','dismissed') then
        raise exception 'Invalid report status.';
    end if;

    update public.profile_reports
    set status = requested_status,
        assigned_to = case when requested_status = 'reviewing' then actor_id else assigned_to end,
        resolution_note = nullif(trim(requested_resolution_note),''),
        resolved_at = case when requested_status in ('resolved','dismissed') then now() else null end,
        updated_at = now()
    where id = requested_report_id
    returning target_user_id into target_id;

    if target_id is null then raise exception 'Report not found.'; end if;

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id, 'profile_report_updated', target_id, 'profile_report', requested_report_id::text,
        jsonb_build_object('status', requested_status, 'note', nullif(trim(requested_resolution_note),''))
    );

    return jsonb_build_object('success',true,'reportId',requested_report_id,'status',requested_status);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_profile_report(requested_username text, requested_category text, requested_details text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    reporter_id uuid := auth.uid();
    target_id uuid;
    normalized_username text := lower(trim(requested_username));
    normalized_details text := trim(requested_details);
    inserted_id bigint;
begin
    if reporter_id is null then
        raise exception 'You must be signed in to submit a report.';
    end if;

    if requested_category not in ('impersonation','harassment','inappropriate_profile','spam','other') then
        raise exception 'Invalid report category.';
    end if;

    if char_length(normalized_details) < 10 or char_length(normalized_details) > 1000 then
        raise exception 'Report details must be between 10 and 1000 characters.';
    end if;

    select id into target_id
    from public.profiles
    where lower(username) = normalized_username
      and onboarding_complete = true;

    if target_id is null then
        raise exception 'Collector profile not found.';
    end if;

    if target_id = reporter_id then
        raise exception 'You cannot report your own profile.';
    end if;

    if exists (
        select 1 from public.profile_reports
        where reporter_user_id = reporter_id
          and target_user_id = target_id
          and status in ('open','reviewing')
    ) then
        raise exception 'You already have an active report for this profile.';
    end if;

    insert into public.profile_reports (
        reporter_user_id, target_user_id, category, details
    ) values (
        reporter_id, target_id, requested_category, normalized_details
    ) returning id into inserted_id;

    return jsonb_build_object('success', true, 'reportId', inserted_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_my_achievements()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    uid uuid := auth.uid();
    unique_count integer := 0;
    has_rare boolean := false;
    has_legendary boolean := false;
    has_complete_series boolean := false;
    lifetime_bits bigint := 0;
begin
    if uid is null then
        raise exception 'You must be signed in.';
    end if;

    select count(*),
           bool_or(cards.rarity = 'Rare'),
           bool_or(cards.rarity = 'Legendary')
    into unique_count, has_rare, has_legendary
    from public.user_cards
    join public.cards on cards.id = user_cards.card_id
    where user_cards.user_id = uid;

    select coalesce(lifetime_star_bits_earned, 0)
    into lifetime_bits
    from public.user_wallets
    where user_id = uid;

    select exists (
        select 1
        from public.card_series s
        where s.is_visible = true
          and not exists (
              select 1
              from public.cards c
              where c.series_id = s.id
                and c.is_visible = true
                and c.is_collectible = true
                and not exists (
                    select 1 from public.user_cards uc
                    where uc.user_id = uid and uc.card_id = c.id
                )
          )
    ) into has_complete_series;

    insert into public.user_achievements (user_id, achievement_id)
    values (uid, 'account_created') on conflict do nothing;

    if unique_count >= 1 then
        insert into public.user_achievements values (uid, 'first_card', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'first_pull', now()) on conflict do nothing;
    end if;
    if has_rare then
        insert into public.user_achievements values (uid, 'first_rare', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'rare_hunter', now()) on conflict do nothing;
    end if;
    if has_legendary then
        insert into public.user_achievements values (uid, 'first_legendary', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'legendary_light', now()) on conflict do nothing;
    end if;
    if unique_count >= 5 then
        insert into public.user_achievements values (uid, 'five_unique', now()) on conflict do nothing;
    end if;
    if has_complete_series then
        insert into public.user_achievements values (uid, 'series_complete', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'series_complete', now()) on conflict do nothing;
    end if;
    if lifetime_bits >= 100 then
        insert into public.user_achievements values (uid, 'star_bits_100', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'star_bits_100', now()) on conflict do nothing;
    end if;

    insert into public.user_titles values (uid, 'new_collector', now()) on conflict do nothing;

    return jsonb_build_object('success', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_my_notifications_v881()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); e record; daily jsonb; daily_key text;
begin
  if uid is null then return; end if;
  delete from public.user_notifications where user_id=uid and expires_at is not null and expires_at<now();
  for e in select id,name,description,end_at from public.starlight_events where is_active=true and is_hidden=false and now() between start_at and end_at loop
    perform public.create_user_notification_v881(uid,'event','🎉 '||e.name,coalesce(e.description,'A Starlight event is active now.'),'🎉','events',jsonb_build_object('event',e.id),'event-active:'||e.id,e.end_at);
  end loop;
  begin
    daily:=public.get_daily_booster_status();
    if coalesce((daily->>'available')::boolean,false) then
      daily_key:='daily-ready:'||timezone('America/New_York',now())::date::text;
      perform public.create_user_notification_v881(uid,'daily_booster','Your Daily Free Booster is ready!','Open today’s free pack and reveal your new cards.','✨','daily','{}'::jsonb,daily_key,((timezone('America/New_York',now())::date+1)::timestamp at time zone 'America/New_York'));
    end if;
  exception when others then null; end;
end;$function$
;

CREATE OR REPLACE FUNCTION public.unlink_my_twitch_v890()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); n integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  delete from public.twitch_connections where user_id=uid;
  get diagnostics n=row_count;
  if n>0 and to_regclass('public.user_notifications') is not null then
    perform public.create_user_notification_v881(uid,'twitch','Twitch account unlinked','Your Twitch account is no longer linked to Starlight Cards.','📺','profile','{}'::jsonb,'twitch-unlinked:'||extract(epoch from now())::bigint,null);
  end if;
  return n>0;
end;$function$
;

CREATE OR REPLACE FUNCTION public.update_collector_profile(requested_username text, requested_display_name text, requested_bio text, requested_visibility text, requested_show_collection_stats boolean, requested_show_favorites boolean, requested_show_featured_cards boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid;
    normalized_username text;
    normalized_display_name text;
    normalized_bio text;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to update your profile.';
    end if;

    normalized_username :=
        lower(trim(requested_username));

    normalized_display_name :=
        nullif(trim(requested_display_name), '');

    normalized_bio :=
        nullif(trim(requested_bio), '');

    if normalized_username !~
       '^[a-z0-9_]{3,24}$' then
        raise exception
            'Username must be 3–24 characters using lowercase letters, numbers, or underscores.';
    end if;

    if exists (
        select 1
        from public.reserved_usernames
        where username = normalized_username
    ) then
        raise exception
            'That username is reserved.';
    end if;

    if exists (
        select 1
        from public.profiles
        where lower(username) =
              normalized_username
          and id <> current_user_id
    ) then
        raise exception
            'That username is already taken.';
    end if;

    if normalized_display_name is null
       or char_length(normalized_display_name) > 40 then
        raise exception
            'Display name must be between 1 and 40 characters.';
    end if;

    if normalized_bio is not null
       and char_length(normalized_bio) > 240 then
        raise exception
            'Bio must be 240 characters or fewer.';
    end if;

    if requested_visibility not in (
        'public',
        'unlisted',
        'private'
    ) then
        raise exception
            'Invalid profile visibility.';
    end if;

    update public.profiles
    set
        username =
            normalized_username,

        display_name =
            normalized_display_name,

        bio =
            normalized_bio,

        profile_visibility =
            requested_visibility,

        show_collection_stats =
            coalesce(
                requested_show_collection_stats,
                true
            ),

        show_favorites =
            coalesce(
                requested_show_favorites,
                true
            ),

        show_featured_cards =
            coalesce(
                requested_show_featured_cards,
                true
            ),

        onboarding_complete =
            true,

        updated_at =
            now()

    where id =
        current_user_id;

    return jsonb_build_object(
        'success', true,
        'username', normalized_username,
        'displayName', normalized_display_name,
        'bio', normalized_bio,
        'visibility', requested_visibility
    );
end;
$function$
;

grant delete on table "public"."achievement_definitions" to "anon";

grant insert on table "public"."achievement_definitions" to "anon";

grant references on table "public"."achievement_definitions" to "anon";

grant select on table "public"."achievement_definitions" to "anon";

grant trigger on table "public"."achievement_definitions" to "anon";

grant truncate on table "public"."achievement_definitions" to "anon";

grant update on table "public"."achievement_definitions" to "anon";

grant delete on table "public"."achievement_definitions" to "authenticated";

grant insert on table "public"."achievement_definitions" to "authenticated";

grant references on table "public"."achievement_definitions" to "authenticated";

grant select on table "public"."achievement_definitions" to "authenticated";

grant trigger on table "public"."achievement_definitions" to "authenticated";

grant truncate on table "public"."achievement_definitions" to "authenticated";

grant update on table "public"."achievement_definitions" to "authenticated";

grant delete on table "public"."achievement_definitions" to "service_role";

grant insert on table "public"."achievement_definitions" to "service_role";

grant references on table "public"."achievement_definitions" to "service_role";

grant select on table "public"."achievement_definitions" to "service_role";

grant trigger on table "public"."achievement_definitions" to "service_role";

grant truncate on table "public"."achievement_definitions" to "service_role";

grant update on table "public"."achievement_definitions" to "service_role";

grant delete on table "public"."booster_reward_cards" to "anon";

grant insert on table "public"."booster_reward_cards" to "anon";

grant references on table "public"."booster_reward_cards" to "anon";

grant select on table "public"."booster_reward_cards" to "anon";

grant trigger on table "public"."booster_reward_cards" to "anon";

grant truncate on table "public"."booster_reward_cards" to "anon";

grant update on table "public"."booster_reward_cards" to "anon";

grant delete on table "public"."booster_reward_cards" to "authenticated";

grant insert on table "public"."booster_reward_cards" to "authenticated";

grant references on table "public"."booster_reward_cards" to "authenticated";

grant select on table "public"."booster_reward_cards" to "authenticated";

grant trigger on table "public"."booster_reward_cards" to "authenticated";

grant truncate on table "public"."booster_reward_cards" to "authenticated";

grant update on table "public"."booster_reward_cards" to "authenticated";

grant delete on table "public"."booster_reward_cards" to "service_role";

grant insert on table "public"."booster_reward_cards" to "service_role";

grant references on table "public"."booster_reward_cards" to "service_role";

grant select on table "public"."booster_reward_cards" to "service_role";

grant trigger on table "public"."booster_reward_cards" to "service_role";

grant truncate on table "public"."booster_reward_cards" to "service_role";

grant update on table "public"."booster_reward_cards" to "service_role";

grant delete on table "public"."booster_slot_rates" to "anon";

grant insert on table "public"."booster_slot_rates" to "anon";

grant references on table "public"."booster_slot_rates" to "anon";

grant select on table "public"."booster_slot_rates" to "anon";

grant trigger on table "public"."booster_slot_rates" to "anon";

grant truncate on table "public"."booster_slot_rates" to "anon";

grant update on table "public"."booster_slot_rates" to "anon";

grant delete on table "public"."booster_slot_rates" to "authenticated";

grant insert on table "public"."booster_slot_rates" to "authenticated";

grant references on table "public"."booster_slot_rates" to "authenticated";

grant select on table "public"."booster_slot_rates" to "authenticated";

grant trigger on table "public"."booster_slot_rates" to "authenticated";

grant truncate on table "public"."booster_slot_rates" to "authenticated";

grant update on table "public"."booster_slot_rates" to "authenticated";

grant delete on table "public"."booster_slot_rates" to "service_role";

grant insert on table "public"."booster_slot_rates" to "service_role";

grant references on table "public"."booster_slot_rates" to "service_role";

grant select on table "public"."booster_slot_rates" to "service_role";

grant trigger on table "public"."booster_slot_rates" to "service_role";

grant truncate on table "public"."booster_slot_rates" to "service_role";

grant update on table "public"."booster_slot_rates" to "service_role";

grant delete on table "public"."booster_slots" to "anon";

grant insert on table "public"."booster_slots" to "anon";

grant references on table "public"."booster_slots" to "anon";

grant select on table "public"."booster_slots" to "anon";

grant trigger on table "public"."booster_slots" to "anon";

grant truncate on table "public"."booster_slots" to "anon";

grant update on table "public"."booster_slots" to "anon";

grant delete on table "public"."booster_slots" to "authenticated";

grant insert on table "public"."booster_slots" to "authenticated";

grant references on table "public"."booster_slots" to "authenticated";

grant select on table "public"."booster_slots" to "authenticated";

grant trigger on table "public"."booster_slots" to "authenticated";

grant truncate on table "public"."booster_slots" to "authenticated";

grant update on table "public"."booster_slots" to "authenticated";

grant delete on table "public"."booster_slots" to "service_role";

grant insert on table "public"."booster_slots" to "service_role";

grant references on table "public"."booster_slots" to "service_role";

grant select on table "public"."booster_slots" to "service_role";

grant trigger on table "public"."booster_slots" to "service_role";

grant truncate on table "public"."booster_slots" to "service_role";

grant update on table "public"."booster_slots" to "service_role";

grant delete on table "public"."booster_types" to "anon";

grant insert on table "public"."booster_types" to "anon";

grant references on table "public"."booster_types" to "anon";

grant select on table "public"."booster_types" to "anon";

grant trigger on table "public"."booster_types" to "anon";

grant truncate on table "public"."booster_types" to "anon";

grant update on table "public"."booster_types" to "anon";

grant delete on table "public"."booster_types" to "authenticated";

grant insert on table "public"."booster_types" to "authenticated";

grant references on table "public"."booster_types" to "authenticated";

grant select on table "public"."booster_types" to "authenticated";

grant trigger on table "public"."booster_types" to "authenticated";

grant truncate on table "public"."booster_types" to "authenticated";

grant update on table "public"."booster_types" to "authenticated";

grant delete on table "public"."booster_types" to "service_role";

grant insert on table "public"."booster_types" to "service_role";

grant references on table "public"."booster_types" to "service_role";

grant select on table "public"."booster_types" to "service_role";

grant trigger on table "public"."booster_types" to "service_role";

grant truncate on table "public"."booster_types" to "service_role";

grant update on table "public"."booster_types" to "service_role";

grant delete on table "public"."card_categories" to "anon";

grant insert on table "public"."card_categories" to "anon";

grant references on table "public"."card_categories" to "anon";

grant select on table "public"."card_categories" to "anon";

grant trigger on table "public"."card_categories" to "anon";

grant truncate on table "public"."card_categories" to "anon";

grant update on table "public"."card_categories" to "anon";

grant delete on table "public"."card_categories" to "authenticated";

grant insert on table "public"."card_categories" to "authenticated";

grant references on table "public"."card_categories" to "authenticated";

grant select on table "public"."card_categories" to "authenticated";

grant trigger on table "public"."card_categories" to "authenticated";

grant truncate on table "public"."card_categories" to "authenticated";

grant update on table "public"."card_categories" to "authenticated";

grant delete on table "public"."card_categories" to "service_role";

grant insert on table "public"."card_categories" to "service_role";

grant references on table "public"."card_categories" to "service_role";

grant select on table "public"."card_categories" to "service_role";

grant trigger on table "public"."card_categories" to "service_role";

grant truncate on table "public"."card_categories" to "service_role";

grant update on table "public"."card_categories" to "service_role";

grant delete on table "public"."card_finishes" to "anon";

grant insert on table "public"."card_finishes" to "anon";

grant references on table "public"."card_finishes" to "anon";

grant select on table "public"."card_finishes" to "anon";

grant trigger on table "public"."card_finishes" to "anon";

grant truncate on table "public"."card_finishes" to "anon";

grant update on table "public"."card_finishes" to "anon";

grant delete on table "public"."card_finishes" to "authenticated";

grant insert on table "public"."card_finishes" to "authenticated";

grant references on table "public"."card_finishes" to "authenticated";

grant select on table "public"."card_finishes" to "authenticated";

grant trigger on table "public"."card_finishes" to "authenticated";

grant truncate on table "public"."card_finishes" to "authenticated";

grant update on table "public"."card_finishes" to "authenticated";

grant delete on table "public"."card_finishes" to "service_role";

grant insert on table "public"."card_finishes" to "service_role";

grant references on table "public"."card_finishes" to "service_role";

grant select on table "public"."card_finishes" to "service_role";

grant trigger on table "public"."card_finishes" to "service_role";

grant truncate on table "public"."card_finishes" to "service_role";

grant update on table "public"."card_finishes" to "service_role";

grant delete on table "public"."card_series" to "anon";

grant insert on table "public"."card_series" to "anon";

grant references on table "public"."card_series" to "anon";

grant select on table "public"."card_series" to "anon";

grant trigger on table "public"."card_series" to "anon";

grant truncate on table "public"."card_series" to "anon";

grant update on table "public"."card_series" to "anon";

grant delete on table "public"."card_series" to "authenticated";

grant insert on table "public"."card_series" to "authenticated";

grant references on table "public"."card_series" to "authenticated";

grant select on table "public"."card_series" to "authenticated";

grant trigger on table "public"."card_series" to "authenticated";

grant truncate on table "public"."card_series" to "authenticated";

grant update on table "public"."card_series" to "authenticated";

grant delete on table "public"."card_series" to "service_role";

grant insert on table "public"."card_series" to "service_role";

grant references on table "public"."card_series" to "service_role";

grant select on table "public"."card_series" to "service_role";

grant trigger on table "public"."card_series" to "service_role";

grant truncate on table "public"."card_series" to "service_role";

grant update on table "public"."card_series" to "service_role";

grant delete on table "public"."card_subcategories" to "anon";

grant insert on table "public"."card_subcategories" to "anon";

grant references on table "public"."card_subcategories" to "anon";

grant select on table "public"."card_subcategories" to "anon";

grant trigger on table "public"."card_subcategories" to "anon";

grant truncate on table "public"."card_subcategories" to "anon";

grant update on table "public"."card_subcategories" to "anon";

grant delete on table "public"."card_subcategories" to "authenticated";

grant insert on table "public"."card_subcategories" to "authenticated";

grant references on table "public"."card_subcategories" to "authenticated";

grant select on table "public"."card_subcategories" to "authenticated";

grant trigger on table "public"."card_subcategories" to "authenticated";

grant truncate on table "public"."card_subcategories" to "authenticated";

grant update on table "public"."card_subcategories" to "authenticated";

grant delete on table "public"."card_subcategories" to "service_role";

grant insert on table "public"."card_subcategories" to "service_role";

grant references on table "public"."card_subcategories" to "service_role";

grant select on table "public"."card_subcategories" to "service_role";

grant trigger on table "public"."card_subcategories" to "service_role";

grant truncate on table "public"."card_subcategories" to "service_role";

grant update on table "public"."card_subcategories" to "service_role";

grant delete on table "public"."card_tag_assignments" to "anon";

grant insert on table "public"."card_tag_assignments" to "anon";

grant references on table "public"."card_tag_assignments" to "anon";

grant select on table "public"."card_tag_assignments" to "anon";

grant trigger on table "public"."card_tag_assignments" to "anon";

grant truncate on table "public"."card_tag_assignments" to "anon";

grant update on table "public"."card_tag_assignments" to "anon";

grant delete on table "public"."card_tag_assignments" to "authenticated";

grant insert on table "public"."card_tag_assignments" to "authenticated";

grant references on table "public"."card_tag_assignments" to "authenticated";

grant select on table "public"."card_tag_assignments" to "authenticated";

grant trigger on table "public"."card_tag_assignments" to "authenticated";

grant truncate on table "public"."card_tag_assignments" to "authenticated";

grant update on table "public"."card_tag_assignments" to "authenticated";

grant delete on table "public"."card_tag_assignments" to "service_role";

grant insert on table "public"."card_tag_assignments" to "service_role";

grant references on table "public"."card_tag_assignments" to "service_role";

grant select on table "public"."card_tag_assignments" to "service_role";

grant trigger on table "public"."card_tag_assignments" to "service_role";

grant truncate on table "public"."card_tag_assignments" to "service_role";

grant update on table "public"."card_tag_assignments" to "service_role";

grant delete on table "public"."card_tags" to "anon";

grant insert on table "public"."card_tags" to "anon";

grant references on table "public"."card_tags" to "anon";

grant select on table "public"."card_tags" to "anon";

grant trigger on table "public"."card_tags" to "anon";

grant truncate on table "public"."card_tags" to "anon";

grant update on table "public"."card_tags" to "anon";

grant delete on table "public"."card_tags" to "authenticated";

grant insert on table "public"."card_tags" to "authenticated";

grant references on table "public"."card_tags" to "authenticated";

grant select on table "public"."card_tags" to "authenticated";

grant trigger on table "public"."card_tags" to "authenticated";

grant truncate on table "public"."card_tags" to "authenticated";

grant update on table "public"."card_tags" to "authenticated";

grant delete on table "public"."card_tags" to "service_role";

grant insert on table "public"."card_tags" to "service_role";

grant references on table "public"."card_tags" to "service_role";

grant select on table "public"."card_tags" to "service_role";

grant trigger on table "public"."card_tags" to "service_role";

grant truncate on table "public"."card_tags" to "service_role";

grant update on table "public"."card_tags" to "service_role";

grant delete on table "public"."card_variants" to "anon";

grant insert on table "public"."card_variants" to "anon";

grant references on table "public"."card_variants" to "anon";

grant select on table "public"."card_variants" to "anon";

grant trigger on table "public"."card_variants" to "anon";

grant truncate on table "public"."card_variants" to "anon";

grant update on table "public"."card_variants" to "anon";

grant delete on table "public"."card_variants" to "authenticated";

grant insert on table "public"."card_variants" to "authenticated";

grant references on table "public"."card_variants" to "authenticated";

grant select on table "public"."card_variants" to "authenticated";

grant trigger on table "public"."card_variants" to "authenticated";

grant truncate on table "public"."card_variants" to "authenticated";

grant update on table "public"."card_variants" to "authenticated";

grant delete on table "public"."card_variants" to "service_role";

grant insert on table "public"."card_variants" to "service_role";

grant references on table "public"."card_variants" to "service_role";

grant select on table "public"."card_variants" to "service_role";

grant trigger on table "public"."card_variants" to "service_role";

grant truncate on table "public"."card_variants" to "service_role";

grant update on table "public"."card_variants" to "service_role";

grant delete on table "public"."cards" to "anon";

grant insert on table "public"."cards" to "anon";

grant references on table "public"."cards" to "anon";

grant select on table "public"."cards" to "anon";

grant trigger on table "public"."cards" to "anon";

grant truncate on table "public"."cards" to "anon";

grant update on table "public"."cards" to "anon";

grant delete on table "public"."cards" to "authenticated";

grant insert on table "public"."cards" to "authenticated";

grant references on table "public"."cards" to "authenticated";

grant select on table "public"."cards" to "authenticated";

grant trigger on table "public"."cards" to "authenticated";

grant truncate on table "public"."cards" to "authenticated";

grant update on table "public"."cards" to "authenticated";

grant delete on table "public"."cards" to "service_role";

grant insert on table "public"."cards" to "service_role";

grant references on table "public"."cards" to "service_role";

grant select on table "public"."cards" to "service_role";

grant trigger on table "public"."cards" to "service_role";

grant truncate on table "public"."cards" to "service_role";

grant update on table "public"."cards" to "service_role";

grant delete on table "public"."collection_imports" to "anon";

grant insert on table "public"."collection_imports" to "anon";

grant references on table "public"."collection_imports" to "anon";

grant select on table "public"."collection_imports" to "anon";

grant trigger on table "public"."collection_imports" to "anon";

grant truncate on table "public"."collection_imports" to "anon";

grant update on table "public"."collection_imports" to "anon";

grant delete on table "public"."collection_imports" to "authenticated";

grant insert on table "public"."collection_imports" to "authenticated";

grant references on table "public"."collection_imports" to "authenticated";

grant select on table "public"."collection_imports" to "authenticated";

grant trigger on table "public"."collection_imports" to "authenticated";

grant truncate on table "public"."collection_imports" to "authenticated";

grant update on table "public"."collection_imports" to "authenticated";

grant delete on table "public"."collection_imports" to "service_role";

grant insert on table "public"."collection_imports" to "service_role";

grant references on table "public"."collection_imports" to "service_role";

grant select on table "public"."collection_imports" to "service_role";

grant trigger on table "public"."collection_imports" to "service_role";

grant truncate on table "public"."collection_imports" to "service_role";

grant update on table "public"."collection_imports" to "service_role";

grant delete on table "public"."collector_titles" to "anon";

grant insert on table "public"."collector_titles" to "anon";

grant references on table "public"."collector_titles" to "anon";

grant select on table "public"."collector_titles" to "anon";

grant trigger on table "public"."collector_titles" to "anon";

grant truncate on table "public"."collector_titles" to "anon";

grant update on table "public"."collector_titles" to "anon";

grant delete on table "public"."collector_titles" to "authenticated";

grant insert on table "public"."collector_titles" to "authenticated";

grant references on table "public"."collector_titles" to "authenticated";

grant select on table "public"."collector_titles" to "authenticated";

grant trigger on table "public"."collector_titles" to "authenticated";

grant truncate on table "public"."collector_titles" to "authenticated";

grant update on table "public"."collector_titles" to "authenticated";

grant delete on table "public"."collector_titles" to "service_role";

grant insert on table "public"."collector_titles" to "service_role";

grant references on table "public"."collector_titles" to "service_role";

grant select on table "public"."collector_titles" to "service_role";

grant trigger on table "public"."collector_titles" to "service_role";

grant truncate on table "public"."collector_titles" to "service_role";

grant update on table "public"."collector_titles" to "service_role";

grant delete on table "public"."daily_booster_claims" to "anon";

grant insert on table "public"."daily_booster_claims" to "anon";

grant references on table "public"."daily_booster_claims" to "anon";

grant select on table "public"."daily_booster_claims" to "anon";

grant trigger on table "public"."daily_booster_claims" to "anon";

grant truncate on table "public"."daily_booster_claims" to "anon";

grant update on table "public"."daily_booster_claims" to "anon";

grant delete on table "public"."daily_booster_claims" to "authenticated";

grant insert on table "public"."daily_booster_claims" to "authenticated";

grant references on table "public"."daily_booster_claims" to "authenticated";

grant select on table "public"."daily_booster_claims" to "authenticated";

grant trigger on table "public"."daily_booster_claims" to "authenticated";

grant truncate on table "public"."daily_booster_claims" to "authenticated";

grant update on table "public"."daily_booster_claims" to "authenticated";

grant delete on table "public"."daily_booster_claims" to "service_role";

grant insert on table "public"."daily_booster_claims" to "service_role";

grant references on table "public"."daily_booster_claims" to "service_role";

grant select on table "public"."daily_booster_claims" to "service_role";

grant trigger on table "public"."daily_booster_claims" to "service_role";

grant truncate on table "public"."daily_booster_claims" to "service_role";

grant update on table "public"."daily_booster_claims" to "service_role";

grant delete on table "public"."event_achievements" to "anon";

grant insert on table "public"."event_achievements" to "anon";

grant references on table "public"."event_achievements" to "anon";

grant select on table "public"."event_achievements" to "anon";

grant trigger on table "public"."event_achievements" to "anon";

grant truncate on table "public"."event_achievements" to "anon";

grant update on table "public"."event_achievements" to "anon";

grant delete on table "public"."event_achievements" to "authenticated";

grant insert on table "public"."event_achievements" to "authenticated";

grant references on table "public"."event_achievements" to "authenticated";

grant select on table "public"."event_achievements" to "authenticated";

grant trigger on table "public"."event_achievements" to "authenticated";

grant truncate on table "public"."event_achievements" to "authenticated";

grant update on table "public"."event_achievements" to "authenticated";

grant delete on table "public"."event_achievements" to "service_role";

grant insert on table "public"."event_achievements" to "service_role";

grant references on table "public"."event_achievements" to "service_role";

grant select on table "public"."event_achievements" to "service_role";

grant trigger on table "public"."event_achievements" to "service_role";

grant truncate on table "public"."event_achievements" to "service_role";

grant update on table "public"."event_achievements" to "service_role";

grant delete on table "public"."notification_dismissals" to "anon";

grant insert on table "public"."notification_dismissals" to "anon";

grant references on table "public"."notification_dismissals" to "anon";

grant select on table "public"."notification_dismissals" to "anon";

grant trigger on table "public"."notification_dismissals" to "anon";

grant truncate on table "public"."notification_dismissals" to "anon";

grant update on table "public"."notification_dismissals" to "anon";

grant delete on table "public"."notification_dismissals" to "authenticated";

grant insert on table "public"."notification_dismissals" to "authenticated";

grant references on table "public"."notification_dismissals" to "authenticated";

grant select on table "public"."notification_dismissals" to "authenticated";

grant trigger on table "public"."notification_dismissals" to "authenticated";

grant truncate on table "public"."notification_dismissals" to "authenticated";

grant update on table "public"."notification_dismissals" to "authenticated";

grant delete on table "public"."notification_dismissals" to "service_role";

grant insert on table "public"."notification_dismissals" to "service_role";

grant references on table "public"."notification_dismissals" to "service_role";

grant select on table "public"."notification_dismissals" to "service_role";

grant trigger on table "public"."notification_dismissals" to "service_role";

grant truncate on table "public"."notification_dismissals" to "service_role";

grant update on table "public"."notification_dismissals" to "service_role";

grant delete on table "public"."notification_preferences" to "anon";

grant insert on table "public"."notification_preferences" to "anon";

grant references on table "public"."notification_preferences" to "anon";

grant select on table "public"."notification_preferences" to "anon";

grant trigger on table "public"."notification_preferences" to "anon";

grant truncate on table "public"."notification_preferences" to "anon";

grant update on table "public"."notification_preferences" to "anon";

grant delete on table "public"."notification_preferences" to "authenticated";

grant insert on table "public"."notification_preferences" to "authenticated";

grant references on table "public"."notification_preferences" to "authenticated";

grant select on table "public"."notification_preferences" to "authenticated";

grant trigger on table "public"."notification_preferences" to "authenticated";

grant truncate on table "public"."notification_preferences" to "authenticated";

grant update on table "public"."notification_preferences" to "authenticated";

grant delete on table "public"."notification_preferences" to "service_role";

grant insert on table "public"."notification_preferences" to "service_role";

grant references on table "public"."notification_preferences" to "service_role";

grant select on table "public"."notification_preferences" to "service_role";

grant trigger on table "public"."notification_preferences" to "service_role";

grant truncate on table "public"."notification_preferences" to "service_role";

grant update on table "public"."notification_preferences" to "service_role";

grant delete on table "public"."profile_moderation_state" to "anon";

grant insert on table "public"."profile_moderation_state" to "anon";

grant references on table "public"."profile_moderation_state" to "anon";

grant select on table "public"."profile_moderation_state" to "anon";

grant trigger on table "public"."profile_moderation_state" to "anon";

grant truncate on table "public"."profile_moderation_state" to "anon";

grant update on table "public"."profile_moderation_state" to "anon";

grant delete on table "public"."profile_moderation_state" to "authenticated";

grant insert on table "public"."profile_moderation_state" to "authenticated";

grant references on table "public"."profile_moderation_state" to "authenticated";

grant select on table "public"."profile_moderation_state" to "authenticated";

grant trigger on table "public"."profile_moderation_state" to "authenticated";

grant truncate on table "public"."profile_moderation_state" to "authenticated";

grant update on table "public"."profile_moderation_state" to "authenticated";

grant delete on table "public"."profile_moderation_state" to "service_role";

grant insert on table "public"."profile_moderation_state" to "service_role";

grant references on table "public"."profile_moderation_state" to "service_role";

grant select on table "public"."profile_moderation_state" to "service_role";

grant trigger on table "public"."profile_moderation_state" to "service_role";

grant truncate on table "public"."profile_moderation_state" to "service_role";

grant update on table "public"."profile_moderation_state" to "service_role";

grant delete on table "public"."profile_reports" to "anon";

grant insert on table "public"."profile_reports" to "anon";

grant references on table "public"."profile_reports" to "anon";

grant select on table "public"."profile_reports" to "anon";

grant trigger on table "public"."profile_reports" to "anon";

grant truncate on table "public"."profile_reports" to "anon";

grant update on table "public"."profile_reports" to "anon";

grant delete on table "public"."profile_reports" to "authenticated";

grant insert on table "public"."profile_reports" to "authenticated";

grant references on table "public"."profile_reports" to "authenticated";

grant select on table "public"."profile_reports" to "authenticated";

grant trigger on table "public"."profile_reports" to "authenticated";

grant truncate on table "public"."profile_reports" to "authenticated";

grant update on table "public"."profile_reports" to "authenticated";

grant delete on table "public"."profile_reports" to "service_role";

grant insert on table "public"."profile_reports" to "service_role";

grant references on table "public"."profile_reports" to "service_role";

grant select on table "public"."profile_reports" to "service_role";

grant trigger on table "public"."profile_reports" to "service_role";

grant truncate on table "public"."profile_reports" to "service_role";

grant update on table "public"."profile_reports" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."received_rewards" to "anon";

grant insert on table "public"."received_rewards" to "anon";

grant references on table "public"."received_rewards" to "anon";

grant select on table "public"."received_rewards" to "anon";

grant trigger on table "public"."received_rewards" to "anon";

grant truncate on table "public"."received_rewards" to "anon";

grant update on table "public"."received_rewards" to "anon";

grant delete on table "public"."received_rewards" to "authenticated";

grant insert on table "public"."received_rewards" to "authenticated";

grant references on table "public"."received_rewards" to "authenticated";

grant select on table "public"."received_rewards" to "authenticated";

grant trigger on table "public"."received_rewards" to "authenticated";

grant truncate on table "public"."received_rewards" to "authenticated";

grant update on table "public"."received_rewards" to "authenticated";

grant delete on table "public"."received_rewards" to "service_role";

grant insert on table "public"."received_rewards" to "service_role";

grant references on table "public"."received_rewards" to "service_role";

grant select on table "public"."received_rewards" to "service_role";

grant trigger on table "public"."received_rewards" to "service_role";

grant truncate on table "public"."received_rewards" to "service_role";

grant update on table "public"."received_rewards" to "service_role";

grant delete on table "public"."reserved_usernames" to "anon";

grant insert on table "public"."reserved_usernames" to "anon";

grant references on table "public"."reserved_usernames" to "anon";

grant select on table "public"."reserved_usernames" to "anon";

grant trigger on table "public"."reserved_usernames" to "anon";

grant truncate on table "public"."reserved_usernames" to "anon";

grant update on table "public"."reserved_usernames" to "anon";

grant delete on table "public"."reserved_usernames" to "authenticated";

grant insert on table "public"."reserved_usernames" to "authenticated";

grant references on table "public"."reserved_usernames" to "authenticated";

grant select on table "public"."reserved_usernames" to "authenticated";

grant trigger on table "public"."reserved_usernames" to "authenticated";

grant truncate on table "public"."reserved_usernames" to "authenticated";

grant update on table "public"."reserved_usernames" to "authenticated";

grant delete on table "public"."reserved_usernames" to "service_role";

grant insert on table "public"."reserved_usernames" to "service_role";

grant references on table "public"."reserved_usernames" to "service_role";

grant select on table "public"."reserved_usernames" to "service_role";

grant trigger on table "public"."reserved_usernames" to "service_role";

grant truncate on table "public"."reserved_usernames" to "service_role";

grant update on table "public"."reserved_usernames" to "service_role";

grant delete on table "public"."reward_code_redemptions" to "anon";

grant insert on table "public"."reward_code_redemptions" to "anon";

grant references on table "public"."reward_code_redemptions" to "anon";

grant select on table "public"."reward_code_redemptions" to "anon";

grant trigger on table "public"."reward_code_redemptions" to "anon";

grant truncate on table "public"."reward_code_redemptions" to "anon";

grant update on table "public"."reward_code_redemptions" to "anon";

grant delete on table "public"."reward_code_redemptions" to "authenticated";

grant insert on table "public"."reward_code_redemptions" to "authenticated";

grant references on table "public"."reward_code_redemptions" to "authenticated";

grant select on table "public"."reward_code_redemptions" to "authenticated";

grant trigger on table "public"."reward_code_redemptions" to "authenticated";

grant truncate on table "public"."reward_code_redemptions" to "authenticated";

grant update on table "public"."reward_code_redemptions" to "authenticated";

grant delete on table "public"."reward_code_redemptions" to "service_role";

grant insert on table "public"."reward_code_redemptions" to "service_role";

grant references on table "public"."reward_code_redemptions" to "service_role";

grant select on table "public"."reward_code_redemptions" to "service_role";

grant trigger on table "public"."reward_code_redemptions" to "service_role";

grant truncate on table "public"."reward_code_redemptions" to "service_role";

grant update on table "public"."reward_code_redemptions" to "service_role";

grant delete on table "public"."reward_code_rewards" to "anon";

grant insert on table "public"."reward_code_rewards" to "anon";

grant references on table "public"."reward_code_rewards" to "anon";

grant select on table "public"."reward_code_rewards" to "anon";

grant trigger on table "public"."reward_code_rewards" to "anon";

grant truncate on table "public"."reward_code_rewards" to "anon";

grant update on table "public"."reward_code_rewards" to "anon";

grant delete on table "public"."reward_code_rewards" to "authenticated";

grant insert on table "public"."reward_code_rewards" to "authenticated";

grant references on table "public"."reward_code_rewards" to "authenticated";

grant select on table "public"."reward_code_rewards" to "authenticated";

grant trigger on table "public"."reward_code_rewards" to "authenticated";

grant truncate on table "public"."reward_code_rewards" to "authenticated";

grant update on table "public"."reward_code_rewards" to "authenticated";

grant delete on table "public"."reward_code_rewards" to "service_role";

grant insert on table "public"."reward_code_rewards" to "service_role";

grant references on table "public"."reward_code_rewards" to "service_role";

grant select on table "public"."reward_code_rewards" to "service_role";

grant trigger on table "public"."reward_code_rewards" to "service_role";

grant truncate on table "public"."reward_code_rewards" to "service_role";

grant update on table "public"."reward_code_rewards" to "service_role";

grant delete on table "public"."reward_codes" to "anon";

grant insert on table "public"."reward_codes" to "anon";

grant references on table "public"."reward_codes" to "anon";

grant select on table "public"."reward_codes" to "anon";

grant trigger on table "public"."reward_codes" to "anon";

grant truncate on table "public"."reward_codes" to "anon";

grant update on table "public"."reward_codes" to "anon";

grant delete on table "public"."reward_codes" to "authenticated";

grant insert on table "public"."reward_codes" to "authenticated";

grant references on table "public"."reward_codes" to "authenticated";

grant select on table "public"."reward_codes" to "authenticated";

grant trigger on table "public"."reward_codes" to "authenticated";

grant truncate on table "public"."reward_codes" to "authenticated";

grant update on table "public"."reward_codes" to "authenticated";

grant delete on table "public"."reward_codes" to "service_role";

grant insert on table "public"."reward_codes" to "service_role";

grant references on table "public"."reward_codes" to "service_role";

grant select on table "public"."reward_codes" to "service_role";

grant trigger on table "public"."reward_codes" to "service_role";

grant truncate on table "public"."reward_codes" to "service_role";

grant update on table "public"."reward_codes" to "service_role";

grant delete on table "public"."site_asset_manifest" to "anon";

grant insert on table "public"."site_asset_manifest" to "anon";

grant references on table "public"."site_asset_manifest" to "anon";

grant select on table "public"."site_asset_manifest" to "anon";

grant trigger on table "public"."site_asset_manifest" to "anon";

grant truncate on table "public"."site_asset_manifest" to "anon";

grant update on table "public"."site_asset_manifest" to "anon";

grant delete on table "public"."site_asset_manifest" to "authenticated";

grant insert on table "public"."site_asset_manifest" to "authenticated";

grant references on table "public"."site_asset_manifest" to "authenticated";

grant select on table "public"."site_asset_manifest" to "authenticated";

grant trigger on table "public"."site_asset_manifest" to "authenticated";

grant truncate on table "public"."site_asset_manifest" to "authenticated";

grant update on table "public"."site_asset_manifest" to "authenticated";

grant delete on table "public"."site_asset_manifest" to "service_role";

grant insert on table "public"."site_asset_manifest" to "service_role";

grant references on table "public"."site_asset_manifest" to "service_role";

grant select on table "public"."site_asset_manifest" to "service_role";

grant trigger on table "public"."site_asset_manifest" to "service_role";

grant truncate on table "public"."site_asset_manifest" to "service_role";

grant update on table "public"."site_asset_manifest" to "service_role";

grant delete on table "public"."site_roles" to "anon";

grant insert on table "public"."site_roles" to "anon";

grant references on table "public"."site_roles" to "anon";

grant select on table "public"."site_roles" to "anon";

grant trigger on table "public"."site_roles" to "anon";

grant truncate on table "public"."site_roles" to "anon";

grant update on table "public"."site_roles" to "anon";

grant delete on table "public"."site_roles" to "authenticated";

grant insert on table "public"."site_roles" to "authenticated";

grant references on table "public"."site_roles" to "authenticated";

grant select on table "public"."site_roles" to "authenticated";

grant trigger on table "public"."site_roles" to "authenticated";

grant truncate on table "public"."site_roles" to "authenticated";

grant update on table "public"."site_roles" to "authenticated";

grant delete on table "public"."site_roles" to "service_role";

grant insert on table "public"."site_roles" to "service_role";

grant references on table "public"."site_roles" to "service_role";

grant select on table "public"."site_roles" to "service_role";

grant trigger on table "public"."site_roles" to "service_role";

grant truncate on table "public"."site_roles" to "service_role";

grant update on table "public"."site_roles" to "service_role";

grant delete on table "public"."site_settings" to "anon";

grant insert on table "public"."site_settings" to "anon";

grant references on table "public"."site_settings" to "anon";

grant select on table "public"."site_settings" to "anon";

grant trigger on table "public"."site_settings" to "anon";

grant truncate on table "public"."site_settings" to "anon";

grant update on table "public"."site_settings" to "anon";

grant delete on table "public"."site_settings" to "authenticated";

grant insert on table "public"."site_settings" to "authenticated";

grant references on table "public"."site_settings" to "authenticated";

grant select on table "public"."site_settings" to "authenticated";

grant trigger on table "public"."site_settings" to "authenticated";

grant truncate on table "public"."site_settings" to "authenticated";

grant update on table "public"."site_settings" to "authenticated";

grant delete on table "public"."site_settings" to "service_role";

grant insert on table "public"."site_settings" to "service_role";

grant references on table "public"."site_settings" to "service_role";

grant select on table "public"."site_settings" to "service_role";

grant trigger on table "public"."site_settings" to "service_role";

grant truncate on table "public"."site_settings" to "service_role";

grant update on table "public"."site_settings" to "service_role";

grant delete on table "public"."staff_audit_log" to "anon";

grant insert on table "public"."staff_audit_log" to "anon";

grant references on table "public"."staff_audit_log" to "anon";

grant select on table "public"."staff_audit_log" to "anon";

grant trigger on table "public"."staff_audit_log" to "anon";

grant truncate on table "public"."staff_audit_log" to "anon";

grant update on table "public"."staff_audit_log" to "anon";

grant delete on table "public"."staff_audit_log" to "authenticated";

grant insert on table "public"."staff_audit_log" to "authenticated";

grant references on table "public"."staff_audit_log" to "authenticated";

grant select on table "public"."staff_audit_log" to "authenticated";

grant trigger on table "public"."staff_audit_log" to "authenticated";

grant truncate on table "public"."staff_audit_log" to "authenticated";

grant update on table "public"."staff_audit_log" to "authenticated";

grant delete on table "public"."staff_audit_log" to "service_role";

grant insert on table "public"."staff_audit_log" to "service_role";

grant references on table "public"."staff_audit_log" to "service_role";

grant select on table "public"."staff_audit_log" to "service_role";

grant trigger on table "public"."staff_audit_log" to "service_role";

grant truncate on table "public"."staff_audit_log" to "service_role";

grant update on table "public"."staff_audit_log" to "service_role";

grant delete on table "public"."star_bits_booster_purchases" to "anon";

grant insert on table "public"."star_bits_booster_purchases" to "anon";

grant references on table "public"."star_bits_booster_purchases" to "anon";

grant select on table "public"."star_bits_booster_purchases" to "anon";

grant trigger on table "public"."star_bits_booster_purchases" to "anon";

grant truncate on table "public"."star_bits_booster_purchases" to "anon";

grant update on table "public"."star_bits_booster_purchases" to "anon";

grant delete on table "public"."star_bits_booster_purchases" to "authenticated";

grant insert on table "public"."star_bits_booster_purchases" to "authenticated";

grant references on table "public"."star_bits_booster_purchases" to "authenticated";

grant select on table "public"."star_bits_booster_purchases" to "authenticated";

grant trigger on table "public"."star_bits_booster_purchases" to "authenticated";

grant truncate on table "public"."star_bits_booster_purchases" to "authenticated";

grant update on table "public"."star_bits_booster_purchases" to "authenticated";

grant delete on table "public"."star_bits_booster_purchases" to "service_role";

grant insert on table "public"."star_bits_booster_purchases" to "service_role";

grant references on table "public"."star_bits_booster_purchases" to "service_role";

grant select on table "public"."star_bits_booster_purchases" to "service_role";

grant trigger on table "public"."star_bits_booster_purchases" to "service_role";

grant truncate on table "public"."star_bits_booster_purchases" to "service_role";

grant update on table "public"."star_bits_booster_purchases" to "service_role";

grant delete on table "public"."star_bits_transactions" to "anon";

grant insert on table "public"."star_bits_transactions" to "anon";

grant references on table "public"."star_bits_transactions" to "anon";

grant select on table "public"."star_bits_transactions" to "anon";

grant trigger on table "public"."star_bits_transactions" to "anon";

grant truncate on table "public"."star_bits_transactions" to "anon";

grant update on table "public"."star_bits_transactions" to "anon";

grant delete on table "public"."star_bits_transactions" to "authenticated";

grant insert on table "public"."star_bits_transactions" to "authenticated";

grant references on table "public"."star_bits_transactions" to "authenticated";

grant select on table "public"."star_bits_transactions" to "authenticated";

grant trigger on table "public"."star_bits_transactions" to "authenticated";

grant truncate on table "public"."star_bits_transactions" to "authenticated";

grant update on table "public"."star_bits_transactions" to "authenticated";

grant delete on table "public"."star_bits_transactions" to "service_role";

grant insert on table "public"."star_bits_transactions" to "service_role";

grant references on table "public"."star_bits_transactions" to "service_role";

grant select on table "public"."star_bits_transactions" to "service_role";

grant trigger on table "public"."star_bits_transactions" to "service_role";

grant truncate on table "public"."star_bits_transactions" to "service_role";

grant update on table "public"."star_bits_transactions" to "service_role";

grant delete on table "public"."star_bits_values" to "anon";

grant insert on table "public"."star_bits_values" to "anon";

grant references on table "public"."star_bits_values" to "anon";

grant select on table "public"."star_bits_values" to "anon";

grant trigger on table "public"."star_bits_values" to "anon";

grant truncate on table "public"."star_bits_values" to "anon";

grant update on table "public"."star_bits_values" to "anon";

grant delete on table "public"."star_bits_values" to "authenticated";

grant insert on table "public"."star_bits_values" to "authenticated";

grant references on table "public"."star_bits_values" to "authenticated";

grant select on table "public"."star_bits_values" to "authenticated";

grant trigger on table "public"."star_bits_values" to "authenticated";

grant truncate on table "public"."star_bits_values" to "authenticated";

grant update on table "public"."star_bits_values" to "authenticated";

grant delete on table "public"."star_bits_values" to "service_role";

grant insert on table "public"."star_bits_values" to "service_role";

grant references on table "public"."star_bits_values" to "service_role";

grant select on table "public"."star_bits_values" to "service_role";

grant trigger on table "public"."star_bits_values" to "service_role";

grant truncate on table "public"."star_bits_values" to "service_role";

grant update on table "public"."star_bits_values" to "service_role";

grant delete on table "public"."starlight_events" to "anon";

grant insert on table "public"."starlight_events" to "anon";

grant references on table "public"."starlight_events" to "anon";

grant select on table "public"."starlight_events" to "anon";

grant trigger on table "public"."starlight_events" to "anon";

grant truncate on table "public"."starlight_events" to "anon";

grant update on table "public"."starlight_events" to "anon";

grant delete on table "public"."starlight_events" to "authenticated";

grant insert on table "public"."starlight_events" to "authenticated";

grant references on table "public"."starlight_events" to "authenticated";

grant select on table "public"."starlight_events" to "authenticated";

grant trigger on table "public"."starlight_events" to "authenticated";

grant truncate on table "public"."starlight_events" to "authenticated";

grant update on table "public"."starlight_events" to "authenticated";

grant delete on table "public"."starlight_events" to "service_role";

grant insert on table "public"."starlight_events" to "service_role";

grant references on table "public"."starlight_events" to "service_role";

grant select on table "public"."starlight_events" to "service_role";

grant trigger on table "public"."starlight_events" to "service_role";

grant truncate on table "public"."starlight_events" to "service_role";

grant update on table "public"."starlight_events" to "service_role";

grant delete on table "public"."starlight_news_posts" to "anon";

grant insert on table "public"."starlight_news_posts" to "anon";

grant references on table "public"."starlight_news_posts" to "anon";

grant select on table "public"."starlight_news_posts" to "anon";

grant trigger on table "public"."starlight_news_posts" to "anon";

grant truncate on table "public"."starlight_news_posts" to "anon";

grant update on table "public"."starlight_news_posts" to "anon";

grant delete on table "public"."starlight_news_posts" to "authenticated";

grant insert on table "public"."starlight_news_posts" to "authenticated";

grant references on table "public"."starlight_news_posts" to "authenticated";

grant select on table "public"."starlight_news_posts" to "authenticated";

grant trigger on table "public"."starlight_news_posts" to "authenticated";

grant truncate on table "public"."starlight_news_posts" to "authenticated";

grant update on table "public"."starlight_news_posts" to "authenticated";

grant delete on table "public"."starlight_news_posts" to "service_role";

grant insert on table "public"."starlight_news_posts" to "service_role";

grant references on table "public"."starlight_news_posts" to "service_role";

grant select on table "public"."starlight_news_posts" to "service_role";

grant trigger on table "public"."starlight_news_posts" to "service_role";

grant truncate on table "public"."starlight_news_posts" to "service_role";

grant update on table "public"."starlight_news_posts" to "service_role";

grant delete on table "public"."trade_offer_items" to "anon";

grant insert on table "public"."trade_offer_items" to "anon";

grant references on table "public"."trade_offer_items" to "anon";

grant select on table "public"."trade_offer_items" to "anon";

grant trigger on table "public"."trade_offer_items" to "anon";

grant truncate on table "public"."trade_offer_items" to "anon";

grant update on table "public"."trade_offer_items" to "anon";

grant delete on table "public"."trade_offer_items" to "authenticated";

grant insert on table "public"."trade_offer_items" to "authenticated";

grant references on table "public"."trade_offer_items" to "authenticated";

grant select on table "public"."trade_offer_items" to "authenticated";

grant trigger on table "public"."trade_offer_items" to "authenticated";

grant truncate on table "public"."trade_offer_items" to "authenticated";

grant update on table "public"."trade_offer_items" to "authenticated";

grant delete on table "public"."trade_offer_items" to "service_role";

grant insert on table "public"."trade_offer_items" to "service_role";

grant references on table "public"."trade_offer_items" to "service_role";

grant select on table "public"."trade_offer_items" to "service_role";

grant trigger on table "public"."trade_offer_items" to "service_role";

grant truncate on table "public"."trade_offer_items" to "service_role";

grant update on table "public"."trade_offer_items" to "service_role";

grant delete on table "public"."trade_offers" to "anon";

grant insert on table "public"."trade_offers" to "anon";

grant references on table "public"."trade_offers" to "anon";

grant select on table "public"."trade_offers" to "anon";

grant trigger on table "public"."trade_offers" to "anon";

grant truncate on table "public"."trade_offers" to "anon";

grant update on table "public"."trade_offers" to "anon";

grant delete on table "public"."trade_offers" to "authenticated";

grant insert on table "public"."trade_offers" to "authenticated";

grant references on table "public"."trade_offers" to "authenticated";

grant select on table "public"."trade_offers" to "authenticated";

grant trigger on table "public"."trade_offers" to "authenticated";

grant truncate on table "public"."trade_offers" to "authenticated";

grant update on table "public"."trade_offers" to "authenticated";

grant delete on table "public"."trade_offers" to "service_role";

grant insert on table "public"."trade_offers" to "service_role";

grant references on table "public"."trade_offers" to "service_role";

grant select on table "public"."trade_offers" to "service_role";

grant trigger on table "public"."trade_offers" to "service_role";

grant truncate on table "public"."trade_offers" to "service_role";

grant update on table "public"."trade_offers" to "service_role";

grant delete on table "public"."twitch_broadcaster_tokens" to "anon";

grant insert on table "public"."twitch_broadcaster_tokens" to "anon";

grant references on table "public"."twitch_broadcaster_tokens" to "anon";

grant select on table "public"."twitch_broadcaster_tokens" to "anon";

grant trigger on table "public"."twitch_broadcaster_tokens" to "anon";

grant truncate on table "public"."twitch_broadcaster_tokens" to "anon";

grant update on table "public"."twitch_broadcaster_tokens" to "anon";

grant delete on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant insert on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant references on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant select on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant trigger on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant truncate on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant update on table "public"."twitch_broadcaster_tokens" to "authenticated";

grant delete on table "public"."twitch_broadcaster_tokens" to "service_role";

grant insert on table "public"."twitch_broadcaster_tokens" to "service_role";

grant references on table "public"."twitch_broadcaster_tokens" to "service_role";

grant select on table "public"."twitch_broadcaster_tokens" to "service_role";

grant trigger on table "public"."twitch_broadcaster_tokens" to "service_role";

grant truncate on table "public"."twitch_broadcaster_tokens" to "service_role";

grant update on table "public"."twitch_broadcaster_tokens" to "service_role";

grant delete on table "public"."twitch_connections" to "anon";

grant insert on table "public"."twitch_connections" to "anon";

grant references on table "public"."twitch_connections" to "anon";

grant select on table "public"."twitch_connections" to "anon";

grant trigger on table "public"."twitch_connections" to "anon";

grant truncate on table "public"."twitch_connections" to "anon";

grant update on table "public"."twitch_connections" to "anon";

grant delete on table "public"."twitch_connections" to "authenticated";

grant insert on table "public"."twitch_connections" to "authenticated";

grant references on table "public"."twitch_connections" to "authenticated";

grant select on table "public"."twitch_connections" to "authenticated";

grant trigger on table "public"."twitch_connections" to "authenticated";

grant truncate on table "public"."twitch_connections" to "authenticated";

grant update on table "public"."twitch_connections" to "authenticated";

grant delete on table "public"."twitch_connections" to "service_role";

grant insert on table "public"."twitch_connections" to "service_role";

grant references on table "public"."twitch_connections" to "service_role";

grant select on table "public"."twitch_connections" to "service_role";

grant trigger on table "public"."twitch_connections" to "service_role";

grant truncate on table "public"."twitch_connections" to "service_role";

grant update on table "public"."twitch_connections" to "service_role";

grant delete on table "public"."twitch_integration_config" to "anon";

grant insert on table "public"."twitch_integration_config" to "anon";

grant references on table "public"."twitch_integration_config" to "anon";

grant select on table "public"."twitch_integration_config" to "anon";

grant trigger on table "public"."twitch_integration_config" to "anon";

grant truncate on table "public"."twitch_integration_config" to "anon";

grant update on table "public"."twitch_integration_config" to "anon";

grant delete on table "public"."twitch_integration_config" to "authenticated";

grant insert on table "public"."twitch_integration_config" to "authenticated";

grant references on table "public"."twitch_integration_config" to "authenticated";

grant select on table "public"."twitch_integration_config" to "authenticated";

grant trigger on table "public"."twitch_integration_config" to "authenticated";

grant truncate on table "public"."twitch_integration_config" to "authenticated";

grant update on table "public"."twitch_integration_config" to "authenticated";

grant delete on table "public"."twitch_integration_config" to "service_role";

grant insert on table "public"."twitch_integration_config" to "service_role";

grant references on table "public"."twitch_integration_config" to "service_role";

grant select on table "public"."twitch_integration_config" to "service_role";

grant trigger on table "public"."twitch_integration_config" to "service_role";

grant truncate on table "public"."twitch_integration_config" to "service_role";

grant update on table "public"."twitch_integration_config" to "service_role";

grant delete on table "public"."twitch_oauth_states" to "anon";

grant insert on table "public"."twitch_oauth_states" to "anon";

grant references on table "public"."twitch_oauth_states" to "anon";

grant select on table "public"."twitch_oauth_states" to "anon";

grant trigger on table "public"."twitch_oauth_states" to "anon";

grant truncate on table "public"."twitch_oauth_states" to "anon";

grant update on table "public"."twitch_oauth_states" to "anon";

grant delete on table "public"."twitch_oauth_states" to "authenticated";

grant insert on table "public"."twitch_oauth_states" to "authenticated";

grant references on table "public"."twitch_oauth_states" to "authenticated";

grant select on table "public"."twitch_oauth_states" to "authenticated";

grant trigger on table "public"."twitch_oauth_states" to "authenticated";

grant truncate on table "public"."twitch_oauth_states" to "authenticated";

grant update on table "public"."twitch_oauth_states" to "authenticated";

grant delete on table "public"."twitch_oauth_states" to "service_role";

grant insert on table "public"."twitch_oauth_states" to "service_role";

grant references on table "public"."twitch_oauth_states" to "service_role";

grant select on table "public"."twitch_oauth_states" to "service_role";

grant trigger on table "public"."twitch_oauth_states" to "service_role";

grant truncate on table "public"."twitch_oauth_states" to "service_role";

grant update on table "public"."twitch_oauth_states" to "service_role";

grant delete on table "public"."twitch_reward_events" to "anon";

grant insert on table "public"."twitch_reward_events" to "anon";

grant references on table "public"."twitch_reward_events" to "anon";

grant select on table "public"."twitch_reward_events" to "anon";

grant trigger on table "public"."twitch_reward_events" to "anon";

grant truncate on table "public"."twitch_reward_events" to "anon";

grant update on table "public"."twitch_reward_events" to "anon";

grant delete on table "public"."twitch_reward_events" to "authenticated";

grant insert on table "public"."twitch_reward_events" to "authenticated";

grant references on table "public"."twitch_reward_events" to "authenticated";

grant select on table "public"."twitch_reward_events" to "authenticated";

grant trigger on table "public"."twitch_reward_events" to "authenticated";

grant truncate on table "public"."twitch_reward_events" to "authenticated";

grant update on table "public"."twitch_reward_events" to "authenticated";

grant delete on table "public"."twitch_reward_events" to "service_role";

grant insert on table "public"."twitch_reward_events" to "service_role";

grant references on table "public"."twitch_reward_events" to "service_role";

grant select on table "public"."twitch_reward_events" to "service_role";

grant trigger on table "public"."twitch_reward_events" to "service_role";

grant truncate on table "public"."twitch_reward_events" to "service_role";

grant update on table "public"."twitch_reward_events" to "service_role";

grant delete on table "public"."twitch_reward_grants" to "anon";

grant insert on table "public"."twitch_reward_grants" to "anon";

grant references on table "public"."twitch_reward_grants" to "anon";

grant select on table "public"."twitch_reward_grants" to "anon";

grant trigger on table "public"."twitch_reward_grants" to "anon";

grant truncate on table "public"."twitch_reward_grants" to "anon";

grant update on table "public"."twitch_reward_grants" to "anon";

grant delete on table "public"."twitch_reward_grants" to "authenticated";

grant insert on table "public"."twitch_reward_grants" to "authenticated";

grant references on table "public"."twitch_reward_grants" to "authenticated";

grant select on table "public"."twitch_reward_grants" to "authenticated";

grant trigger on table "public"."twitch_reward_grants" to "authenticated";

grant truncate on table "public"."twitch_reward_grants" to "authenticated";

grant update on table "public"."twitch_reward_grants" to "authenticated";

grant delete on table "public"."twitch_reward_grants" to "service_role";

grant insert on table "public"."twitch_reward_grants" to "service_role";

grant references on table "public"."twitch_reward_grants" to "service_role";

grant select on table "public"."twitch_reward_grants" to "service_role";

grant trigger on table "public"."twitch_reward_grants" to "service_role";

grant truncate on table "public"."twitch_reward_grants" to "service_role";

grant update on table "public"."twitch_reward_grants" to "service_role";

grant delete on table "public"."twitch_reward_rules" to "anon";

grant insert on table "public"."twitch_reward_rules" to "anon";

grant references on table "public"."twitch_reward_rules" to "anon";

grant select on table "public"."twitch_reward_rules" to "anon";

grant trigger on table "public"."twitch_reward_rules" to "anon";

grant truncate on table "public"."twitch_reward_rules" to "anon";

grant update on table "public"."twitch_reward_rules" to "anon";

grant delete on table "public"."twitch_reward_rules" to "authenticated";

grant insert on table "public"."twitch_reward_rules" to "authenticated";

grant references on table "public"."twitch_reward_rules" to "authenticated";

grant select on table "public"."twitch_reward_rules" to "authenticated";

grant trigger on table "public"."twitch_reward_rules" to "authenticated";

grant truncate on table "public"."twitch_reward_rules" to "authenticated";

grant update on table "public"."twitch_reward_rules" to "authenticated";

grant delete on table "public"."twitch_reward_rules" to "service_role";

grant insert on table "public"."twitch_reward_rules" to "service_role";

grant references on table "public"."twitch_reward_rules" to "service_role";

grant select on table "public"."twitch_reward_rules" to "service_role";

grant trigger on table "public"."twitch_reward_rules" to "service_role";

grant truncate on table "public"."twitch_reward_rules" to "service_role";

grant update on table "public"."twitch_reward_rules" to "service_role";

grant delete on table "public"."user_achievements" to "anon";

grant insert on table "public"."user_achievements" to "anon";

grant references on table "public"."user_achievements" to "anon";

grant select on table "public"."user_achievements" to "anon";

grant trigger on table "public"."user_achievements" to "anon";

grant truncate on table "public"."user_achievements" to "anon";

grant update on table "public"."user_achievements" to "anon";

grant delete on table "public"."user_achievements" to "authenticated";

grant insert on table "public"."user_achievements" to "authenticated";

grant references on table "public"."user_achievements" to "authenticated";

grant select on table "public"."user_achievements" to "authenticated";

grant trigger on table "public"."user_achievements" to "authenticated";

grant truncate on table "public"."user_achievements" to "authenticated";

grant update on table "public"."user_achievements" to "authenticated";

grant delete on table "public"."user_achievements" to "service_role";

grant insert on table "public"."user_achievements" to "service_role";

grant references on table "public"."user_achievements" to "service_role";

grant select on table "public"."user_achievements" to "service_role";

grant trigger on table "public"."user_achievements" to "service_role";

grant truncate on table "public"."user_achievements" to "service_role";

grant update on table "public"."user_achievements" to "service_role";

grant delete on table "public"."user_card_preferences" to "anon";

grant insert on table "public"."user_card_preferences" to "anon";

grant references on table "public"."user_card_preferences" to "anon";

grant select on table "public"."user_card_preferences" to "anon";

grant trigger on table "public"."user_card_preferences" to "anon";

grant truncate on table "public"."user_card_preferences" to "anon";

grant update on table "public"."user_card_preferences" to "anon";

grant delete on table "public"."user_card_preferences" to "authenticated";

grant insert on table "public"."user_card_preferences" to "authenticated";

grant references on table "public"."user_card_preferences" to "authenticated";

grant select on table "public"."user_card_preferences" to "authenticated";

grant trigger on table "public"."user_card_preferences" to "authenticated";

grant truncate on table "public"."user_card_preferences" to "authenticated";

grant update on table "public"."user_card_preferences" to "authenticated";

grant delete on table "public"."user_card_preferences" to "service_role";

grant insert on table "public"."user_card_preferences" to "service_role";

grant references on table "public"."user_card_preferences" to "service_role";

grant select on table "public"."user_card_preferences" to "service_role";

grant trigger on table "public"."user_card_preferences" to "service_role";

grant truncate on table "public"."user_card_preferences" to "service_role";

grant update on table "public"."user_card_preferences" to "service_role";

grant delete on table "public"."user_cards" to "anon";

grant insert on table "public"."user_cards" to "anon";

grant references on table "public"."user_cards" to "anon";

grant select on table "public"."user_cards" to "anon";

grant trigger on table "public"."user_cards" to "anon";

grant truncate on table "public"."user_cards" to "anon";

grant update on table "public"."user_cards" to "anon";

grant delete on table "public"."user_cards" to "authenticated";

grant insert on table "public"."user_cards" to "authenticated";

grant references on table "public"."user_cards" to "authenticated";

grant select on table "public"."user_cards" to "authenticated";

grant trigger on table "public"."user_cards" to "authenticated";

grant truncate on table "public"."user_cards" to "authenticated";

grant update on table "public"."user_cards" to "authenticated";

grant delete on table "public"."user_cards" to "service_role";

grant insert on table "public"."user_cards" to "service_role";

grant references on table "public"."user_cards" to "service_role";

grant select on table "public"."user_cards" to "service_role";

grant trigger on table "public"."user_cards" to "service_role";

grant truncate on table "public"."user_cards" to "service_role";

grant update on table "public"."user_cards" to "service_role";

grant delete on table "public"."user_notifications" to "anon";

grant insert on table "public"."user_notifications" to "anon";

grant references on table "public"."user_notifications" to "anon";

grant select on table "public"."user_notifications" to "anon";

grant trigger on table "public"."user_notifications" to "anon";

grant truncate on table "public"."user_notifications" to "anon";

grant update on table "public"."user_notifications" to "anon";

grant delete on table "public"."user_notifications" to "authenticated";

grant insert on table "public"."user_notifications" to "authenticated";

grant references on table "public"."user_notifications" to "authenticated";

grant select on table "public"."user_notifications" to "authenticated";

grant trigger on table "public"."user_notifications" to "authenticated";

grant truncate on table "public"."user_notifications" to "authenticated";

grant update on table "public"."user_notifications" to "authenticated";

grant delete on table "public"."user_notifications" to "service_role";

grant insert on table "public"."user_notifications" to "service_role";

grant references on table "public"."user_notifications" to "service_role";

grant select on table "public"."user_notifications" to "service_role";

grant trigger on table "public"."user_notifications" to "service_role";

grant truncate on table "public"."user_notifications" to "service_role";

grant update on table "public"."user_notifications" to "service_role";

grant delete on table "public"."user_titles" to "anon";

grant insert on table "public"."user_titles" to "anon";

grant references on table "public"."user_titles" to "anon";

grant select on table "public"."user_titles" to "anon";

grant trigger on table "public"."user_titles" to "anon";

grant truncate on table "public"."user_titles" to "anon";

grant update on table "public"."user_titles" to "anon";

grant delete on table "public"."user_titles" to "authenticated";

grant insert on table "public"."user_titles" to "authenticated";

grant references on table "public"."user_titles" to "authenticated";

grant select on table "public"."user_titles" to "authenticated";

grant trigger on table "public"."user_titles" to "authenticated";

grant truncate on table "public"."user_titles" to "authenticated";

grant update on table "public"."user_titles" to "authenticated";

grant delete on table "public"."user_titles" to "service_role";

grant insert on table "public"."user_titles" to "service_role";

grant references on table "public"."user_titles" to "service_role";

grant select on table "public"."user_titles" to "service_role";

grant trigger on table "public"."user_titles" to "service_role";

grant truncate on table "public"."user_titles" to "service_role";

grant update on table "public"."user_titles" to "service_role";

grant delete on table "public"."user_trade_settings" to "anon";

grant insert on table "public"."user_trade_settings" to "anon";

grant references on table "public"."user_trade_settings" to "anon";

grant select on table "public"."user_trade_settings" to "anon";

grant trigger on table "public"."user_trade_settings" to "anon";

grant truncate on table "public"."user_trade_settings" to "anon";

grant update on table "public"."user_trade_settings" to "anon";

grant delete on table "public"."user_trade_settings" to "authenticated";

grant insert on table "public"."user_trade_settings" to "authenticated";

grant references on table "public"."user_trade_settings" to "authenticated";

grant select on table "public"."user_trade_settings" to "authenticated";

grant trigger on table "public"."user_trade_settings" to "authenticated";

grant truncate on table "public"."user_trade_settings" to "authenticated";

grant update on table "public"."user_trade_settings" to "authenticated";

grant delete on table "public"."user_trade_settings" to "service_role";

grant insert on table "public"."user_trade_settings" to "service_role";

grant references on table "public"."user_trade_settings" to "service_role";

grant select on table "public"."user_trade_settings" to "service_role";

grant trigger on table "public"."user_trade_settings" to "service_role";

grant truncate on table "public"."user_trade_settings" to "service_role";

grant update on table "public"."user_trade_settings" to "service_role";

grant delete on table "public"."user_wallets" to "anon";

grant insert on table "public"."user_wallets" to "anon";

grant references on table "public"."user_wallets" to "anon";

grant select on table "public"."user_wallets" to "anon";

grant trigger on table "public"."user_wallets" to "anon";

grant truncate on table "public"."user_wallets" to "anon";

grant update on table "public"."user_wallets" to "anon";

grant delete on table "public"."user_wallets" to "authenticated";

grant insert on table "public"."user_wallets" to "authenticated";

grant references on table "public"."user_wallets" to "authenticated";

grant select on table "public"."user_wallets" to "authenticated";

grant trigger on table "public"."user_wallets" to "authenticated";

grant truncate on table "public"."user_wallets" to "authenticated";

grant update on table "public"."user_wallets" to "authenticated";

grant delete on table "public"."user_wallets" to "service_role";

grant insert on table "public"."user_wallets" to "service_role";

grant references on table "public"."user_wallets" to "service_role";

grant select on table "public"."user_wallets" to "service_role";

grant trigger on table "public"."user_wallets" to "service_role";

grant truncate on table "public"."user_wallets" to "service_role";

grant update on table "public"."user_wallets" to "service_role";


  create policy "Achievement definitions are publicly readable"
  on "public"."achievement_definitions"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Active booster reward cards are public"
  on "public"."booster_reward_cards"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM public.booster_types b
  WHERE ((b.id = booster_reward_cards.booster_id) AND (b.is_active = true) AND (b.archived = false)))));



  create policy "Active booster rates are public"
  on "public"."booster_slot_rates"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM (public.booster_slots s
     JOIN public.booster_types b ON ((b.id = s.booster_id)))
  WHERE ((s.id = booster_slot_rates.slot_id) AND (b.is_active = true)))));



  create policy "Active booster slots are public"
  on "public"."booster_slots"
  as permissive
  for select
  to anon, authenticated
using ((EXISTS ( SELECT 1
   FROM public.booster_types b
  WHERE ((b.id = booster_slots.booster_id) AND (b.is_active = true)))));



  create policy "Active booster types are public"
  on "public"."booster_types"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Visible card series are public"
  on "public"."card_series"
  as permissive
  for select
  to anon, authenticated
using ((is_visible = true));



  create policy "Visible cards are public"
  on "public"."cards"
  as permissive
  for select
  to anon, authenticated
using ((is_visible = true));



  create policy "Users can view their own imports"
  on "public"."collection_imports"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Collector titles are publicly readable"
  on "public"."collector_titles"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Users can view their own daily claims"
  on "public"."daily_booster_claims"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Public can view active event achievements"
  on "public"."event_achievements"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.starlight_events e
  WHERE ((e.id = event_achievements.event_id) AND (e.is_hidden = false))))));



  create policy "Users can view their notification dismissals"
  on "public"."notification_dismissals"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update their notification preferences"
  on "public"."notification_preferences"
  as permissive
  for all
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their notification preferences"
  on "public"."notification_preferences"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Public and unlisted profiles can be viewed"
  on "public"."profiles"
  as permissive
  for select
  to anon, authenticated
using (((onboarding_complete = true) AND (profile_visibility = ANY (ARRAY['public'::text, 'unlisted'::text]))));



  create policy "Users can read their own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Collectors can view own received rewards"
  on "public"."received_rewards"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Reserved usernames are publicly readable"
  on "public"."reserved_usernames"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Users can view their own code redemptions"
  on "public"."reward_code_redemptions"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Administrators can read site asset manifest"
  on "public"."site_asset_manifest"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.site_roles sr
  WHERE ((sr.user_id = auth.uid()) AND (sr.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "Users can view their own Star Bits booster purchases"
  on "public"."star_bits_booster_purchases"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own Star Bits history"
  on "public"."star_bits_transactions"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Star Bits values are publicly readable"
  on "public"."star_bits_values"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Public can view visible events"
  on "public"."starlight_events"
  as permissive
  for select
  to anon, authenticated
using ((is_hidden = false));



  create policy "Public can read published Starlight news"
  on "public"."starlight_news_posts"
  as permissive
  for select
  to public
using (((is_published = true) AND (published_at <= now())));



  create policy "Participants can view trade offer items"
  on "public"."trade_offer_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.trade_offers o
  WHERE ((o.id = trade_offer_items.offer_id) AND ((( SELECT auth.uid() AS uid) = o.proposer_id) OR (( SELECT auth.uid() AS uid) = o.recipient_id))))));



  create policy "Participants can view their trade offers"
  on "public"."trade_offers"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = proposer_id) OR (( SELECT auth.uid() AS uid) = recipient_id)));



  create policy "Users can view their own Twitch connection"
  on "public"."twitch_connections"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Public can read Twitch public config"
  on "public"."twitch_integration_config"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Users can view their Twitch reward history"
  on "public"."twitch_reward_grants"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can read their achievements"
  on "public"."user_achievements"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their card preferences"
  on "public"."user_card_preferences"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own cards"
  on "public"."user_cards"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can delete their own notifications"
  on "public"."user_notifications"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update their own notifications"
  on "public"."user_notifications"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own notifications"
  on "public"."user_notifications"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can read their titles"
  on "public"."user_titles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their trade settings"
  on "public"."user_trade_settings"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own wallet"
  on "public"."user_wallets"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));


CREATE TRIGGER profiles_moderation_lock_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_moderation_lock();

CREATE TRIGGER reward_redemption_notifications_v881 AFTER INSERT ON public.reward_code_redemptions FOR EACH ROW EXECUTE FUNCTION public.notify_redemption_v881();

CREATE TRIGGER reward_codes_staff_audit AFTER INSERT OR UPDATE ON public.reward_codes FOR EACH ROW EXECUTE FUNCTION public.audit_reward_code_change();

CREATE TRIGGER trade_offer_notifications_v881 AFTER INSERT OR UPDATE OF status ON public.trade_offers FOR EACH ROW EXECUTE FUNCTION public.notify_trade_offer_v881();

CREATE TRIGGER user_achievement_notifications_v881 AFTER INSERT ON public.user_achievements FOR EACH ROW EXECUTE FUNCTION public.notify_achievement_v881();

CREATE TRIGGER user_cards_award_collector_xp AFTER INSERT OR UPDATE OF quantity ON public.user_cards FOR EACH ROW EXECUTE FUNCTION public.award_collector_xp_from_card_quantity();

CREATE TRIGGER on_auth_user_create_wallet AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.ensure_user_wallet();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Administrators can delete managed site assets"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'site-assets'::text) AND public.is_starlight_asset_admin(auth.uid())));



  create policy "Administrators can update managed site assets"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'site-assets'::text) AND public.is_starlight_asset_admin(auth.uid())))
with check (((bucket_id = 'site-assets'::text) AND public.is_starlight_asset_admin(auth.uid())));



  create policy "Administrators can upload managed site assets"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'site-assets'::text) AND public.is_starlight_asset_admin(auth.uid())));



  create policy "Profile images are publicly readable"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'profile-images'::text));



  create policy "Public can view managed site assets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'site-assets'::text));



  create policy "Users delete their own profile images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'profile-images'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text)));



  create policy "Users update their own profile images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'profile-images'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text)))
with check (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));



  create policy "Users upload their own profile images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));



