document.addEventListener("DOMContentLoaded", () => {
	marked.use({ breaks: true, gfm: true, smartypants: true });
	marked.setOptions({ breaks: true, gfm: true, smartypants: true });
	const uploadInput = document.getElementById("report-upload-input");
	const previewGrid = document.getElementById("image-preview-grid");
	const generateBtn = document.getElementById("generate-analysis-btn");
	const resultsContainer = document.getElementById("analysis-results-container");
	const resultsContent = document.getElementById("analysis-results-content");

	let uploadedFiles = new Map();

	uploadInput.addEventListener("change", (event) => {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const fileId = Date.now(); // Create a unique ID for the file
			const imageUrl = e.target.result;

			uploadedFiles.set(fileId, file);
			const previewElement = createPreviewElement(fileId, imageUrl);
			previewGrid.appendChild(previewElement);
		};
		reader.readAsDataURL(file);
		uploadInput.value = "";
	});

	function escapeHtml(unsafe) {
		return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}

	function parseSseEvents(sseChunk) {
		const events = [];
		const lines = sseChunk.split("\n");

		let eventType = "data";
		let dataBuffer = [];
		let errorBuffer = [];

		for (const line of lines) {
			if (line.startsWith("event:")) {
				eventType = line.substring(7).trim();
			} else if (line.startsWith("data:")) {
				dataBuffer.push(line.substring(6).trim());
			} else if (line.startsWith("error:")) {
				errorBuffer.push(line.substring(7).trim());
			} else if (line.trim() === "" && dataBuffer.length > 0) {
				const rawData = dataBuffer.join("\n");
				let parsedData = rawData;
				try {
					parsedData = JSON.parse(rawData);
				} catch (error) {
					console.warn("Failed to parse SSE data as JSON");
				}
				events.push({ event: eventType, data: parsedData, error: errorBuffer.join("\n") || null });
				eventType = "data";
				dataBuffer = [];
			}
		}
		return events;
	}

	function createPreviewElement(id, url) {
		const previewItem = document.createElement("div");
		previewItem.classList.add("preview-item", "relative");
		previewItem.setAttribute("data-id", id);

		previewItem.innerHTML = `
            <img class="w-full h-full object-cover" src="${url}" alt="Lab report preview">
            <button class="remove-btn absolute -top-[5px] -right-[5px] w-5 h-5 bg-black/70 text-white border-none rounded-full cursor-pointer text-xs font-bold flex items-center justify-center leading-none" data-id="${id}">${closeIcon}</button>
        `;

		previewItem.querySelector(".remove-btn").addEventListener("click", (event) => {
			event.stopPropagation(); // Prevent any other click events
			const fileId = parseInt(event.currentTarget.dataset.id);

			uploadedFiles.delete(fileId);
			const elementToRemove = document.querySelector(`.preview-item[data-id='${fileId}']`);
			if (elementToRemove) {
				elementToRemove.remove();
			}
		});

		return previewItem;
	}

	generateBtn.addEventListener("click", async () => {
		if (uploadedFiles.size === 0) {
			alert("Please upload at least one lab report image.");
			return;
		}

		const formData = new FormData();
		const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
		formData.append("csrf_token", csrfToken);
		for (const file of uploadedFiles.values()) {
			formData.append("reports", file);
		}
		generateBtn.disabled = true;
		resultsContainer.classList.remove("hidden");
		resultsContent.innerHTML = "Analyzing... Please wait.";
		let fullResponseText = "";

		try {
			const response = await fetch("/api/analyze_reports", { method: "POST", body: formData });

			if (!response.ok) throw new Error(`Server responded with status: ${response.status}. response.statusText: ${response.statusText}`);
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const rawChunk = decoder.decode(value);
				const parsedEvents = parseSseEvents(rawChunk);
				let parsedHtml = null;
				let finalHtml = null;
				for (const event of parsedEvents) {
					switch (event.event) {
						case "data":
							if (event.data && event.data.content) {
								fullResponseText += event.data.content;
								parsedHtml = marked.parse(fullResponseText);
								finalHtml = DOMPurify.sanitize(parsedHtml, {
									ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td"],
								});
								resultsContent.innerHTML = finalHtml;
							}
							break;
						case "end":
							console.log("Stream ended.");
							break;
						case "metadata":
							console.log("Stream Started.");
							console.log("Stream Metadata:", event.data);
							break;
						case "error":
							console.error("Stream Error:", event.data);
							fullResponseText += event.data;
							console.log("fullResponseText:", fullResponseText);
							resultsContent.innerHTML = DOMPurify.sanitize(marked.parse(escapeHtml(fullResponseText).replace(/\n/g, "<br>")));
							return;
					}
				}
			}
			uploadedFiles.clear();
			previewGrid.innerHTML = "";
			generateBtn.disabled = false;
		} catch (error) {
			console.error("Error during analysis:", error);
			resultsContent.innerHTML = "An error occurred during analysis. Please try again.";
		} finally {
			parsedHtml = marked.parse(fullResponseText);
			finalHtml = DOMPurify.sanitize(parsedHtml, {
				ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td"],
			});
			resultsContent.innerHTML = finalHtml;
		}
	});
});
