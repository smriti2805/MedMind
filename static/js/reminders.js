document.addEventListener("DOMContentLoaded", () => {
	// For this example, we'll hardcode a user ID. In a real app,
	// you would get this from your server-side template or auth system.
	const USER_ID = "user123";

	const form = document.getElementById("reminder-form");
	const statusEl = document.getElementById("form-status");

	if (form) {
		form.addEventListener("submit", async (event) => {
			event.preventDefault(); // Prevent default browser submission

			const formData = new FormData(form);
			statusEl.textContent = "Setting reminder...";
			statusEl.className = "text-gray-600";

			if (Notification.permission === "default") {
				alert("We need notification permission to set reminder");
			}
            
			try {
				const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
				formData.append("csrf_token", csrfToken);

				const response = await fetch("/add_reminder", {
					method: "POST",
					body: formData,
				});
				const result = await response.json();

				if (response.ok) {
					statusEl.textContent = result.message;
					statusEl.className = "text-green-600";
					form.reset();
				} else {
					statusEl.textContent = `Error: ${result.error}`;
					statusEl.className = "text-red-600";
				}
			} catch (error) {
				statusEl.textContent = "A network error occurred. Please try again.";
				statusEl.className = "text-red-600";
			}
		});
	}

	function setupNotifications() {
		if (!("Notification" in window)) {
			console.error("This browser does not support desktop notifications.");
			return;
		}

		// Connect to the user-specific stream endpoint
		const eventSource = new EventSource(`/notify/${USER_ID}`);
		eventSource.onmessage = function (event) {
			console.log("Reminder event received:", event.data);
			reminder = JSON.parse(event.data);
			console.log(reminder);

			if (!!reminder) {
				// sendNotification({ title: reminder.title, message: reminder.body });
				// if (Notification.permission === "granted") {
				// 	console.log("permission granted");
				// 	new Notification(reminder.title, {
				// 		body: reminder.body,
				// 		icon: "/static/images/favicon.ico",
				// 	});
				// }
				switch (Notification.permission) {
					case "granted":
						console.log("permission granted");
						new Notification(reminder.title, {
							body: reminder.body,
							icon: "/static/images/favicon.ico",
						});

						eventSource.onerror = function (err) {
							console.error("EventSource failed:", err);
						};
						break;

					case "denied":
						console.error("Permission for notifications is denied.");
						alert("You have blocked notifications. Please enable them in your browser settings if you wish to receive them.");
						alert(`${reminder.title}\n${reminder.body}`);
						break;

					case "default":
						console.log("Permission for notifications has not been asked for yet.");
						Notification.requestPermission();
						break;
				}
			} else {
				console.log("reminder=", reminder, "!!reminder=", !!reminder);
			}
		};
	}

	function sendNotification(data) {
		if (data == undefined || !data) {
			return false;
		}
		var title = data.title === undefined ? "Notification" : data.title;
		var clickCallback = data.clickCallback;
		var message = data.message === undefined ? "null" : data.message;
		var icon = data.icon === undefined ? "/static/images/favicon.ico" : data.icon;
		var sendNotification = function () {
			var notification = new Notification(title, {
				icon: icon,
				body: message,
			});
			if (clickCallback !== undefined) {
				notification.onclick = function () {
					clickCallback();
					notification.close();
				};
			}
		};

		if (!window.Notification) {
			return false;
		} else {
			if (Notification.permission === "default") {
				Notification.requestPermission(function (p) {
					if (p !== "denied") {
						sendNotification();
					}
				});
			} else {
				sendNotification();
			}
		}
	}

	setupNotifications();
});
