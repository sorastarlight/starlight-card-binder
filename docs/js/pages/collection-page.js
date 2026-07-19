document
            .querySelectorAll("[data-nav]")
            .forEach(link => {
                if (
                    link.dataset.nav ===
                    document.body.dataset.page
                ) {
                    link.classList.add(
                        "active"
                    );
                }
            });

