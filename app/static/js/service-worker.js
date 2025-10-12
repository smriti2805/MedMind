console.log("Service Worker Loaded");

self.addEventListener("push", (event) => {
	const data = event.data.json();
	console.log("Push notification received:", data);

	const title = data.title || "MedMind Notification";
	const options = {
		body: data.body,
		icon: "/static/images/favicon.ico",
		// You can add more options like a badge, image, etc.
		data: {
			url: data.url,
		},
	};
	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});
