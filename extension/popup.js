document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('title');
    const descInput = document.getElementById('description');
    const webhookInput = document.getElementById('webhook');
    const uploadBtn = document.getElementById('uploadBtn');
    const statusDiv = document.getElementById('status');

    // Load saved webhook URL
    chrome.storage.local.get(['webhookUrl'], (result) => {
        if (result.webhookUrl) {
            webhookInput.value = result.webhookUrl;
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const title = titleInput.value;
        const description = descInput.value;
        const webhookUrl = webhookInput.value;

        if (!title || !webhookUrl) {
            statusDiv.textContent = 'Please fill in Title and Webhook URL';
            statusDiv.style.color = '#ff4444';
            return;
        }

        // Save webhook URL for next time
        chrome.storage.local.set({ webhookUrl });

        statusDiv.textContent = 'Sending to n8n...';
        statusDiv.style.color = '#00ff88';

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                statusDiv.textContent = 'Success! n8n has been triggered.';
            } else {
                statusDiv.textContent = 'Error: ' + response.statusText;
                statusDiv.style.color = '#ff4444';
            }
        } catch (error) {
            statusDiv.textContent = 'Connection failed: ' + error.message;
            statusDiv.style.color = '#ff4444';
        }
    });
});
