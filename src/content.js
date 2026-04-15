(function() {
  'use strict';

  let hasKnownAds = false;
  let processingDOM = false;
  let adAction = 'blur';
  let showAiSources = true;
  // Use a WeakMap to prevent the infinite MutationObserver modification loop on text node updating
  const textNodeMemory = new WeakMap();
  const originalPricesMap = new WeakMap();

  const PRICE_REGEX = /([\$₹€£]|USD|INR|EUR|GBP|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/gi;
  const JUST_NUMBER_REGEX = /^([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)$/g;
  
  // Unified Ad Configuration
  const AD_KEYWORDS = ['sponsored', 'ad'];
  const COMMON_AD_SELECTORS = [
    '.sponsor', 
    '.sponsored', 
    '[data-component-type="sp-sponsored-result"]',
    '.s-sponsored-label',
    '.uEierd',
    '[data-text-ad]',
    '[aria-label="Ads"]',
    '[aria-label="Ad"]'
  ];
  
  const SVG_AD_PATHS = [
    'M5.82955 6.45455C5.77841 6.02273' // Flipkart SVG pattern
  ];

  const MAJOR_WRAPPER_SELECTORS = '.s-result-item, .puis-card-container, [data-component-type="s-search-result"], [data-component-type="sp-sponsored-result"], li, [role="listitem"], [data-id], div[data-tkid], .uEierd, .MjjYud, .g, #taw, [data-text-ad]';

  const AI_OVERVIEW_SELECTORS = [
    '#botstuff',
    '.M8OgIe',
    'div[id*="copilot"]',
    '.b_chatResponse',
    '.b_copilotSummary',
    'cib-serp-main',
    '#b_genserp_container',
    '.b_genserp_container',
    '[aria-label="Copilot Search"]'
  ];

  async function checkMemory() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([window.location.host], (result) => {
          resolve(result[window.location.host] === true);
        });
      } else {
        resolve(false);
      }
    });
  }

  async function setMemory(hasAd) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && hasAd) {
      chrome.storage.local.set({ [window.location.host]: true });
    }
  }

  function extractAiSourcesAndInject(container) {
       if (container.hasAttribute('data-free-fall-ai-processed')) return;
       container.setAttribute('data-free-fall-ai-processed', 'true');
       
       const links = Array.from(container.querySelectorAll('a[href]'));
       const rescuedLinks = [];
       const seenUrls = new Set();
       
       links.forEach(a => {
           try {
               const urlObj = new URL(a.href, window.location.href);
               const pathContent = urlObj.pathname + window.location.search;
               if (!urlObj.hostname.includes('google.com') && !pathContent.startsWith('/search') && urlObj.hostname !== window.location.hostname) {
                   let title = a.innerText.trim();
                   if (!title || title.length < 3) title = urlObj.hostname.replace('www.', '');
                   
                   if (title.toLowerCase() !== 'more' && title.length > 3) {
                       const cleanUrl = urlObj.origin + urlObj.pathname;
                       if (!seenUrls.has(cleanUrl)) {
                           seenUrls.add(cleanUrl);
                           rescuedLinks.push({href: a.href, title: title, host: urlObj.hostname.replace('www.', '')});
                       }
                   }
               }
           } catch(e) {}
       });
       
       if (rescuedLinks.length > 0) {
           const card = document.createElement('div');
           card.className = 'free-fall-source-card';
           card.style.fontFamily = 'arial, sans-serif';
           card.style.display = (showAiSources && adAction !== 'show') ? 'block' : 'none';
           card.style.position = 'fixed';
           card.style.top = '120px';
           card.style.right = '30px';
           card.style.width = '320px';
           card.style.zIndex = '999999';
           card.style.padding = '20px';
           card.style.borderRadius = '12px';
           card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
           card.style.maxHeight = '75vh';
           card.style.overflowY = 'auto';
           
           const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
           card.style.backgroundColor = isDark ? '#1f1f1f' : '#ffffff';
           card.style.border = isDark ? '1px solid #3c4043' : '1px solid #dfe1e5';
           
           const linkColor = isDark ? '#8ab4f8' : '#1a0dab';
           const titleColor = isDark ? '#e8eaed' : '#202124';
           const subtitleColor = isDark ? '#9aa0a6' : '#70757a';
           
           let html = `<div style="font-size: 14px; color: ${subtitleColor}; margin-bottom: 12px; font-style: italic;">AI Overview Escaped Sources:</div>`;
           html += `<div style="display: flex; flex-direction: column; gap: 16px;">`;
           
           rescuedLinks.forEach(item => {
               let displayTitle = item.title;
               if (!displayTitle || displayTitle.length < 6 || displayTitle.includes(item.host)) {
                   const pathSegs = item.href.split('/').filter(s => s && s.length > 4);
                   if (pathSegs.length > 0) {
                       displayTitle = decodeURIComponent(pathSegs[pathSegs.length - 1].replace(/[-_]/g, ' '));
                       displayTitle = displayTitle.charAt(0).toUpperCase() + displayTitle.slice(1);
                   }
               }
               
               html += `
                  <div>
                    <div style="font-size: 12px; color: ${titleColor}; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
                        <img src="https://www.google.com/s2/favicons?domain=${item.host}&sz=16" style="width: 16px; height: 16px; border-radius: 50%;" />
                        <span>${item.host}</span>
                    </div>
                    <a href="${item.href}" target="_blank" rel="noopener" style="font-size: 20px; color: ${linkColor}; text-decoration: none; display: block; line-height: 1.3;">
                       ${displayTitle}
                    </a>
                  </div>
               `;
           });
           
           html += `</div>`;
           card.innerHTML = html;
           document.body.appendChild(card);
       }
  }

  // Unified unified ad processing function
  function findAndHideAds() {
    let adsFound = false;

    const hideWrapper = (el) => {
        const wrapper = el.closest(MAJOR_WRAPPER_SELECTORS) || el; // fallback to el if wrapper not found
        if (wrapper && wrapper.getAttribute('data-free-fall-ad') !== 'true') {
            wrapper.setAttribute('data-free-fall-ad', 'true');
            if (adAction === 'remove') {
                wrapper.style.setProperty('display', 'none', 'important');
                wrapper.style.filter = '';
            } else if (adAction === 'show') {
                wrapper.style.display = '';
                wrapper.style.filter = '';
            } else {
                wrapper.style.display = '';
                wrapper.style.filter = 'blur(8px)';
            }
            adsFound = true;
        }
    };

    // 1. Text Nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim().toLowerCase();
        if (!text) continue;

        if (text === 'sponsored' || text === 'ad' || AD_KEYWORDS.includes(text)) {
           let parent = node.parentElement;
           if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
               hideWrapper(parent);
           }
        }
    }

    // 2. Generic Selectors (Classes / Attributes)
    COMMON_AD_SELECTORS.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(hideWrapper);
        } catch (e) {}
    });

    // 3. Accessibility Labels (Aria Label)
    try {
        document.querySelectorAll('[aria-label*="sponsored" i], [aria-label*="Sponsored" i]').forEach(hideWrapper);
    } catch (e) {}

    // 4. SVG Path Data
    try {
        document.querySelectorAll('svg path').forEach(pathEl => {
            const d = pathEl.getAttribute('d');
            if (d) {
                const isAd = SVG_AD_PATHS.some(adPath => d.startsWith(adPath));
                if (isAd) {
                    hideWrapper(pathEl);
                }
            }
        });
    } catch (e) {}

    if (adsFound && !hasKnownAds) {
        hasKnownAds = true;
        setMemory(true);
    }
  }

  function handleAiOverviews() {
    let aiFound = false;

    AI_OVERVIEW_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
         elements.forEach(el => {
          if (el.getAttribute('data-free-fall-ad') !== 'true') {
             el.setAttribute('data-free-fall-ad', 'true');
             extractAiSourcesAndInject(el);
             // Apply ad action to AI block
             if (adAction === 'remove') {
                 el.style.setProperty('display', 'none', 'important');
                 el.style.filter = '';
             } else if (adAction === 'show') {
                 el.style.display = '';
                 el.style.filter = '';
             } else {
                 el.style.display = '';
                 el.style.filter = 'blur(8px)';
             }
             aiFound = true;
          }
        });
      } catch(e) {}
    });

    if (aiFound && !hasKnownAds) {
        hasKnownAds = true;
        setMemory(true);
    }
  }

  // Execute unified scan on Window Load to prevent layout shifts
  window.addEventListener('load', () => {
      findAndHideAds();
      handleAiOverviews();
  });

  // Maintain Mutation observer DOM processing for AI sources and Prices
  function processDOM() {
    if (processingDOM) return;
    processingDOM = true;

    // AI Overviews checking dynamically
    handleAiOverviews();

    // We can still optionally run finding ads dynamically if DOM mutates (e.g. SPAs pagination)
    findAndHideAds();

    // Traversal Process for Prices
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToReplacePrices = [];

    while ((node = walker.nextNode())) {
      const text = node.nodeValue.trim().toLowerCase();
      if (!text) continue;

      const lastWeSet = textNodeMemory.get(node);
      if (lastWeSet !== undefined && lastWeSet === node.nodeValue) {
         continue; 
      }

      // Price Checking
      PRICE_REGEX.lastIndex = 0;
      const textVal = node.nodeValue.trim();
      if (PRICE_REGEX.test(node.nodeValue)) {
        nodesToReplacePrices.push({ node: node, isFull: true });
      } else {
        JUST_NUMBER_REGEX.lastIndex = 0;
        if (JUST_NUMBER_REGEX.test(textVal)) {
          let isPriceNode = false;
          let p = node.parentElement;
          if (p) {
              const cName = (typeof p.className === 'string') ? p.className.toLowerCase() : '';
              if (cName.includes('price') || cName.includes('amount')) {
                  isPriceNode = true;
              } else {
                  const prev = p.previousElementSibling;
                  if (prev && /^[\$₹€£]|USD|INR|EUR|GBP|Rs\.?$/.test(prev.textContent.trim())) {
                      isPriceNode = true;
                  }
              }
          }
          if (isPriceNode) {
              nodesToReplacePrices.push({ node: node, isFull: false });
          }
        }
      }
    }

    // Apply Price Modify logic locally
    nodesToReplacePrices.forEach(item => {
       const textNode = item.node;
       const isFull = item.isFull;
       
       if (!originalPricesMap.has(textNode)) {
           originalPricesMap.set(textNode, textNode.nodeValue);
       }
       
       if (adAction === 'show') {
           const orig = originalPricesMap.get(textNode);
           if (orig && textNode.nodeValue !== orig) {
               textNode.nodeValue = orig;
               textNodeMemory.set(textNode, orig);
           }
           return; 
       }
       
       const regexToUse = isFull ? PRICE_REGEX : JUST_NUMBER_REGEX;
       regexToUse.lastIndex = 0;
       
       const newValue = textNode.nodeValue.replace(regexToUse, (match, p1, p2) => {
          let amountStr = isFull ? p2 : p1;
          let sign = isFull ? p1 : '';
          
          const clean = amountStr.replace(/,/g, '');
          const amountNum = parseFloat(clean);
          if (!isNaN(amountNum)) {
             let added = amountNum;
             if (Math.floor(amountNum) % 10 === 0 && amountNum !== 0) {
                 added += 10;
             } else {
                 added += 1;
             }
             const formatSplit = amountStr.split('.');
             const isDecimal = formatSplit.length > 1;
             
             let formattedAmount = added.toLocaleString('en-US', {
               minimumFractionDigits: isDecimal ? formatSplit[1].length : 0,
               maximumFractionDigits: isDecimal ? formatSplit[1].length : 0
             });

             return `${sign}${formattedAmount}`;
          }
          return match;
       });

       if (newValue !== textNode.nodeValue) {
           textNode.nodeValue = newValue;
           textNodeMemory.set(textNode, newValue);
       } else {
           textNodeMemory.set(textNode, textNode.nodeValue);
       }
    });

    processingDOM = false;
  }

  function observe() {
    let timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        processDOM();
      }, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true 
    });
  }

  async function init() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['adAction', 'showAiSources'], (result) => {
            if (result.adAction) adAction = result.adAction;
            if (result.showAiSources !== undefined) showAiSources = result.showAiSources;
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes.adAction) {
                    adAction = changes.adAction.newValue;
                    processDOM(); 
                    document.querySelectorAll('[data-free-fall-ad="true"]').forEach(el => {
                       if (adAction === 'remove') {
                           el.style.filter = '';
                           el.style.setProperty('display', 'none', 'important');
                       } else if (adAction === 'show') {
                           el.style.display = '';
                           el.style.filter = '';
                       } else {
                           el.style.display = '';
                           el.style.filter = 'blur(8px)';
                       }
                    });
                    document.querySelectorAll('.free-fall-source-card').forEach(el => {
                        el.style.display = (showAiSources && adAction !== 'show') ? 'block' : 'none';
                    });
                }
                if (changes.showAiSources) {
                    showAiSources = changes.showAiSources.newValue;
                    document.querySelectorAll('.free-fall-source-card').forEach(el => {
                        el.style.display = (showAiSources && adAction !== 'show') ? 'block' : 'none';
                    });
                }
            }
        });
    }

    hasKnownAds = await checkMemory();
    // processDOM() will run during init naturally
    processDOM();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
