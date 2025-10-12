document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    const sendButton = document.getElementById('send-button');

    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            // Prevent the default browser form submission (which causes a page refresh)
            event.preventDefault();

            // Change button text to show it's working
            sendButton.textContent = 'Sending...';
            sendButton.disabled = true;

            // Get the form data
            const formData = new FormData(contactForm);

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (response.ok) {
                    formStatus.textContent = "Thank you! Your message has been sent.";
                    formStatus.className = 'text-green-600';
                    contactForm.reset(); // Clear the form fields
                } else {
                    formStatus.textContent = result.error || 'An unknown error occurred.';
                    formStatus.className = 'text-red-600';
                }
            } catch (error) {
                console.error('Submission error:', error);
                formStatus.textContent = 'A network error occurred. Please try again later.';
                formStatus.className = 'text-red-600';
            } finally {
                // Restore button text
                sendButton.textContent = 'Send Message';
                sendButton.disabled = false;
            }
        });
    }
});