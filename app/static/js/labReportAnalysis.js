// Import the createPreviewElement function from your utility file
import { streamAndRenderResponse, escapeHtml, createPreviewElement } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
    // --- Get Element References ---
    const uploadInput = document.getElementById("report-upload-input");
    const previewGrid = document.getElementById("image-preview-grid");
    const generateBtn = document.getElementById("generate-analysis-btn");
    const resultsContainer = document.getElementById("analysis-results-container");
    const resultsContent = document.getElementById("analysis-results-content");

    let uploadedFiles = new Map();

    // --- Configure Markdown Parser ---
    if (window.marked) {
        marked.setOptions({
            breaks: true,
            gfm: true,
            smartypants: true,
        });
    }

    // --- Event Listeners ---
    uploadInput.addEventListener("change", handleFileSelect);
    generateBtn.addEventListener("click", handleLabReportAnalysis);

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
                
                // Call the imported function and pass the 'uploadedFiles' map
                const previewElement = createPreviewElement(fileId, imageUrl, uploadedFiles);
                previewGrid.appendChild(previewElement);
            };
            reader.readAsDataURL(file);
        }
        uploadInput.value = "";
    }

    // --- Main Handler Function ---
    async function handleLabReportAnalysis() {
        if (uploadedFiles.size === 0) {
            alert("Please upload at least one lab report image.");
            return;
        }

        const formData = new FormData();
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
        formData.append("csrf_token", csrfToken);
        for (const file of uploadedFiles.values()) {
            formData.append("images", file); // Use 'images' to match backend
        }

        // Call the reusable streaming function from utils.js
        await streamAndRenderResponse({
            apiUrl: API_ENDPOINT,
            formData: formData,

            onStart: () => {
                generateBtn.disabled = true;
                generateBtn.textContent = "Analyzing...";
                resultsContainer.classList.remove("hidden");
                resultsContent.innerHTML = "<p>Analyzing, please wait...</p>";
            },

            onChunk: (fullResponseText) => {
                // Live typing effect: render raw, escaped text
                resultsContent.innerHTML = escapeHtml(fullResponseText).replace(/\n/g, "<br>");
            },

            onFinish: (fullResponseText) => {
                // Final render: parse the complete Markdown
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
            },

            onError: (error) => {
                resultsContent.innerHTML = `<p class="text-red-500">An error occurred during analysis: ${escapeHtml(error.message)}</p>`;
            },

            onFinally: () => {
                generateBtn.disabled = false;
                generateBtn.textContent = "Generate Analysis";
            },
        });
    }
});

