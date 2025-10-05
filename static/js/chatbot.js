document.addEventListener("DOMContentLoaded", () => {
	marked.use({ breaks: true, gfm: true, smartypants: true });
	const chatInput = document.getElementById("chatbot-input");
	const chatSendBtn = document.getElementById("chatbot-send-button");
	const chatMessages = document.getElementById("chatbot-messages");
	const chatImageInput = document.getElementById("chatbot-image-input");
	const previewContainer = document.getElementById("image-preview-container");

	chatSendBtn.addEventListener("click", sendMessage);
	chatInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") sendMessage();
	});

	chatImageInput.addEventListener("change", function (event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function (e) {
				previewContainer.innerHTML = `
                <img id="image-preview" class="w-full h-full object-cover" src="${e.target.result}" alt="Image preview">
                <button id="remove-image-btn" class="absolute -top-[5px] -right-[5px] w-5 h-5 bg-black/70 text-white border-none rounded-full cursor-pointer text-xs font-bold flex items-center justify-center leading-none" title="Remove image">×</button>
            `;
				previewContainer.classList.remove("hidden");
				document.getElementById("remove-image-btn").addEventListener("click", function () {
					previewContainer.innerHTML = "";
					previewContainer.classList.add("hidden");
					chatImageInput.value = null;
				});
			};
			reader.readAsDataURL(file);
		}
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

	async function streamQueryModel(userMessage, imageFile = null) {
		const formData = new FormData();
		const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");

		formData.append("csrf_token", csrfToken);
		formData.append("query", userMessage);
		if (imageFile) formData.append("image_file", imageFile);

		const botMessageElements = addMessage("", "bot");
		let fullResponseText = "";

		try {
			const response = await fetch(api_url, { method: "POST", body: formData });
			if (!response.ok) throw new Error(`Stream failed: ${response.status}`);
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const rawChunk = decoder.decode(value);
				const parsedEvents = parseSseEvents(rawChunk);
				for (const event of parsedEvents) {
					switch (event.event) {
						case "data":
							if (event.data && event.data.content) {
								fullResponseText += event.data.content;
								if (botMessageElements.typingIndicator) botMessageElements.typingIndicator.remove();
								parsedHtml = marked.parse(escapeHtml(fullResponseText).replace(/\n/g, "<br>"));
								console.log(parsedHtml);
								botMessageElements.textSpan.innerHTML = DOMPurify.sanitize(parsedHtml, {
									ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td"],
								});
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
							if (botMessageElements.typingIndicator) botMessageElements.typingIndicator.remove();
							parsedHtml = marked.parse(escapeHtml(fullResponseText).replace(/\n/g, "<br>"));
							botMessageElements.textSpan.innerHTML = DOMPurify.sanitize(parsedHtml, {
								ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td"],
							});
							return;
					}
					chatMessages.scrollTop = chatMessages.scrollHeight;
				}
			}
		} catch (error) {
			botMessageElements.textSpan.innerHTML = `❌ Error: Could not connect to the model. Try again.`;
			console.error("Streaming failed:", error);
		} finally {
			const finalHtml = marked.parse(fullResponseText);
			const cleanHtml = DOMPurify.sanitize(finalHtml, { ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td"] });
			botMessageElements.textSpan.innerHTML = cleanHtml;

			if (botMessageElements.typingIndicator) botMessageElements.typingIndicator.remove();
		}
	}

	async function sendMessage() {
		const userMessage = chatInput.value.trim();
		if (userMessage === "") return;
		const imageFile = chatImageInput.files[0];

		addMessage(userMessage, "user", imageFile);
		chatInput.value = "";
		chatImageInput.value = "";
		previewContainer.innerHTML = "";
		previewContainer.classList.add("hidden");
		await streamQueryModel(userMessage, imageFile);
	}

	function addMessage(text, sender, imageFile = null) {
		// Create the main message bubble
		const messageDiv = document.createElement("div");
		messageDiv.className = `message ${sender}-message text-left flex flex-row gap-1 bg-black/20 rounded-lg p-2 my-1`;

		// Bot Avatar
		const avatarDiv = document.createElement("div");
		avatarDiv.className = "size-6";

		// Content container (for text and indicator)
		const contentDiv = document.createElement("div");
		contentDiv.className = "flex flex-col items-center justify-center"; // Use flex to align text and dots

		if (imageFile) {
			const img = document.createElement("img");
			img.src = URL.createObjectURL(imageFile);
			img.onload = () => URL.revokeObjectURL(img.src);
			const imageDiv = document.createElement("div");
			imageDiv.className = "w-96";
			imageDiv.appendChild(img);
			contentDiv.appendChild(imageDiv);
			contentDiv.className = "flex flex-col items-right"; // Use flex to align text and dots
		}

		if (sender === "user") {
			messageDiv.classList.add("self-end", "flex-row-reverse");
			avatarDiv.innerHTML = user_avatar;
		} else {
			avatarDiv.innerHTML = bot_avatar;
		}

		// Text Span (where streaming text will appear)
		const textSpan = document.createElement("span");
		textSpan.className = "message-text inline";
		textSpan.innerHTML = text;

		// Typing Indicator (only for bot messages)
		let typingIndicator = null;
		if (sender === "bot") {
			typingIndicator = document.createElement("div");
			typingIndicator.className = "flex items-center gap-1 mx-[5px]";

			typingIndicator.innerHTML = `
<span class="inline-block h-2 w-2 rounded-full bg-gray-600 animate-dot-pulse [animation-fill-mode:both] [animation-delay:-0.32s]"></span>
<span class="inline-block h-2 w-2 rounded-full bg-gray-600 animate-dot-pulse [animation-fill-mode:both] [animation-delay:-0.16s]"></span>
<span class="inline-block h-2 w-2 rounded-full bg-gray-600 animate-dot-pulse [animation-fill-mode:both]"></span>
`;
		}

		// Assemble the message bubble
		contentDiv.appendChild(textSpan);
		if (typingIndicator) {
			contentDiv.appendChild(typingIndicator);
		}

		messageDiv.appendChild(avatarDiv);
		messageDiv.appendChild(contentDiv);

		chatMessages.appendChild(messageDiv);
		chatMessages.scrollTop = chatMessages.scrollHeight;

		return {
			messageDiv: messageDiv,
			textSpan: textSpan,
			typingIndicator: typingIndicator,
		};
	}

	function simulateTyping(textElement, fullText, speed = 30) {
		const words = fullText.split(/(\s+)/); // Split by spaces/newlines but keep them
		let i = 0;
		const typingSpeed = speed;
		textElement.innerHTML = "";
		const typer = setInterval(() => {
			if (i < words.length) {
				textElement.innerHTML += words[i];
				i++;
				chatMessages.scrollTop = chatMessages.scrollHeight;
			} else {
				// Typing is finished, so stop the interval
				clearInterval(typer);
				// Finalize the content by rendering the full Markdown into HTML
				// This ensures lists, bolding, etc., are displayed correctly.
				textElement.innerHTML = marked.parse(fullText);
				chatMessages.scrollTop = chatMessages.scrollHeight;
			}
		}, typingSpeed);
	}
});
