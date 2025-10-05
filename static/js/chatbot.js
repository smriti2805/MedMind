const chatInput = document.getElementById('chatbot-input');
const chatSendBtn = document.getElementById('chatbot-send-button');
const chatMessages = document.getElementById('chatbot-messages');
const chatBotImage = document.getElementById('chatbot-image');

// Handle sending a message when the send button is clicked or Enter is pressed
chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
// /**
//  * Type effect function (word-by-word)
//  * @param {HTMLElement} el - The element where typing will occur
//  * @param {string} html - The HTML string to render
//  * @param {number} speed - Delay (ms) per word
//  */
// function typeEffect(el, html, speed = 100) {
//   // Split string into words (keeping spaces intact)
//   const words = html.split(/(\s+)/); 
//   let index = 0;
//   let current = "";

//   function typeNextWord() {
//     if (index >= words.length) return;
//     current += words[index++];
//     el.innerHTML = current;
//     setTimeout(typeNextWord, speed);
//   }

//   typeNextWord();
// }
// async function sendMessage() {
//     const userMessage = chatInput.value.trim();
//     if (userMessage === '') return; // Don't send empty messages

//     // Display the user's message
//     addMessage(userMessage, 'user');
//     chatInput.value = '';

//     document.getElementById("typing-indicator").classList.toggle("hidden");
//     let botResponse = await queryModel(userMessage)

//     // Display the bot's response after a small delay
//     setTimeout(() => {
//         document.getElementById("typing-indicator").classList.toggle("hidden");
//         addMessage(botResponse.output, 'bot');
//     }, 500);
// }
// function addMessage(text, sender) {
//     const messageDiv = document.createElement('div');

//     // Use Tailwind classes for styling messages
//     messageDiv.classList.add('message', 'text-left', 'flex', 'flex-row', 'gap-1', 'bg-black/20', 'rounded-lg', 'p-2', 'my-1');
//     const avatar = document.createElement('div');
//     avatar.classList.add('size-6');
//     const msgText = document.createElement('div');
//     messageDiv.appendChild(avatar);
//     messageDiv.appendChild(msgText);
//     chatMessages.appendChild(messageDiv);
    
//     if (sender === 'user') {
//         messageDiv.classList.add('self-end', 'flex-row-reverse');
//         avatar.innerHTML = user_avatar
//         msgText.innerHTML = text;
//     } else {
//         avatar.innerHTML = bot_avatar
//         typeEffect(msgText, text, 40);  // 40ms per character
//     }


//     // Scroll to the latest message
//     chatMessages.scrollTop = chatMessages.scrollHeight;
// }
// async function queryModel(prompt) {
//     try {
//         const response = await fetch("http://127.0.0.1:8000/chat/invoke", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//                 "input": prompt,
//                 "config": {},
//                 "kwargs": {}
//             })
//         });
//         if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
//         const data = await response.json();
//         return data;
//     } catch (err) {
//         // Determine the bot's fixed response
//         let botResponse = { "output": "I'm sorry, I can only answer fixed questions like 'hello', 'good morning', or 'how are you?'." };
//         if (prompt.includes('hello') || prompt.includes('hi')) {
//             botResponse.output = "Hello! How can I assist you with your health today?";
//         } else if (prompt.includes('good morning') || prompt.includes('morning')) {
//             botResponse.output = "Good morning! I hope you have a healthy day.";
//         } else if (prompt.includes('how are you') || prompt.includes('how r u')) {
//             botResponse.output = "As an AI, I don't have feelings, but I'm ready to help you with any health-related questions you might have!";
//         }
//         console.error("Fetch failed:", err);
//         return botResponse
//     }
// }


// New function to handle the streaming request to the Flask proxy
async function streamQueryModel(userMessage) {
    const formData = new FormData();
    formData.append('query', userMessage);

    const imageFile = chatImageInput.files[0];
    if (imageFile) {
        formData.append('image_file', imageFile);
    }
    
    const botMsgContainer = addMessage('', 'bot', true); 

    try {
        const response = await fetch('/api/stream_chat', { 
            method: 'POST',
            body: formData
        });

        if (!response.ok) { throw new Error(`Stream failed: ${response.status}`); }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let currentText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            currentText += chunk;
            botMsgContainer.querySelector('.message-text').innerHTML = currentText; 
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

    } catch (error) {
        console.error("Streaming failed:", error);
        botMsgContainer.querySelector('.message-text').innerHTML = 
            `❌ Error: Could not connect to the model. Try again.`;
    }
}

async function sendMessage() {
    const userMessage = chatInput.value.trim();
    if (userMessage === '') return;
    
    addMessage(userMessage, 'user');
    chatInput.value = '';
    chatBotImage.value = '';

    document.getElementById("typing-indicator").classList.toggle("hidden");
    await streamQueryModel(userMessage);
    document.getElementById("typing-indicator").classList.toggle("hidden");
}

function addMessage(text, sender, isStreaming = false) {
    const messageDiv = document.createElement('div');

    messageDiv.classList.add('message', 'text-left', 'flex', 'flex-row', 'gap-1', 'bg-black/20', 'rounded-lg', 'p-2', 'my-1');
    const avatar = document.createElement('div');
    avatar.classList.add('size-6');
    const msgText = document.createElement('div');
    msgText.classList.add('message-text'); 
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(msgText);
    chatMessages.appendChild(messageDiv);
    
    if (sender === 'user') {
        messageDiv.classList.add('self-end', 'flex-row-reverse');
        avatar.innerHTML = user_avatar
        msgText.innerHTML = text;
    } else {
        avatar.innerHTML = bot_avatar;
    }
    return messageDiv; 
}