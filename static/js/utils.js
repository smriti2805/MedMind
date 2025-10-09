/**
 * A buffering SSE parser that handles messages split across multiple network chunks.
 * It also handles a custom 'error' event type.
 * @param {string} chunk - The raw string chunk from the fetch stream.
 * @returns {Array<object>} An array of parsed event objects.
 */
let sseBuffer = '';
export function parseSseEvents(chunk) {
    sseBuffer += chunk;
    const events = [];

    // Split the buffer by one or more blank lines (handles \n\n, \r\n\r\n, etc.)
    // This is more robust than indexOf('\n\n')
    const messages = sseBuffer.split(/\r?\n\r?\n/);

    // The last item in the array is the potentially incomplete message.
    // We put it back into the buffer for the next chunk. All others are complete.
    sseBuffer = messages.pop() || '';

    for (const message of messages) {
        if (!message) continue; // Skip empty strings that can result from the split

        let eventType = 'data';
        let eventData = '';
        let eventError = '';

        // Also split individual lines by any kind of newline
        for (const line of message.split(/\r?\n/)) {
            if (line.startsWith('event:')) {
                eventType = line.substring(7).trim();
            } else if (line.startsWith('data:')) {
                // SSE allows multiple 'data:' lines, we'll handle by just taking the content.
                // For this app, it seems to be one line of JSON, which this handles.
                eventData = line.substring(6).trim();
            } else if (line.startsWith('error:')) {
                eventError = line.substring(7).trim();
            }
        }

        if (eventData || eventError) {
            let parsedData = eventData;
            try {
                if (eventData) parsedData = JSON.parse(eventData);
            } catch (e) {
                // It might not be JSON (like a simple string from another endpoint), which is fine.
                console.warn("Could not parse SSE data as JSON, using raw string:", eventData);
            }
            events.push({ event: eventType, data: parsedData, error: eventError || null });
        }
    }

    return events;
}


/**
 * Resets the SSE buffer. Should be called before starting a new stream.
 */
export function resetSseBuffer() {
    sseBuffer = '';
}


/**
 * Escapes HTML special characters to prevent XSS attacks.
 * @param {string} unsafe - The raw string to escape.
 * @returns {string} The escaped, safe HTML string.
 */
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * The main reusable function for handling streaming API calls and rendering the response.
 * @param {object} options - The configuration options for the stream.
 * @param {string} options.apiUrl - The API endpoint to call.
 * @param {FormData} options.formData - The data to send in the POST request.
 * @param {function} options.onStart - Callback function to run before the request starts.
 * @param {function(string): void} options.onChunk - Callback function for each new piece of text data. Receives the accumulated text.
 * @param {function(string): void} options.onFinish - Callback function for when the stream finishes successfully. Receives the final, complete text.
 * @param {function(Error): void} options.onError - Callback function for handling any errors.
 * @param {function(): void} options.onFinally - Callback function that runs at the very end, regardless of success or failure.
 */
export async function streamAndRenderResponse({ apiUrl, formData, onStart, onChunk, onFinish, onError, onFinally }) {
    try {
        resetSseBuffer();
        onStart?.();

        const response = await fetch(apiUrl, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponseText = "";

        while (true) {
            const { done, value } = await reader.read();
            
            // ✅ FIX 1: Tell the decoder you are in a stream.
            const rawChunk = decoder.decode(value, { stream: !done });
            
            // The 'done' flag will be passed to the parser to handle the final chunk.
            const parsedEvents = parseSseEvents(rawChunk, done);

            for (const event of parsedEvents) {
                if (event.event === "data" && event.data && event.data.content) {
                    fullResponseText += event.data.content;
                    onChunk?.(fullResponseText);
                } else if (event.event === "error") {
                    throw new Error(event.data || "An unknown stream error occurred.");
                }
            }

            if (done) break;
        }
        
        onFinish?.(fullResponseText);

    } catch (error) {
        console.error('Streaming or analysis failed:', error);
        onError?.(error);
    } finally {
        onFinally?.();
    }
}


/**
 * Creates and returns a DOM element for an image preview with a remove button.
 * @param {number} id - The unique ID for this file.
 * @param {string} url - The data URL for the image preview.
 * @param {Map} filesMap - The Map object where uploaded files are stored.
 * @returns {HTMLElement} The created preview element.
 */
export function createPreviewElement(id, url, filesMap) {
    const previewItem = document.createElement("div");
    previewItem.className = "relative w-full pt-[100%] rounded-lg overflow-hidden bg-gray-100";
    previewItem.setAttribute("data-id", id);

    previewItem.innerHTML = `
        <img src="${url}" alt="Upload preview" class="absolute top-0 left-0 w-full h-full object-cover">
        <button class="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-500 transition-colors" data-id="${id}">&times;</button>
    `;

    previewItem.querySelector("button").addEventListener("click", (event) => {
        event.stopPropagation();
        const fileId = parseFloat(event.currentTarget.dataset.id);
        
        // Use the passed-in filesMap to delete the file
        filesMap.delete(fileId);
        
        // Find and remove the element from the DOM
        const elementToRemove = document.querySelector(`.relative[data-id='${fileId}']`);
        if (elementToRemove) elementToRemove.remove();
    });

    return previewItem;
}

