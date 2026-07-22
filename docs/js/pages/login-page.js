import { supabase } from "../supabase-client.js";

        import {
            signIn,
            signUp,
            signInWithTwitch
        } from "../auth.js";

        import { loadAndHydrateWebsiteContent } from "../website-content-hydrate.js";
        import { cloneDefaultWebsiteContent } from "../website-content-defaults.js";

        const form =
            document.getElementById("auth-form");

        const twitchAuthButton = document.getElementById("twitch-auth-button");

        const emailInput =
            document.getElementById("email");

        const passwordInput =
            document.getElementById("password");

        const confirmPasswordInput =
            document.getElementById("confirm-password");

        const confirmPasswordGroup =
            document.getElementById(
                "confirm-password-group"
            );

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
        const defaultLogin = cloneDefaultWebsiteContent().login;
        let loginCopy = {
            brandTitle: defaultLogin.brandTitle,
            signInDescription: defaultLogin.signInDescription,
            signUpDescription: defaultLogin.signUpDescription
        };
        const brandTitleEl = document.querySelector('[data-content="login.brandTitle"]');

        twitchAuthButton.addEventListener("click", async () => {
            try {
                twitchAuthButton.disabled = true;
                twitchAuthButton.textContent = "Opening Twitch...";
                const { error } = await signInWithTwitch({ intent: currentMode === 'signup' ? 'signup' : 'signin' });
                if (error) throw error;
            } catch (error) {
                displayStatus(error.message || "Unable to continue with Twitch.", "error");
                twitchAuthButton.disabled = false;
                twitchAuthButton.textContent = "💜 Continue with Twitch";
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

        function setLoading(isLoading) {
            submitButton.disabled = isLoading;

            if (isLoading) {
                submitButton.textContent =
                    currentMode === "signin"
                        ? "Signing In..."
                        : "Creating Account...";

                return;
            }

            submitButton.textContent =
                currentMode === "signin"
                    ? "Sign In"
                    : "Create Account";
        }

        function setMode(mode) {
            currentMode = mode;

            const isSignUp =
                currentMode === "signup";

            signInModeButton.classList.toggle(
                "active",
                !isSignUp
            );

            signUpModeButton.classList.toggle(
                "active",
                isSignUp
            );

            signInModeButton.setAttribute(
                "aria-pressed",
                String(!isSignUp)
            );

            signUpModeButton.setAttribute(
                "aria-pressed",
                String(isSignUp)
            );

            confirmPasswordGroup.classList.toggle(
                "hidden",
                !isSignUp
            );

            signupIdentityGroup?.classList.toggle(
                "hidden",
                !isSignUp
            );

            confirmPasswordInput.required =
                isSignUp;

            if (signupUsernameInput) {
                signupUsernameInput.required = isSignUp;
            }

            if (signupDisplayNameInput) {
                signupDisplayNameInput.required = isSignUp;
            }

            passwordInput.autocomplete =
                isSignUp
                    ? "new-password"
                    : "current-password";

            if (brandTitleEl) {
                brandTitleEl.textContent = loginCopy.brandTitle;
            }

            pageDescription.textContent = isSignUp
                ? loginCopy.signUpDescription
                : loginCopy.signInDescription;

            submitButton.textContent =
                isSignUp
                    ? "Create Account"
                    : "Sign In";

            displayStatus("");

            emailInput.focus();
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
                    window.location.href =
                        "./binder.html";
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

        const requestedMode = new URLSearchParams(window.location.search).get("mode");

        (async () => {
            try {
                const content = await loadAndHydrateWebsiteContent();
                if (content?.login) {
                    loginCopy = {
                        brandTitle: content.login.brandTitle || loginCopy.brandTitle,
                        signInDescription: content.login.signInDescription || loginCopy.signInDescription,
                        signUpDescription: content.login.signUpDescription || loginCopy.signUpDescription
                    };
                }
            } catch {
                // Keep defaults when remote content is unavailable.
            }
            setMode(requestedMode === "signup" ? "signup" : "signin");
        })();

        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                displayStatus("");

                const email =
                    emailInput.value.trim();

                const password =
                    passwordInput.value;

                if (!email) {
                    displayStatus(
                        "Please enter your email address.",
                        "error"
                    );

                    emailInput.focus();
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
                    currentMode === "signup" &&
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
                                window.location.href =
                                    "./binder.html";
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
                        window.location.href =
                            "./binder.html";
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
