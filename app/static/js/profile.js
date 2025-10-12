document.addEventListener("DOMContentLoaded", () => {
	const editProfileBtn = document.getElementById("edit-profile-btn");
	const cancelBtn = document.getElementById("cancel-btn");

	const viewModeDiv = document.getElementById("view-mode");
	const editModeDiv = document.getElementById("edit-mode");

	const showEditMode = () => {
		viewModeDiv.classList.add("hidden");
		editModeDiv.classList.remove("hidden");
		editProfileBtn.classList.add("hidden"); // Hide the main edit button
	};

	const showViewMode = () => {
		viewModeDiv.classList.remove("hidden");
		editModeDiv.classList.add("hidden");
		editProfileBtn.classList.remove("hidden"); // Show the main edit button
	};

	if (editProfileBtn) {
		editProfileBtn.addEventListener("click", showEditMode);
	}

	if (cancelBtn) {
		cancelBtn.addEventListener("click", showViewMode);
	}
});
