
const chatToggleBtn = document.getElementById('chatbot-toggle-button');
const chatContainer = document.getElementById('chatbot-container');
const chatBackdrop = document.getElementById('chatbot-backdrop');

chatToggleBtn.addEventListener('click', () => {
    chatContainer.classList.remove('hidden');
    chatContainer.classList.add('flex');
    chatToggleBtn.classList.add('hidden');

    chatBackdrop.classList.remove('hidden');
});

// Optional: Clicking on the backdrop also closes the chatbot
chatBackdrop.addEventListener('click', () => {
    chatContainer.classList.add('hidden');
    chatContainer.classList.remove('flex');
    chatToggleBtn.classList.remove('hidden');
    chatBackdrop.classList.add('hidden');
});