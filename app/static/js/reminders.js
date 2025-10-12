document.addEventListener("DOMContentLoaded", () => {
	// --- Get Element References ---
	const addReminderBtn = document.getElementById("add-reminder-btn");
	const editBtns = document.querySelectorAll(".edit-btn");
	const dltBtns = document.querySelectorAll(".dlt-btn");
	const modal = document.getElementById("reminder-modal");
	const modalBackdrop = document.getElementById("modal-backdrop");
	const modalContent = document.getElementById("modal-content");

	// --- Function to open the modal ---
	const openModal = (title, formAction, reminderData = null) => {
		// Create the form HTML dynamically
		const formHtml = `
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">${title}</h1>
            </div>
            <form id="modal-form" action="${formAction}" method="POST" class="space-y-6">
                <input type="hidden" name="csrf_token" value="${document.querySelector("meta[name=csrf-token]").content}">
                <input type="hidden" name="reminder_id" value="${reminderData?.id || ""}">
                <div>
                    <label for="medicine_name" class="block text-sm font-medium text-gray-700">Medicine Name</label>
                    <div class="mt-1">
                        <input type="text" name="medicine_name" value="${
							reminderData?.medicine_name || ""
						}" required class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                </div>
                <div>
                    <label for="notification_time" class="block text-sm font-medium text-gray-700">Time (24-hour format)</label>
                    <div class="mt-1">
                        <input type="time" name="notification_time" value="${
							reminderData?.notification_time || ""
						}" required class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                </div>
                <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                    Save Changes
                </button>
            </form>
        `;
		modalContent.innerHTML = formHtml;
		modal.classList.remove("hidden");
		modal.classList.add("flex");

		// Handle form submission inside the modal
		const modalForm = document.getElementById("modal-form");
		modalForm.addEventListener("submit", handleFormSubmit);
	};

	// --- Function to close the modal ---
	const closeModal = () => {
		modal.classList.add("hidden");
		modal.classList.remove("flex");
		modalContent.innerHTML = ""; // Clear content
	};

	// --- Function to handle form submission ---
	const handleFormSubmit = async (event) => {
		event.preventDefault();
		const form = event.target;
		const formData = new FormData(form);

		try {
			const response = await fetch(form.action, {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				window.location.reload();
			} else {
				alert("An error occurred. Please try again.");
			}
		} catch (error) {
			console.error("Form submission error:", error);
			alert("A network error occurred.");
		}
	};

	// --- Event Listeners ---
	addReminderBtn.addEventListener("click", () => {
		openModal("Add New Reminder", "/add_reminder");
	});

	editBtns.forEach((btn) => {
		btn.addEventListener("click", async () => {
			const reminderId = btn.dataset.id;
			const data = await fetch(`/get_reminder/${reminderId}`).then((res) => res.json());
			openModal("Edit Reminder", "/edit_reminder", data);
		});
	});

	dltBtns.forEach((btn) => {
		btn.addEventListener("click", async (event) => {
			const target = event.target;

			if (confirm("Are you sure you want to delete this reminder?")) {
				const reminderId = target.dataset.id;
				const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");

				const formData = new FormData();
				formData.append("csrf_token", csrfToken);
				formData.append("reminder_id", reminderId);

				try {
					const response = await fetch(`/delete_reminder`, {
						method: "POST",
						body: formData,
					});

					const result = await response.json();

					if (result.success) {
						target.closest("li").remove();
						alert(result.message); // This can be replaced with a nicer toast notification
					} else {
						alert("Error: " + (result.error || "Unknown error"));
					}
				} catch (error) {
					console.error("Delete failed:", error);
					alert("An error occurred. Please try again.");
				}
			}
		});
	});

	// Close modal when clicking on the backdrop
	modalBackdrop.addEventListener("click", closeModal);

	// function setupNotifications() {
	// 	if (!("Notification" in window)) {
	// 		console.error("This browser does not support desktop notifications.");
	// 		return;
	// 	}

	// 	// Connect to the user-specific stream endpoint
	// 	const eventSource = new EventSource(`/notify`);
	// 	eventSource.onmessage = function (event) {
	// 		console.log("Reminder event received:", event.data);
	// 		reminder = JSON.parse(event.data);
	// 		console.log(reminder);

	// 		if (!!reminder) {
	// 			switch (Notification.permission) {
	// 				case "granted":
	// 					console.log("permission granted");
	// 					new Notification(reminder.title, {
	// 						body: reminder.body,
	// 						icon: "/static/images/favicon.ico",
	// 					});

	// 					eventSource.onerror = function (err) {
	// 						console.error("EventSource failed:", err);
	// 					};
	// 					break;

	// 				case "denied":
	// 					console.error("Permission for notifications is denied.");
	// 					alert("You have blocked notifications. Please enable them in your browser settings if you wish to receive them.");
	// 					alert(`${reminder.title}\n${reminder.body}`);
	// 					break;

	// 				case "default":
	// 					console.log("Permission for notifications has not been asked for yet.");
	// 					Notification.requestPermission();
	// 					break;
	// 			}
	// 		} else {
	// 			console.log("reminder=", reminder, "!!reminder=", !!reminder);
	// 		}
	// 	};
	// }
	// setupNotifications();
});
