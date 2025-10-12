/**
 * This script handles the setup of Web Push notifications for a logged-in user.
 */

// This function will be called from the base template.
async function initializePushNotifications() {
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
		console.warn("Push notifications are not supported by this browser.");
		return;
	}

	// Register the Service Worker from the root to control the whole site.
	try {
		const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
		console.log("Service Worker registered successfully with scope:", registration.scope);

		// Wait for the service worker to become active
		await navigator.serviceWorker.ready;
		console.log("Service Worker is active and ready.");

		// Handle the subscription process
		await subscribeUserToPush(registration);
	} catch (error) {
		console.error("Service Worker registration failed:", error);
	}
}

async function subscribeUserToPush(registration) {
	let subscription = await registration.pushManager.getSubscription();

	if (subscription === null) {
		if (Notification.permission === "denied") {
			console.error("Notification permission has been denied by the user.");
			return;
		}

		console.log("Subscribing user to push notifications...");
		try {
			const applicationServerKey = await getVapidPublicKey();
			if (!applicationServerKey) return;

			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlB64ToUint8Array(applicationServerKey),
			});
			console.log("User subscribed successfully:", subscription);
			// This is a new subscription, so we must send it to the server.
			await sendSubscriptionToServer(subscription);
		} catch (error) {
			console.error("Failed to subscribe the user:", error);
		}
	} else {
		console.log("User is already subscribed.");
		// Even if already subscribed, send it once per session to ensure server is in sync.
		await sendSubscriptionToServer(subscription);
	}
}

// Helper function to fetch the VAPID key from our server
async function getVapidPublicKey() {
	try {
		const response = await fetch("/vapid-public-key");
		if (!response.ok) throw new Error("Failed to get VAPID key");
		const data = await response.json();
		return data.public_key;
	} catch (error) {
		console.error("Error fetching VAPID public key:", error);
		return null;
	}
}

// Helper function to send the subscription object to our server
async function sendSubscriptionToServer(subscription) {
	// --- THIS IS THE KEY CHANGE ---
	// 1. Check if we've already sent the subscription in this session.
	if (sessionStorage.getItem("subscriptionSent") === "true") {
		console.log("Subscription already sent to server this session. Skipping.");
		return;
	}

	try {
		const response = await fetch("/save-subscription", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": document.querySelector('meta[name="csrf-token"]').content,
			},
			body: JSON.stringify(subscription),
		});

		if (response.ok) {
			console.log("Subscription sent to server successfully.");
			// 2. On success, set the flag in sessionStorage.
			sessionStorage.setItem("subscriptionSent", "true");
		} else {
			console.error("Failed to send subscription to server.");
		}
	} catch (error) {
		console.error("Error sending subscription to server:", error);
	}
}

// This helper function is required to convert the VAPID key for the browser
function urlB64ToUint8Array(base64String) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}
