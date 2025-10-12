document.addEventListener("DOMContentLoaded", () => {
	// --- Profile Menu Logic ---
	const profileMenuButton = document.getElementById("profile-menu-button");
	const profileMenu = document.getElementById("profile-menu");

	// --- "More" Menu Logic ---
	const moreMenuButton = document.getElementById("more-menu-button");
	const moreMenu = document.getElementById("more-menu");
	const moreMenuArrow = document.getElementById("more-menu-arrow");

	if (profileMenuButton) {
		profileMenuButton.addEventListener("click", (event) => {
			event.stopPropagation(); // Prevent the click from bubbling up to the window
			profileMenu.classList.toggle("hidden");

			// --- ADDED: Close the other menu if it's open ---
			if (moreMenu && !moreMenu.classList.contains("hidden")) {
				moreMenu.classList.add("hidden");
				moreMenuArrow.classList.remove("rotate-180");
			}
		});
	}

	if (moreMenuButton) {
		moreMenuButton.addEventListener("click", (event) => {
			event.stopPropagation();
			moreMenu.classList.toggle("hidden");
			moreMenuArrow.classList.toggle("rotate-180");

			// --- ADDED: Close the other menu if it's open ---
			if (profileMenu && !profileMenu.classList.contains("hidden")) {
				profileMenu.classList.add("hidden");
			}
		});
	}

	// --- Global Click Listener to Close Menus ---
	window.addEventListener("click", () => {
		if (profileMenu && !profileMenu.classList.contains("hidden")) {
			profileMenu.classList.add("hidden");
		}
		if (moreMenu && !moreMenu.classList.contains("hidden")) {
			moreMenu.classList.add("hidden");
			moreMenuArrow.classList.remove("rotate-180");
		}
	});

	// Prevent clicks inside the menus from closing them
	if (profileMenu) {
		profileMenu.addEventListener("click", (event) => event.stopPropagation());
	}
	if (moreMenu) {
		moreMenu.addEventListener("click", (event) => event.stopPropagation());
	}
});
