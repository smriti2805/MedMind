// 1. Import the shared functions from your utility file.
import { streamAndRenderResponse, escapeHtml, createPreviewElement } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
	// --- Get Element References ---
	const textInput = document.getElementById("symptom-text-input");
	const imageUploadInput = document.getElementById("symptom-image-upload-input");
	const previewGrid = document.getElementById("symptom-image-preview-grid");
	const checkSymptomsBtn = document.getElementById("check-symptoms-btn");
	const resultsContainer = document.getElementById("symptom-results-container");
	const resultsContent = document.getElementById("symptom-results-content");

	// Use a Map to easily add/remove files by a unique ID
	let uploadedFiles = new Map();

	// --- Configure Markdown Parser (this is global and fine here) ---
	if (window.marked) {
		marked.setOptions({
			breaks: true,
			gfm: true,
			smartypants: true,
		});
	}

	// --- Event Listeners ---
	imageUploadInput.addEventListener("change", handleFileSelect);
	checkSymptomsBtn.addEventListener("click", handleSymptomCheck);

	// --- Page-Specific UI Functions ---
	function handleFileSelect(event) {
		const files = event.target.files;
		if (!files.length) return;

		for (const file of files) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const fileId = Date.now() + Math.random();
				const imageUrl = e.target.result;
				uploadedFiles.set(fileId, file);
				const previewElement = createPreviewElement(fileId, imageUrl, uploadedFiles);
				previewGrid.appendChild(previewElement);
			};
			reader.readAsDataURL(file);
		}
		imageUploadInput.value = "";
	}

	// --- Main Handler Function ---
	async function handleSymptomCheck() {
		if (textInput.value.trim() === "" && uploadedFiles.size === 0) {
			alert("Please describe your symptoms or upload at least one image.");
			return;
		}

		const formData = new FormData();
		const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
		formData.append("csrf_token", csrfToken);
		formData.append("query", textInput.value.trim());
		for (const file of uploadedFiles.values()) {
			formData.append("images", file);
		}

		// 2. Call the reusable streaming function from utils.js with the correct callback structure
		await streamAndRenderResponse({
			apiUrl: API_ENDPOINT,
			formData: formData,

			onStart: () => {
				checkSymptomsBtn.disabled = true;
				checkSymptomsBtn.textContent = "Analyzing...";
				resultsContainer.classList.remove("hidden");
				resultsContent.innerHTML = "<p>Please wait while we analyze your symptoms...</p>";
			},

			onChunk: (fullResponseText) => {
				resultsContent.innerHTML = escapeHtml(fullResponseText).replace(/\n/g, "<br>");
			},

			onFinish: (fullResponseText) => {
				if (window.marked && window.DOMPurify) {
					const finalHtml = marked.parse(fullResponseText);
					const cleanHtml = DOMPurify.sanitize(finalHtml, { ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td"] });
					resultsContent.innerHTML = cleanHtml;
				} else {
					resultsContent.textContent = fullResponseText;
				}
				// Clear inputs on success
				uploadedFiles.clear();
				previewGrid.innerHTML = "";
				textInput.value = "";
			},

			onError: (error) => {
				resultsContent.innerHTML = `<p class="text-red-500">An error occurred during analysis: ${escapeHtml(error.message)}</p>`;
			},

			onFinally: () => {
				checkSymptomsBtn.disabled = false;
				checkSymptomsBtn.textContent = "Check Symptoms";
			},
		});
	}
});
