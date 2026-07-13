import { supabase } from "./supabase-client.js";

/**
 * Returns the correct authentication redirect address.
 * Local testing returns to the local login page.
 * The live site returns to cards.sorastarlight.net.
 */
function getAuthRedirectUrl() {
    const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    if (isLocal) {
        return `${window.location.origin}/login.html`;
    }

    return "https://cards.sorastarlight.net/login.html";
}

/**
 * Creates a new account.
 */
export async function signUp(email, password) {
    return await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: getAuthRedirectUrl()
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