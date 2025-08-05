
function extractMessages() {
  try {
    const messages = Array.from(document.querySelectorAll("div[data-message-id]"))
      .map(el => el.innerText?.trim()) // Added trim() and optional chaining
      .filter(text => text && text.length > 0); // More robust filtering
    
    console.log("📥 Extracted messages:", messages);
    
    // Check if chrome.storage is available
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ queryflow_messages: messages }, () => {
        if (chrome.runtime.lastError) {
          console.error("❌ Error saving messages:", chrome.runtime.lastError);
        } else {
          console.log("✅ Messages saved to storage");
        }
      });
    } else {
      console.warn("⚠️ Chrome storage API not available");
    }
  } catch (error) {
    console.error("❌ Error extracting messages:", error);
  }
}

// Debounce function to prevent excessive calls
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

// Debounced version of extractMessages
const debouncedExtractMessages = debounce(extractMessages, 500);

// Create observer with better performance
const observer = new MutationObserver((mutations) => {
  // Only trigger if there are actual changes to elements with data-message-id
  const hasRelevantChanges = mutations.some(mutation => 
    Array.from(mutation.addedNodes).some(node => 
      node.nodeType === Node.ELEMENT_NODE && 
      (node.matches?.('div[data-message-id]') || 
       node.querySelector?.('div[data-message-id]'))
    )
  );
  
  if (hasRelevantChanges) {
    console.log("🔄 Relevant DOM changes detected. Re-extracting...");
    debouncedExtractMessages();
  }
});

// Start observing when DOM is ready
function initializeExtension() {
  console.log("🚀 Initializing QueryFlow extension...");
  
  // Initial extraction
  extractMessages();
  
  // Start observing changes
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: false // Don't watch attribute changes unless needed
  });
  
  console.log("👀 Observer started");
}

// Handle different loading states
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // DOM is already loaded
  initializeExtension();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect();
    console.log("🧹 Observer disconnected");
  }
});

// Optional: Add a way to manually trigger extraction
window.queryflowExtract = extractMessages;


// Enhanced Scroll to Message Functionality

// Listen for scroll requests from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrollToMessage" && request.message) {
    scrollToMessageOnPage(request.message, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

// Function to scroll to message on the current page
function scrollToMessageOnPage(targetMessage, callback) {
  try {
    const allMessages = Array.from(document.querySelectorAll("div[data-message-id]"));
    
    if (allMessages.length === 0) {
      console.warn("⚠️ No messages found on page");
      callback?.({ success: false, error: "No messages found" });
      return;
    }

    // Try exact match first
    let target = allMessages.find(el => 
      el.innerText?.trim() === targetMessage.trim()
    );

    // If no exact match, try partial match
    if (!target) {
      target = allMessages.find(el => 
        el.innerText?.trim().includes(targetMessage.trim())
      );
    }

    if (target) {
      // Scroll to the message
      target.scrollIntoView({ 
        behavior: "smooth", 
        block: "center",
        inline: "nearest"
      });
      
      // Enhanced highlighting effect
      highlightMessage(target);
      
      console.log("✅ Scrolled to message successfully");
      callback?.({ success: true });
    } else {
      console.warn("⚠️ Message not found on page:", targetMessage);
      callback?.({ success: false, error: "Message not found" });
    }
  } catch (error) {
    console.error("❌ Error scrolling to message:", error);
    callback?.({ success: false, error: error.message });
  }
}

// Enhanced highlighting function
function highlightMessage(element) {
  // Remove any existing highlight classes
  document.querySelectorAll('.queryflow-highlight').forEach(el => {
    el.classList.remove('queryflow-highlight');
  });

  // Add highlight class for CSS-based styling
  element.classList.add('queryflow-highlight');
  
  // Fallback inline styling if no CSS
  const originalBg = element.style.backgroundColor;
  const originalTransition = element.style.transition;
  
  element.style.transition = "all 0.3s ease";
  element.style.backgroundColor = "#fff3cd";
  element.style.boxShadow = "0 0 0 3px rgba(255, 193, 7, 0.25)";
  element.style.borderRadius = "4px";
  
  // Pulse effect
  setTimeout(() => {
    element.style.backgroundColor = "#fff3cd";
    element.style.transform = "scale(1.02)";
  }, 100);
  
  setTimeout(() => {
    element.style.transform = "scale(1)";
  }, 400);
  
  // Remove highlight after delay
  setTimeout(() => {
    element.style.transition = "all 0.6s ease";
    element.style.backgroundColor = originalBg;
    element.style.boxShadow = "";
    element.style.borderRadius = "";
    element.classList.remove('queryflow-highlight');
    
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 600);
  }, 2000);
}

// Update the handleResultClick function from the search code
function handleResultClick(message, index) {
  console.log("🖱️ Result clicked:", { message, index });
  
  // Check if we're in a popup (has chrome.tabs API)
  if (chrome.tabs) {
    // We're in popup - send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "scrollToMessage",
          message: message
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Error sending message:", chrome.runtime.lastError);
            showScrollError("Could not communicate with page");
          } else if (response?.success) {
            console.log("✅ Successfully scrolled to message");
            showScrollSuccess();
          } else {
            console.warn("⚠️ Message not found on page");
            showScrollError("Message not found on current page");
          }
        });
      }
    });
  } else {
    // We're in content script - scroll directly
    scrollToMessageOnPage(message);
  }
}

// UI feedback functions for popup
function showScrollSuccess() {
  showScrollFeedback("✅ Scrolled to message", "success");
}

function showScrollError(message) {
  showScrollFeedback(`❌ ${message}`, "error");
}

function showScrollFeedback(message, type) {
  // Remove existing feedback
  const existingFeedback = document.querySelector('.scroll-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `scroll-feedback scroll-feedback--${type}`;
  feedback.textContent = message;
  
  // Style the feedback
  Object.assign(feedback.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: '10000',
    transition: 'all 0.3s ease',
    backgroundColor: type === 'success' ? '#d4edda' : '#f8d7da',
    color: type === 'success' ? '#155724' : '#721c24',
    border: `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
  });

  document.body.appendChild(feedback);

  // Auto remove after 3 seconds
  setTimeout(() => {
    feedback.style.opacity = '0';
    feedback.style.transform = 'translateX(100%)';
    setTimeout(() => feedback.remove(), 300);
  }, 3000);
}

// Alternative: Copy message to clipboard on right-click
document.addEventListener('contextmenu', function(event) {
  const resultItem = event.target.closest('.result-item');
  if (resultItem) {
    event.preventDefault();
    
    const message = resultItem.textContent;
    navigator.clipboard.writeText(message).then(() => {
      showScrollFeedback("📋 Copied to clipboard", "success");
    }).catch(() => {
      showScrollFeedback("❌ Could not copy", "error");
    });
  }
});

// Add keyboard shortcut for quick scroll (Enter key on focused result)
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const focusedResult = document.activeElement;
    if (focusedResult && focusedResult.classList.contains('result-item')) {
      const message = focusedResult.textContent;
      handleResultClick(message, 0);
    }
  }
});