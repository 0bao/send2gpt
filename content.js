// content.js

let selectedText = '';

// 创建翻译按钮
function createTranslateButton() {
  const button = document.createElement('div');
  button.id = 'translate-button';
  button.innerHTML = '🌐翻译';
  button.style.cssText = `
    position: fixed;
    z-index: 10000;
    background-color: #4CAF50;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    display: none;
  `;
  
  button.addEventListener('click', function() {
    if (!selectedText.trim()) {
      showNotification('选中的文本为空', 'error');
      return;
    }
    chrome.runtime.sendMessage({ action: 'translateText', text: selectedText }, function(response) {
      if (chrome.runtime.lastError) {
        showNotification('发送翻译请求时出错: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && !response.success) {
        if (response.message && response.message.includes('未设置GPT页面')) {
          showNotification('请先打开GPT页面并设置为目标页面', 'error');
        } else {
          showNotification(response.message, 'error');
        }
      } else {
        showNotification('文本已发送到GPT页面', 'info');
      }
    });
  });

  document.body.appendChild(button);
}

function showTranslateButton(x, y) {
  const button = document.getElementById('translate-button');
  if (button) {
    button.style.left = (x + 10) + 'px';
    button.style.top = (y + 10) + 'px';
    button.style.display = 'block';
  }
}

function hideTranslateButton() {
  const button = document.getElementById('translate-button');
  if (button) button.style.display = 'none';
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
    color: white;
    padding: 15px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
    animation: notificationSlideIn 0.3s ease-out;
  `;
  notification.innerHTML = message;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes notificationSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          if (style.parentNode) style.parentNode.removeChild(style);
        }
      }, 300);
    }
  }, 3000);
}

// 监听鼠标事件
document.addEventListener('mouseup', function(event) {
  selectedText = window.getSelection().toString().trim();
  if (selectedText) showTranslateButton(event.clientX, event.clientY);
  else hideTranslateButton();
});

document.addEventListener('mousedown', function(event) {
  const button = document.getElementById('translate-button');
  if (button && event.target !== button && !button.contains(event.target)) {
    hideTranslateButton();
  }
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillAndSend' || request.action === 'sendTextToGPT') {
    fillAndSendToChat(request.text, sendResponse);
    return true;
  } else if (request.action === 'checkIfGPTPage') {
    const isGPTPage = !!document.querySelector('textarea[data-id*="root"]');
    sendResponse({ isGPTPage });
    return true;
  } else if (request.action === 'contentScriptLoaded') {
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'contentScriptUnloading') {
    sendResponse({ success: true });
    return true;
  }
  return true;
});

// 填充文本并发送
function fillAndSendToChat(text, sendResponse) {
  try {
    const inputSelectors = [
      'textarea[data-id*="root"]',
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]'
    ];
    let inputElement = null;
    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) break;
    }
    if (!inputElement) {
      const errorMsg = '未找到聊天输入框';
      showNotification(errorMsg, 'error');
      if (sendResponse) sendResponse({ success: false, message: errorMsg });
      return;
    }
    if (inputElement.contentEditable === 'true') {
      inputElement.innerHTML = '';
      inputElement.appendChild(document.createTextNode(text));
    } else {
      inputElement.value = text;
    }
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    const sendButtonSelectors = [
      '[data-testid="send-button"]',
      '[data-testid="submit-button"]',
      'button[type="submit"]',
      'button:contains("Send")',
      'button:contains("发送")'
    ];
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      if (selector.includes(':contains')) {
        const buttonText = selector.split('"')[1];
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes(buttonText)) {
            sendButton = btn;
            break;
          }
        }
      } else {
        sendButton = document.querySelector(selector);
      }
      if (sendButton) break;
    }
    if (!sendButton) {
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) sendButton = buttons[buttons.length - 1];
    }
    if (!sendButton) {
      const errorMsg = '未找到发送按钮';
      showNotification(errorMsg, 'error');
      if (sendResponse) sendResponse({ success: false, message: errorMsg });
      return;
    }

    setTimeout(() => {
      if (typeof sendButton.click === 'function') {
        sendButton.click();
        showNotification('文本已发送到GPT', 'info');
        if (sendResponse) sendResponse({ success: true, message: '文本已发送到GPT' });
      } else {
        const clickEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
        const clicked = sendButton.dispatchEvent(clickEvent);
        if (clicked) showNotification('文本已发送到GPT', 'info');
        else showNotification('点击发送按钮失败', 'error');
        if (sendResponse) sendResponse({ success: clicked, message: clicked ? '文本已发送到GPT' : '点击发送按钮失败' });
      }
    }, 300);
  } catch (error) {
    const errorMsg = '填充和发送文本时出错: ' + error.message;
    showNotification(errorMsg, 'error');
    if (sendResponse) sendResponse({ success: false, message: errorMsg });
  }
}

createTranslateButton();

window.addEventListener('load', function() {
  try {
    chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });
  } catch {}
});

window.addEventListener('beforeunload', function() {
  try {
    chrome.runtime.sendMessage({ action: 'contentScriptUnloading' });
  } catch {}
});
