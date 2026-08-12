import { supabase } from "./supabase-client.js";

/**
 * Returns the correct authentication redirect address.
 * Local testing returns to the local login page.
 * The live site returns to cards.sorastarlight.net.
 */
function getAuthRedirectUrl(extraParams = {}) {
    const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    const base = isLocal
        ? `${window.location.origin}/login`
        : "https://cards.sorastarlight.net/login.html";

    const redirect = new URL(base);
    Object.entries(extraParams).forEach(([key, value]) => {
        if (value == null || value === "") return;
        redirect.searchParams.set(key, String(value));
    });
    return redirect.toString();
}

/**
 * Creates a new account.
 * Optional profile fields are stored in auth user metadata for handle_new_user.
 */
export async function signUp(email, password, profile = {}) {
    const username = String(profile.username || "").trim().toLowerCase();
    const displayName = String(profile.displayName || profile.display_name || "").trim();
    const data = {};

    if (username) data.username = username;
    if (displayName) data.display_name = displayName;

    return await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data
        }
    });
}

/**
 * Signs an existing user into their account.
 */
export async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({
        email,
        password
    });
}

/**
 * Sends a password-reset email. The link returns to login with mode=reset.
 */
export async function requestPasswordReset(email) {
    return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl({ mode: "reset" })
    });
}

/**
 * Sets a new password for the recovery session created by the reset email link.
 */
export async function updatePassword(password) {
    return await supabase.auth.updateUser({ password });
}


export async function signInWithTwitch(options = {}) {
    // Always clear any stale local session before a signed-out OAuth flow.
    // This prevents the browser from silently returning to the previously
    // authenticated Starlight account.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.includes('auth-token')) localStorage.removeItem(key);
    }
    const redirect = new URL(getAuthRedirectUrl());
    redirect.searchParams.set('oauth', 'twitch');
    redirect.searchParams.set('intent', options.intent || 'continue');
    return await supabase.auth.signInWithOAuth({
        provider: 'twitch',
        options: {
            redirectTo: redirect.toString(),
            queryParams: { force_verify: 'true' },
            skipBrowserRedirect: Boolean(options.skipBrowserRedirect)
        }
    });
}

/**
 * Signs the current user out.
 */
export async function signOut() {
    return await supabase.auth.signOut();
}

/**
 * Returns the currently authenticated user.
 * Returns null when nobody is signed in.
 */
export async function getUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error("Unable to retrieve the current user:", error);
        return null;
    }

    return data.user;
}

/**
 * Returns the current Supabase session.
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Unable to retrieve the current session:", error);
        return null;
    }

    return data.session;
}