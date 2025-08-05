
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Enhanced search function
function performSearch(query) {
  
  if (!query || query.trim().length < 1) {
    clearResults();
    return;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  chrome.storage.local.get("queryflow_messages", (data) => {
    if (chrome.runtime.lastError) {
      console.error("❌ Error retrieving messages:", chrome.runtime.lastError);
      showError("Error loading messages");
      return;
    }

    const allMessages = data.queryflow_messages || [];
    
    if (allMessages.length === 0) {
      showNoData();
      return;
    }

    // Enhanced filtering with better matching
    const filtered = allMessages.filter(msg => {
      if (!msg || typeof msg !== 'string') return false;
      return msg.toLowerCase().includes(normalizedQuery);
    });
    
    displayResults(filtered, normalizedQuery);
  });
}

// Display search results with highlighting
function displayResults(results, query) {
  const resultsContainer = document.getElementById("results");
  
  if (!resultsContainer) {
    console.error("❌ Results container not found");
    return;
  }

  resultsContainer.innerHTML = ""; // Clear previous results
  
  if (results.length === 0) {
    showNoResults(query);
    return;
  }

  // Add results count
  const countEl = document.createElement("div");
  countEl.className = "results-count";
  countEl.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
  resultsContainer.appendChild(countEl);

  // Create results list
  const ul = document.createElement("ul");
  ul.className = "results-list";
  
  results.forEach((msg, index) => {
    const li = document.createElement("li");
    li.className = "result-item";
    
    // Highlight matching text
    const highlightedText = highlightMatch(msg, query);
    li.innerHTML = highlightedText;
    
    // Add click handler for potential actions
    li.addEventListener("click", () => handleResultClick(msg, index));
    
    ul.appendChild(li);
  });
  
  resultsContainer.appendChild(ul);
}

// Highlight matching text in results
function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text);
  
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  return escapedText.replace(regex, '<mark>$1</mark>');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// Show different states
function clearResults() {
  const resultsContainer = document.getElementById("results");
  if (resultsContainer) {
    resultsContainer.innerHTML = "";
  }
}

function showNoResults(query) {
  const resultsContainer = document.getElementById("results");
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="no-results">
        <p>No results found for "${escapeHtml(query)}"</p>
        <p class="suggestion">Try different keywords or check your spelling</p>
      </div>
    `;
  }
}

function showNoData() {
  const resultsContainer = document.getElementById("results");
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="no-data">
        <p>No messages available</p>
        <p class="suggestion">Visit some pages to collect messages first</p>
      </div>
    `;
  }
}

function showError(message) {
  const resultsContainer = document.getElementById("results");
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="error">
        <p>⚠️ ${escapeHtml(message)}</p>
      </div>
    `;
  }
}

// Create debounced search function (300ms delay)
const debouncedSearch = debounce(performSearch, 300);

// Initialize search functionality
function initializeSearch() {
  const searchInput = document.getElementById("searchInput");
  
  if (!searchInput) {
    console.error("❌ Search input not found");
    return;
  }

  // Add input event listener with debouncing
  searchInput.addEventListener("input", function(event) {
    const query = event.target.value;
    debouncedSearch(query);
  });

  // Add enter key support for immediate search
  searchInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      performSearch(event.target.value);
    }
  });

  // Add clear button functionality (if exists)
  const clearButton = document.getElementById("clearSearch");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      clearResults();
      searchInput.focus();
    });
  }

  console.log("🔍 Search functionality initialized");
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
  initializeSearch();
}

// Optional: Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
  // Focus search input with Ctrl/Cmd + F
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault();
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
});

// Improved Popup.js for Chrome Extension

function handleResultClick(message, index) {
  console.log("🖱️ Scrolling to:", message);
  
  // Show loading state
  showScrollFeedback("🔄 Scrolling to message...", "loading");
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      showScrollFeedback("❌ No active tab found", "error");
      return;
    }
    
    const activeTab = tabs[0];
    
    // Check if tab is a valid web page (not chrome:// or extension pages)
    if (!isValidWebPage(activeTab.url)) {
      showScrollFeedback("❌ Cannot scroll on this page type", "error");
      return;
    }
    
    chrome.tabs.sendMessage(activeTab.id, {
      action: "scrollToMessage",
      message: message
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("⚠️ Could not send message to content script:", chrome.runtime.lastError.message);
        
        // More specific error messages
        if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
          showScrollFeedback("❌ Extension not loaded on this page", "error");
        } else {
          showScrollFeedback("❌ Communication error with page", "error");
        }
      } else if (response?.success) {
        showScrollFeedback("✅ Found and scrolled to message!", "success");
        
        // Optional: Close popup after successful scroll (uncomment if desired)
        // setTimeout(() => window.close(), 1000);
      } else {
        const errorMsg = response?.error || "Message not found on current page";
        showScrollFeedback(`❌ ${errorMsg}`, "error");
      }
    });
  });
}

// Check if URL is a valid web page for content script injection
function isValidWebPage(url) {
  if (!url) return false;
  
  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about:',
    'file://'
  ];
  
  return !invalidPrefixes.some(prefix => url.startsWith(prefix));
}

// Enhanced feedback system
function showScrollFeedback(message, type = "info") {
  // Remove existing feedback
  const existingFeedback = document.querySelector('.scroll-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `scroll-feedback scroll-feedback--${type}`;
  feedback.textContent = message;
  
  // Style based on type
  const styles = {
    base: {
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      zIndex: '10000',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      maxWidth: '280px',
      textAlign: 'center'
    },
    success: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    error: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    loading: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb'
    },
    info: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb'
    }
  };

  // Apply styles
  Object.assign(feedback.style, styles.base, styles[type] || styles.info);

  // Add to page
  document.body.appendChild(feedback);

  // Auto remove after delay (longer for errors)
  const delay = type === 'error' ? 4000 : type === 'loading' ? 2000 : 3000;
  
  const removeTimeout = setTimeout(() => {
    feedback.style.opacity = '0';
    feedback.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove();
      }
    }, 300);
  }, delay);

  // Allow manual dismissal by clicking
  feedback.addEventListener('click', () => {
    clearTimeout(removeTimeout);
    feedback.style.opacity = '0';
    feedback.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove();
      }
    }, 300);
  });
}

// Enhanced result click handler with visual feedback
function enhancedHandleResultClick(message, index, resultElement) {
  // Add visual feedback to clicked item
  if (resultElement) {
    resultElement.style.backgroundColor = '#e3f2fd';
    resultElement.style.transform = 'scale(0.98)';
    
    setTimeout(() => {
      resultElement.style.backgroundColor = '';
      resultElement.style.transform = '';
    }, 200);
  }
  
  // Call the main handler
  handleResultClick(message, index);
}

// Utility function to add click handlers to results (call this when creating results)
function addClickHandlersToResults() {
  document.querySelectorAll('.result-item').forEach((item, index) => {
    if (!item.dataset.clickHandlerAdded) {
      const message = item.textContent.replace(/^Found \d+ results?/, '').trim();
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        enhancedHandleResultClick(message, index, item);
      });
      
      // Add keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enhancedHandleResultClick(message, index, item);
        }
      });
      
      // Make focusable
      item.setAttribute('tabindex', '0');
      item.dataset.clickHandlerAdded = 'true';
    }
  });
}

// Add retry functionality
function retryScroll(message, maxRetries = 2) {
  let attempts = 0;
  
  function attempt() {
    attempts++;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "scrollToMessage",
        message: message
      }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          if (attempts < maxRetries) {
            showScrollFeedback(`🔄 Retrying... (${attempts}/${maxRetries})`, "loading");
            setTimeout(attempt, 1000);
          } else {
            showScrollFeedback("❌ Could not locate message after retries", "error");
          }
        } else {
          showScrollFeedback("✅ Message found and scrolled to!", "success");
        }
      });
    });
  }
  
  attempt();
}

// Add this to your search results display function
function displayResults(results, query) {
  const resultsContainer = document.getElementById("results");
  
  if (!resultsContainer) {
    console.error("❌ Results container not found");
    return;
  }

  resultsContainer.innerHTML = "";
  
  if (results.length === 0) {
    showNoResults(query);
    return;
  }

  // Add results count
  const countEl = document.createElement("div");
  countEl.className = "results-count";
  countEl.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
  resultsContainer.appendChild(countEl);

  // Create results list
  const ul = document.createElement("ul");
  ul.className = "results-list";
  
  results.forEach((msg, index) => {
    const li = document.createElement("li");
    li.className = "result-item";
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Click to scroll to message: ${msg}`);
    
    // Highlight matching text
    const highlightedText = highlightMatch(msg, query);
    li.innerHTML = highlightedText;
    
    // Add click handler
    li.addEventListener("click", (e) => {
      e.preventDefault();
      enhancedHandleResultClick(msg, index, li);
    });
    
    // Add keyboard support
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        enhancedHandleResultClick(msg, index, li);
      }
    });
    
    ul.appendChild(li);
  });
  
  resultsContainer.appendChild(ul);
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 Popup initialized");
  
  // Add global error handler
  window.addEventListener('error', function(e) {
    console.error('Popup error:', e.error);
    showScrollFeedback("❌ An error occurred", "error");
  });
});