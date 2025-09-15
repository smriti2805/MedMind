const chatInput = document.getElementById('chatbot-input');
const chatSendBtn = document.getElementById('chatbot-send-button');
const chatMessages = document.getElementById('chatbot-messages');

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

    let botResponse = await queryModel(userMessage)

    // Display the bot's response after a small delay
    setTimeout(() => {
        addMessage(botResponse.output, 'bot');
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
    msgText.innerHTML    = text;
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(msgText);
    chatMessages.appendChild(messageDiv);

    // Scroll to the latest message
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
async function queryModel(prompt) {
    try {
        const response = await fetch("http://127.0.0.1:8000/chat/invoke", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "input": prompt,
                "config": {},
                "kwargs": {}
            })
        });
        if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
        const data = await response.json();
        return data;
    } catch (err) {
        // Determine the bot's fixed response
        let botResponse = {"output":"I'm sorry, I can only answer fixed questions like 'hello', 'good morning', or 'how are you?'."};
        if (prompt.includes('hello') || prompt.includes('hi')) {
            botResponse.output = "Hello! How can I assist you with your health today?";
        } else if (prompt.includes('good morning') || prompt.includes('morning')) {
            botResponse.output = "Good morning! I hope you have a healthy day.";
        } else if (prompt.includes('how are you') || prompt.includes('how r u')) {
            botResponse.output = "As an AI, I don't have feelings, but I'm ready to help you with any health-related questions you might have!";
        }
        console.error("Fetch failed:", err);
        return botResponse
    }
}