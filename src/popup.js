document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('adAction');
    const aiSourcesToggle = document.getElementById('showAiSources');
    
    // Load existing settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['adAction', 'showAiSources'], (result) => {
            if (result.adAction) {
                select.value = result.adAction;
            }
            if (result.showAiSources !== undefined) {
                aiSourcesToggle.checked = result.showAiSources;
            } else {
                // Default value
                aiSourcesToggle.checked = true;
                chrome.storage.local.set({ showAiSources: true });
            }
        });
    }

    // Save newly selected settings
    select.addEventListener('change', (e) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ adAction: e.target.value });
        }
    });

    aiSourcesToggle.addEventListener('change', (e) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ showAiSources: e.target.checked });
        }
    });
});
