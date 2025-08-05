"# InChat-Finder" 

**InChat-Finder** is a Chrome extension that lets you **search, highlight, and instantly jump** to specific questions, answers, or keywords inside long conversations with AI tools like ChatGPT, Claude, Gemini, etc.

Say goodbye to endless scrolling. Find what matters — instantly.

---

## 🚀 Features

- 🔎 Real-time search inside chat windows
- ✨ Highlights matching questions/answers
- 🧭 Click to jump directly to the matched message
- 🧠 Works with most web-based AI tools (ChatGPT, Gemini, Claude, etc.)
- ⚡ Fast, lightweight, and privacy-focused

---

## 📦 How to Install

1. **Clone or Download the Repo**  
   ```bash
   https://github.com/Prabhat0018/InChat-Finder.git

2. Open Chrome and go to
chrome://extensions/


3. Enable Developer Mode (top-right toggle)


4. Click “Load unpacked” and select the queryflow-extension/ folder


5. Pin the extension to your Chrome toolbar for easy access




---

🛠️ How to Use

1. Open a long conversation in ChatGPT (or any supported AI tool).


2. Click on the 🟦 In Chat -Finder extension icon in the toolbar.


3. Enter a keyword, phrase, or part of your question/answer.


4. See the matched results instantly with highlights.


5. Click any result to auto-scroll to the exact message in the chat.




---

📐 How It Works (Under the Hood)

In chat -finder uses a simple but effective DOM traversal and matching strategy:

🔧 Algorithms & Techniques

DOM Parsing: It identifies individual message nodes inside the chat window by detecting consistent class patterns or data attributes.

Search & Highlight:
--
Iterates through all messages

Compares message content with user input using string matching (case-insensitive, partial match)

Highlights matched messages using dynamic HTML spans

--
Scroll-to-Jump:

Each matched message is assigned a temporary unique ID

Clicking a result triggers scrollIntoView() on the corresponding DOM node

--
Modular Design:

popup.js: Handles UI interactions and result rendering

content.js: Injects logic into the active chat page

highlight.js: Applies/removes highlights dynamically

--
Communication: Uses chrome.runtime.sendMessage() to talk between background and content scripts



---

🧩 Files Overview

```📁 In chat-finder-extension/```<br>
```├── manifest.json         # Chrome extension metadata ```<br>
```├── popup.html            # Extension popup UI```<br>
```├── popup.js              # Logic for search bar and results```<br>
```├── content.js            # Injected into the page to find and scroll to chat```<br>
```├── highlight.js          # Applies highlights to matched messages```<br>
```├── style.css             # Basic styling```<br>


---

🔒 Privacy & Data

We do not collect, store, or transmit any personal data or conversation content. All search and navigation happens locally in your browser.


---

🤝 Contributing

Claude 
Gemini
Chatgpt


----

-----

🙌 Credits

Created by Prabhat yadav.
Inspired by the need to reduce scrolling pain while working with AI chats. It will be usefull from now on until gpt made a upgrade of it by itself. 


---
