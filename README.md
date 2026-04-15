# 🪂 Free-Fall: Mindful Browsing Extension

Free-Fall is a Manifest V3 Chrome/Edge extension designed to reduce digital clutter, block algorithmic distractions, and prevent impulse shopping. 

Unlike traditional ad-blockers, Free-Fall is built for "peace of mind." It waits for the page to fully load before safely altering the DOM, ensuring a smooth, layout-shift-free browsing experience.

## ✨ Features
* **Sponsored Content Blocker:** Identifies and completely hides sponsored product cards on e-commerce sites (Amazon, Flipkart) using both text-node scanning and advanced SVG path targeting.
* **AI Overview Hider:** Removes the distracting AI summaries from Google and Bing (`#b_genserp_container`) search results.
* **Impulse Shopping Deterrent:** Automatically modifies the prices on e-commerce sites (e.g., changing $999 to $1000) to break the psychological loop of impulse buying.
* **Smart URL Caching:** Uses `chrome.storage.local` to remember distraction-heavy URLs, applying filters instantly on repeat visits without re-scanning the DOM.
* **Performance Safe:** Utilizes debounced `MutationObservers` to handle Single Page Applications (SPAs) without causing browser lag.

## 🛠️ Development & Build Setup

This project uses a custom Node.js build pipeline with `esbuild` for minification and obfuscation.

### Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/ibexdev-01/free-fall.git](https://github.com/ibexdev-01/free-fall.git)
2Navigate to the directory and install the bundler dependencies:

Bash
cd free-fall
npm install
Building the Extension
To compile the source code for production or testing:

Bash
npm run build
This script will clean the old build, minify src/content.js, bundle the assets into a dist/ directory, and automatically generate an extension-release.zip file ready for the Chrome Web Store.

🚀 How to Load Locally
Run npm run build.

Open your browser and navigate to chrome://extensions/ (or edge://extensions/).

Enable Developer Mode.

Click Load unpacked and select the newly generated dist/ folder.

⚠️ Disclaimer
Do not use this extension while making secure payments or using trading/banking consoles. The DOM manipulation features are designed for casual browsing and may interfere with secure financial forms.


Once you save that file, just run these three commands in your terminal to push it up to GitHub:
1. `git add README.md`
2. `git commit -m "docs: add comprehensive README"`
3. `git push`

Let me know when your Chrome Web Store dashboard updates—I'd love to hear when it gets officially approved! Are you planning to add any of those advanced features (like the opportunity-cost price calculator) for version 2.0?
