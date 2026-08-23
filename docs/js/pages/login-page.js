import { supabase } from "../supabase-client.js";

        import {
            signIn,
            signUp,
            signInWithTwitch,
            requestPasswordReset,
            updatePassword
        } from "../auth.js";

        import { getCachedWebsiteContent } from "../website-content-hydrate.js";
        import { cloneDefaultWebsiteContent } from "../website-content-defaults.js";

        const form =
            document.getElementById("auth-form");

        const modeButtons =
            document.getElementById("mode-buttons");

        const providerLogin =
            document.getElementById("provider-login");

        const twitchAuthButton = document.getElementById("twitch-auth-button");

        const emailGroup =
            document.getElementById("email-group");

        const emailInput =
            document.getElementById("email");

        const passwordGroup =
            document.getElementById("password-group");

        const passwordInput =
            document.getElementById("password");

        const passwordLabel =
            document.querySelector('#password-group label[for="password"]');

        const confirmPasswordInput =
            document.getElementById("confirm-password");

        const confirmPasswordGroup =
            document.getElementById(
                "confirm-password-group"
            );

        const confirmPasswordLabel =
            document.getElementById("confirm-password-label");

        const signupIdentityGroup =
            document.getElementById(
                "signup-identity-group"
            );

        const signupUsernameInput =
            document.getElementById(
                "signup-username"
            );

        const signupDisplayNameInput =
            document.getElementById(
                "signup-display-name"
            );

        const submitButton =
            document.getElementById("submit-button");

        const signInModeButton =
            document.getElementById(
                "sign-in-mode-button"
            );

        const signUpModeButton =
            document.getElementById(
                "sign-up-mode-button"
            );

        const forgotPasswordButton =
            document.getElementById(
                "forgot-password-button"
            );

        const backToSignInButton =
            document.getElementById(
                "back-to-sign-in-button"
            );

        const pageDescription =
            document.getElementById(
                "page-description"
            );

        const statusElement =
            document.getElementById("auth-status");

        const showPasswordButton =
            document.getElementById(
                "show-password-button"
            );

        const showConfirmPasswordButton =
            document.getElementById(
                "show-confirm-password-button"
            );

        let currentMode = "signin";
        let passwordRecoveryPending = false;
        const defaultLogin = cloneDefaultWebsiteContent().login;
        let loginCopy = { ...defaultLogin };
        const brandTitleEl = document.querySelector('[data-content="login.brandTitle"]');
        const returnCtaEl = document.querySelector('[data-content="login.returnCta"]');

        twitchAuthButton.addEventListener("click", async () => {
            try {
                twitchAuthButton.disabled = true;
                twitchAuthButton.textContent = "Opening Twitch...";
                const embedded = document.documentElement.classList.contains("starlight-embedded");
                const { data, error } = await signInWithTwitch({
                    intent: currentMode === 'signup' ? 'signup' : 'signin',
                    skipBrowserRedirect: embedded
                });
                if (error) throw error;
                if (embedded && data?.url) {
                    window.top.location.href = data.url;
                    return;
                }
            } catch (error) {
                displayStatus(error.message || "Unable to continue with Twitch.", "error");
                twitchAuthButton.disabled = false;
                twitchAuthButton.textContent = loginCopy.twitchCta || "Continue with Twitch";
            }
        });


        function displayStatus(message, type = "") {
            statusElement.textContent = message;

            statusElement.classList.remove(
                "error",
                "success"
            );

            if (type) {
                statusElement.classList.add(type);
            }
        }

        function submitLabelForMode(mode = currentMode) {
            if (mode === "signup") return loginCopy.submitSignUp || "Create Account";
            if (mode === "forgot") return loginCopy.submitForgot || "Send Reset Link";
            if (mode === "reset") return loginCopy.submitReset || "Save New Password";
            return loginCopy.submitSignIn || "Sign In";
        }

        function loadingLabelForMode(mode = currentMode) {
            if (mode === "signup") return "Creating Account...";
            if (mode === "forgot") return "Sending Reset Link...";
            if (mode === "reset") return "Saving Password...";
            return "Signing In...";
        }

        function setLoading(isLoading) {
            submitButton.disabled = isLoading;
            submitButton.textContent = isLoading
                ? loadingLabelForMode()
                : submitLabelForMode();
        }

        function setMode(mode) {
            currentMode = mode;

            const isSignUp = currentMode === "signup";
            const isForgot = currentMode === "forgot";
            const isReset = currentMode === "reset";
            const isSignIn = currentMode === "signin";

            modeButtons?.classList.toggle("hidden", isForgot || isReset);
            providerLogin?.classList.toggle("hidden", isForgot || isReset);
            backToSignInButton?.classList.toggle("hidden", !(isForgot || isReset));

            signInModeButton.classList.toggle("active", isSignIn);
            signUpModeButton.classList.toggle("active", isSignUp);
            signInModeButton.textContent = loginCopy.signInModeLabel || "Sign In";
            signUpModeButton.textContent = loginCopy.signUpModeLabel || "Create Account";
            twitchAuthButton.textContent = loginCopy.twitchCta || "Continue with Twitch";
            if (forgotPasswordButton) {
                forgotPasswordButton.textContent = loginCopy.forgotPasswordCta || "Forgot password?";
                forgotPasswordButton.classList.toggle("hidden", !isSignIn);
            }
            if (backToSignInButton) {
                backToSignInButton.textContent = loginCopy.backToSignInCta || "Back to Sign In";
            }
            if (returnCtaEl) {
                returnCtaEl.textContent = loginCopy.returnCta || "Return to the Binder";
            }

            signInModeButton.setAttribute("aria-pressed", String(isSignIn));
            signUpModeButton.setAttribute("aria-pressed", String(isSignUp));

            emailGroup?.classList.toggle("hidden", isReset);
            emailInput.required = !isReset;
            emailInput.disabled = isReset;

            passwordGroup?.classList.toggle("hidden", isForgot);
            passwordInput.required = !isForgot;
            if (passwordLabel) {
                passwordLabel.textContent = isReset
                    ? (loginCopy.newPasswordLabel || "New Password")
                    : (loginCopy.passwordLabel || "Password");
            }

            confirmPasswordGroup.classList.toggle("hidden", !(isSignUp || isReset));
            confirmPasswordInput.required = isSignUp || isReset;
            if (confirmPasswordLabel) {
                confirmPasswordLabel.textContent = isReset
                    ? (loginCopy.confirmNewPasswordLabel || "Confirm New Password")
                    : (loginCopy.confirmPasswordLabel || "Confirm Password");
            }

            signupIdentityGroup?.classList.toggle("hidden", !isSignUp);
            if (signupUsernameInput) signupUsernameInput.required = isSignUp;
            if (signupDisplayNameInput) signupDisplayNameInput.required = isSignUp;

            passwordInput.autocomplete =
                isSignUp || isReset
                    ? "new-password"
                    : "current-password";

            if (brandTitleEl) {
                brandTitleEl.textContent = loginCopy.brandTitle;
            }

            if (isForgot) {
                pageDescription.textContent = loginCopy.forgotDescription
                    || "Enter your email and we will send a link to reset your password.";
            } else if (isReset) {
                pageDescription.textContent = loginCopy.resetDescription
                    || "Choose a new password for your Starlight account.";
            } else if (isSignUp) {
                pageDescription.textContent = loginCopy.signUpDescription;
            } else {
                pageDescription.textContent = loginCopy.signInDescription;
            }

            submitButton.textContent = submitLabelForMode();
            displayStatus("");

            if (isReset) passwordInput.focus();
            else emailInput.focus();
        }

        function setupPasswordToggle(
            button,
            input
        ) {
            button.addEventListener("click", () => {
                const passwordIsVisible =
                    input.type === "text";

                input.type =
                    passwordIsVisible
                        ? "password"
                        : "text";

                button.textContent =
                    passwordIsVisible
                        ? "Show"
                        : "Hide";

                button.setAttribute(
                    "aria-pressed",
                    String(!passwordIsVisible)
                );
            });
        }

        async function claimTwitchIdentityIfNeeded() {
            try {
                const { error } = await supabase.rpc(
                    "claim_twitch_collector_identity"
                );
                if (error) {
                    console.warn(
                        "Twitch collector identity claim failed:",
                        error
                    );
                }
            } catch (error) {
                console.warn(
                    "Twitch collector identity claim failed:",
                    error
                );
            }
        }

        async function goToBinder(view = 'home') {
            if (document.documentElement.classList.contains('starlight-embedded')) {
                const { data: { session } } = await supabase.auth.getSession();
                parent.postMessage({
                    type: 'starlight-auth-changed',
                    session: session ? {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token
                    } : null
                }, location.origin);
                parent.postMessage({
                    type: 'starlight-navigate',
                    view,
                    params: {}
                }, location.origin);
                return;
            }

            window.location.href = view === 'binder'
                ? './binder?view=home'
                : `./binder?view=${encodeURIComponent(view)}`;
        }

        function hashLooksLikeRecovery() {
            const hash = String(window.location.hash || "").replace(/^#/, "");
            if (!hash) return false;
            const params = new URLSearchParams(hash);
            return params.get("type") === "recovery";
        }

        function enterPasswordRecovery() {
            passwordRecoveryPending = true;
            setMode("reset");
            displayStatus(
                loginCopy.resetReadyStatus
                    || "Reset link confirmed. Enter your new password below.",
                "success"
            );
        }

        async function handleAuthenticationReturn() {
            const urlParameters =
                new URLSearchParams(
                    window.location.search
                );

            const urlError =
                urlParameters.get(
                    "error_description"
                );

            if (urlError) {
                displayStatus(
                    decodeURIComponent(urlError),
                    "error"
                );

                return;
            }

            if (hashLooksLikeRecovery() || urlParameters.get("mode") === "reset") {
                // Wait briefly for the client to exchange the recovery token.
                const {
                    data: { subscription }
                } = supabase.auth.onAuthStateChange((event) => {
                    if (event === "PASSWORD_RECOVERY") {
                        enterPasswordRecovery();
                    }
                });

                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    subscription.unsubscribe();
                    displayStatus(
                        "We could not open the password reset link. Request a new one and try again.",
                        "error"
                    );
                    setMode("forgot");
                    return;
                }

                if (hashLooksLikeRecovery() || data.session) {
                    enterPasswordRecovery();
                } else {
                    setMode("reset");
                    displayStatus(
                        "Opening your password reset… If nothing happens, request a new reset link.",
                        ""
                    );
                }

                window.setTimeout(() => subscription.unsubscribe(), 15000);
                return;
            }

            const {
                data,
                error
            } = await supabase.auth.getSession();

            if (error) {
                console.error(
                    "Session check failed:",
                    error
                );

                displayStatus(
                    "We could not complete the account confirmation. Please try signing in.",
                    "error"
                );

                return;
            }

            if (data.session) {
                const isTwitchOAuth =
                    urlParameters.get("oauth") === "twitch" ||
                    Boolean(
                        data.session.user?.identities?.find(
                            item => item.provider === "twitch"
                        )
                    );

                if (isTwitchOAuth) {
                    await claimTwitchIdentityIfNeeded();
                }

                const identity = data.session.user?.identities?.find(item => item.provider === 'twitch');
                const twitchName =
                    identity?.identity_data?.preferred_username ||
                    identity?.identity_data?.user_name ||
                    identity?.identity_data?.full_name ||
                    data.session.user?.user_metadata?.preferred_username ||
                    '';
                displayStatus(
                    twitchName
                        ? `Signed in with Twitch as @${twitchName}. Taking you to the Binder...`
                        : "Your account is confirmed and you are signed in! Taking you to the Binder...",
                    "success"
                );

                window.setTimeout(() => {
                    goToBinder('home');
                }, 1800);
            }
        }

        signInModeButton.addEventListener(
            "click",
            () => {
                setMode("signin");
            }
        );

        signUpModeButton.addEventListener(
            "click",
            () => {
                setMode("signup");
            }
        );

        forgotPasswordButton?.addEventListener("click", () => {
            setMode("forgot");
        });

        backToSignInButton?.addEventListener("click", () => {
            passwordRecoveryPending = false;
            setMode("signin");
        });

        setupPasswordToggle(
            showPasswordButton,
            passwordInput
        );

        setupPasswordToggle(
            showConfirmPasswordButton,
            confirmPasswordInput
        );

        signupUsernameInput?.addEventListener("input", () => {
            signupUsernameInput.value = signupUsernameInput.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "");
        });

        function applyLoginCopy(content) {
            if (content?.login) {
                loginCopy = {
                    ...loginCopy,
                    ...content.login
                };
            }
        }

        applyLoginCopy(getCachedWebsiteContent());

        const requestedMode = new URLSearchParams(window.location.search).get("mode");
        if (requestedMode === "signup") setMode("signup");
        else if (requestedMode === "forgot") setMode("forgot");
        else if (requestedMode === "reset") setMode("reset");
        else setMode("signin");

        window.addEventListener("starlight-website-content-hydrated", (event) => {
            applyLoginCopy(event.detail);
            setMode(currentMode);
        });

        supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                enterPasswordRecovery();
            }
        });

        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                displayStatus("");

                const email =
                    emailInput.value.trim();

                const password =
                    passwordInput.value;

                if (currentMode !== "reset" && !email) {
                    displayStatus(
                        "Please enter your email address.",
                        "error"
                    );

                    emailInput.focus();
                    return;
                }

                if (currentMode === "forgot") {
                    setLoading(true);
                    try {
                        const { error } = await requestPasswordReset(email);
                        if (error) throw error;
                        displayStatus(
                            loginCopy.forgotSentStatus
                                || "If an account exists for that email, a reset link is on the way. Check your inbox.",
                            "success"
                        );
                    } catch (error) {
                        console.error("Password reset request failed:", error);
                        displayStatus(
                            error.message
                                || "Unable to send a reset link right now. Please try again.",
                            "error"
                        );
                    } finally {
                        setLoading(false);
                    }
                    return;
                }

                if (password.length < 8) {
                    displayStatus(
                        "Your password must contain at least eight characters.",
                        "error"
                    );

                    passwordInput.focus();
                    return;
                }

                if (
                    (currentMode === "signup" || currentMode === "reset") &&
                    password !==
                        confirmPasswordInput.value
                ) {
                    displayStatus(
                        "The two passwords do not match.",
                        "error"
                    );

                    confirmPasswordInput.focus();
                    return;
                }

                if (currentMode === "reset") {
                    setLoading(true);
                    try {
                        const { error } = await updatePassword(password);
                        if (error) throw error;
                        passwordRecoveryPending = false;
                        displayStatus(
                            loginCopy.resetSuccessStatus
                                || "Password updated! Taking you to the Binder...",
                            "success"
                        );
                        window.setTimeout(() => {
                            goToBinder("home");
                        }, 1200);
                    } catch (error) {
                        console.error("Password update failed:", error);
                        displayStatus(
                            error.message
                                || "Unable to update your password. Request a new reset link and try again.",
                            "error"
                        );
                    } finally {
                        setLoading(false);
                    }
                    return;
                }

                let signupUsername = "";
                let signupDisplayName = "";

                if (currentMode === "signup") {
                    signupUsername = String(
                        signupUsernameInput?.value || ""
                    )
                        .trim()
                        .toLowerCase();

                    signupDisplayName = String(
                        signupDisplayNameInput?.value || ""
                    ).trim();

                    if (!/^[a-z0-9_]{3,24}$/.test(signupUsername)) {
                        displayStatus(
                            "Username must be 3–24 characters using lowercase letters, numbers, or underscores.",
                            "error"
                        );
                        signupUsernameInput?.focus();
                        return;
                    }

                    if (
                        !signupDisplayName ||
                        signupDisplayName.length > 40
                    ) {
                        displayStatus(
                            "Display name must be between 1 and 40 characters.",
                            "error"
                        );
                        signupDisplayNameInput?.focus();
                        return;
                    }
                }

                setLoading(true);

                try {
                    if (currentMode === "signup") {
                        const {
                            data,
                            error
                        } = await signUp(
                            email,
                            password,
                            {
                                username: signupUsername,
                                displayName: signupDisplayName
                            }
                        );

                        if (error) {
                            throw error;
                        }

                        if (data.session) {
                            displayStatus(
                                "Your account was created and you are signed in! Taking you to the binder...",
                                "success"
                            );

                            window.setTimeout(() => {
                                goToBinder('home');
                            }, 1500);

                            return;
                        }

                        displayStatus(
                            "Your account was created! Check your email and click the confirmation link to finish signing up.",
                            "success"
                        );

                        form.reset();
                        return;
                    }

                    const {
                        error
                    } = await signIn(
                        email,
                        password
                    );

                    if (error) {
                        throw error;
                    }

                    displayStatus(
                        "You are signed in! Taking you to the binder...",
                        "success"
                    );

                    window.setTimeout(() => {
                        goToBinder('home');
                    }, 1000);
                } catch (error) {
                    console.error(
                        "Authentication failed:",
                        error
                    );

                    displayStatus(
                        error.message ||
                            "Something went wrong. Please try again.",
                        "error"
                    );
                } finally {
                    setLoading(false);
                }
            }
        );

        handleAuthenticationReturn();
