document.addEventListener("DOMContentLoaded", () => {
	const searchInput = document.getElementById("search-input");
	const searchBtn = document.getElementById("search-btn");
	const currentLocationBtn = document.getElementById("current-location-btn");
	const resultsList = document.getElementById("results-list");
	const mapElement = document.getElementById("map");

	if (!mapElement) return;

	// --- Define Custom Icons ---
	const greenIcon = new L.Icon({
		iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
		shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41],
	});

	const map = L.map("map").setView([20.5937, 78.9629], 5);
	let userLocationLayer = L.layerGroup().addTo(map);
	let searchResultsLayer = L.layerGroup().addTo(map);

	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	}).addTo(map);

	// --- 1. SEARCH BY TEXT (uses Nominatim) ---
	const performTextSearch = async () => {
		const query = searchInput.value.trim();
		if (!query) {
			alert("Please enter a location or place name to search.");
			return;
		}

		setLoadingState(true);
		searchResultsLayer.clearLayers();

		const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

		try {
			const response = await fetch(apiUrl);
			if (!response.ok) throw new Error("Network response was not ok.");
			const data = await response.json();
			displayNominatimResults(data);
		} catch (error) {
			handleSearchError(error);
		} finally {
			setLoadingState(false);
		}
	};

	// --- 2. SEARCH BY CURRENT LOCATION (uses Overpass API) ---
	const searchNearCurrentLocation = () => {
		if (!navigator.geolocation) {
			alert("Geolocation is not supported by your browser.");
			return;
		}

		setLoadingState(true, "Getting your location...");
		userLocationLayer.clearLayers();
		searchResultsLayer.clearLayers();

		const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude, accuracy } = position.coords;
				visualizeUserLocation(latitude, longitude, accuracy);
				// Now, perform the more powerful Overpass search
				await performOverpassSearch(latitude, longitude);
			},
			(error) => {
				handleSearchError(error, "Could not get your location. Please ensure you have granted permission.");
			},
			geoOptions
		);
	};

	const performOverpassSearch = async (lat, lon) => {
		// This query finds amenities like hospitals, clinics, doctors, and pharmacies within a 5km radius.
		const radius = 5000; // 5km
		const overpassQuery = `
            [out:json];
            (
              node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radius},${lat},${lon});
              way["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radius},${lat},${lon});
              relation["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radius},${lat},${lon});
            );
            out center;
        `;
		const apiUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

		try {
			const response = await fetch(apiUrl);
			if (!response.ok) throw new Error("Overpass API request failed.");
			const data = await response.json();
			displayOverpassResults(data.elements);
		} catch (error) {
			handleSearchError(error);
		} finally {
			setLoadingState(false);
		}
	};

	// --- UI Update Functions ---

	const visualizeUserLocation = (lat, lon, accuracy) => {
		const userLocationMarker = L.marker([lat, lon], { icon: greenIcon }).addTo(userLocationLayer);
		userLocationMarker.bindPopup(`<b>Your Approximate Location</b><br>Accuracy: ~${accuracy.toFixed(0)} meters`).openPopup();
		L.circle([lat, lon], {
			radius: accuracy,
			color: "#28a745",
			fillColor: "#28a745",
			fillOpacity: 0.1,
			weight: 1,
		}).addTo(userLocationLayer);
		map.setView([lat, lon], 13);
	};

	const displayNominatimResults = (results) => {
		if (results.length === 0) {
			resultsList.innerHTML = '<p class="text-gray-500">No results found for that name.</p>';
			return;
		}
		resultsList.innerHTML = "";
		const bounds = L.latLngBounds();
		results.forEach((place) => {
			const latLng = L.latLng(place.lat, place.lon);
			bounds.extend(latLng);
			const marker = addMarkerToMap(place.display_name, place.lat, place.lon);
			addResultToList(place.display_name, marker);
		});
		if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
	};

	const displayOverpassResults = (elements) => {
		if (elements.length === 0) {
			resultsList.innerHTML = '<p class="text-gray-500">No medical facilities found within 5km of your location.</p>';
			return;
		}
		resultsList.innerHTML = "";
		const bounds = L.latLngBounds();
		if (userLocationLayer.getLayers().length > 0) {
			userLocationLayer.eachLayer((layer) => bounds.extend(layer.getLatLng()));
		}
		elements.forEach((element) => {
			const lat = element.lat || element.center.lat;
			const lon = element.lon || element.center.lon;
			const name = element.tags.name || "Medical Facility";
			const type = (element.tags.amenity || "facility").replace(/_/g, " ");

			const latLng = L.latLng(lat, lon);
			bounds.extend(latLng);
			const marker = addMarkerToMap(name, lat, lon);
			addResultToList(`${name} <span class="capitalize text-gray-500 text-xs">(${type})</span>`, marker);
		});
		if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
	};

	const addResultToList = (displayName, marker) => {
		const li = document.createElement("li");
		li.className = "p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50";
		li.innerHTML = `<p class="font-semibold text-gray-800">${displayName.split(",")[0]}</p>
                        <p class="text-sm text-gray-600">${displayName.substring(displayName.indexOf(",") + 1).trim()}</p>`;
		li.addEventListener("click", () => {
			document.querySelectorAll("#results-list li").forEach((item) => item.classList.remove("bg-blue-100"));
			li.classList.add("bg-blue-100");
			map.setView(marker.getLatLng(), 15);
			marker.openPopup();
		});
		resultsList.appendChild(li);
	};

	const addMarkerToMap = (name, lat, lon) => {
		const marker = L.marker([lat, lon]).addTo(searchResultsLayer);
		marker.bindPopup(`<b>${name.split(",")[0]}</b>`);
		return marker;
	};

	const setLoadingState = (isLoading, message = "Searching...") => {
		searchBtn.disabled = isLoading;
		currentLocationBtn.disabled = isLoading;
		searchBtn.textContent = isLoading ? "Searching..." : "Search";
		currentLocationBtn.innerHTML = isLoading
			? message
			: `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>
            Use My Current Location`;
		if (isLoading) resultsList.innerHTML = `<p class="text-gray-500">${message}</p>`;
	};

	const handleSearchError = (error, message = "Could not fetch results. Please try again.") => {
		console.error("Search failed:", error);
		resultsList.innerHTML = `<p class="text-red-500">${message}</p>`;
		setLoadingState(false);
	};

	// --- Event Listeners ---
	searchBtn.addEventListener("click", performTextSearch);
	searchInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") performTextSearch();
	});
	currentLocationBtn.addEventListener("click", searchNearCurrentLocation);
});
