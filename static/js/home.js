
const chatToggleBtn = document.getElementById('chatbot-toggle-button');
const chatContainer = document.getElementById('chatbot-container');
const chatCloseBtn = document.getElementById('chatbot-close-button');
const chatMessages = document.getElementById('chatbot-messages');
const chatInput = document.getElementById('chatbot-input');
const chatSendBtn = document.getElementById('chatbot-send-button');
const chatBackdrop = document.getElementById('chatbot-backdrop');

chatToggleBtn.addEventListener('click', () => {
    chatContainer.classList.remove('hidden');
    chatContainer.classList.add('flex');
    chatToggleBtn.classList.add('hidden');

    chatBackdrop.classList.remove('hidden');
});

chatCloseBtn.addEventListener('click', () => {
    chatContainer.classList.add('hidden');
    chatContainer.classList.remove('flex');
    chatToggleBtn.classList.remove('hidden');

    chatBackdrop.classList.add('hidden');
});

// Optional: Clicking on the backdrop also closes the chatbot
chatBackdrop.addEventListener('click', () => {
    chatContainer.classList.add('hidden');
    chatContainer.classList.remove('flex');
    chatToggleBtn.classList.remove('hidden');
    chatBackdrop.classList.add('hidden');
});

// Handle sending a message when the send button is clicked or Enter is pressed
chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const userMessage = chatInput.value.trim().toLowerCase();
    if (userMessage === '') return; // Don't send empty messages

    // Display the user's message
    addMessage(userMessage, 'user');
    chatInput.value = '';

    // Determine the bot's fixed response
    let botResponse = "I'm sorry, I can only answer fixed questions like 'hello', 'good morning', or 'how are you?'.";
    botResponse = await queryModel(userMessage)

    // Display the bot's response after a small delay
    setTimeout(() => {
        addMessage(botResponse, 'bot');
    }, 500);
}
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');

    // Use Tailwind classes for styling messages
    messageDiv.classList.add('message', 'text-left', 'flex', 'flex-row', 'gap-1', 'bg-black/20', 'rounded-lg', 'p-2', 'my-1');
    const avatar = document.createElement('div');
    avatar.classList.add('size-6');

    if (sender === 'user') {
        messageDiv.classList.add('self-end', 'flex-row-reverse');
        avatar.innerHTML = user_avatar
    } else {
        avatar.innerHTML = bot_avatar
    }

    const msgText = document.createElement('div');
    msgText.textContent = text;
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(msgText);
    chatMessages.appendChild(messageDiv);

    // Scroll to the latest message
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
async function queryModel(prompt) {
    try {
        const response = await fetch("http://localhost:8000/api/v1/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: prompt })
        });
        if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Fetch failed:", err);

        if (userMessage.includes('hello') || userMessage.includes('hi')) {
            botResponse = "Hello! How can I assist you with your health today?";
        } else if (userMessage.includes('good morning') || userMessage.includes('morning')) {
            botResponse = "Good morning! I hope you have a healthy day.";
        } else if (userMessage.includes('how are you') || userMessage.includes('how r u')) {
            botResponse = "As an AI, I don't have feelings, but I'm ready to help you with any health-related questions you might have!";
        }
    }
}