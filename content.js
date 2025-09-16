// content.js

let selectedText = '';

// 点击翻译按钮的处理函数
function handleSendToGPTButtonClick() {
  chrome.runtime.sendMessage( { action: 'sendToGPT', text: selectedText } );
}

// 创建翻译按钮
function createTranslateButton() {
  const button = document.createElement('div');
  button.id = 'sent2gpt-button';
  button.innerHTML = '发送到GPT';
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
    user-select: none; /* 禁止选中文字 */
  `;

  button.addEventListener('click', handleSendToGPTButtonClick);
  document.body.appendChild(button);
}



function showTranslateButton(x, y) {
  const button = document.getElementById('sent2gpt-button');
  if (button) {
    button.style.left = (x + 10) + 'px';
    button.style.top = (y + 10) + 'px';
    button.style.display = 'block';
  }
}

function hideTranslateButton() {
  const button = document.getElementById('sent2gpt-button');
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
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    showTranslateButton(event.clientX, event.clientY);
    console.log('选中的文本:', selectedText);

    // 把选中的文本发给 background
    chrome.runtime.sendMessage({
      action: 'saveSelectedText',
      text: selectedText
    });
  } else {
    hideTranslateButton();
  }
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillAndSend' || request.action === 'sendTextToGPT') {
    fillAndSendToChat(request.text, sendResponse);
    return true;
  } else if (request.action === "showNotification") {
    showNotification(request.payload.message, request.payload.type);
    return true;
  }
  return true;
});

// 填充文本并发送
function fillAndSendToChat(text, sendResponse) {



  try {
    const inputSelectors = [
      '#prompt-textarea',
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
    // 2. 填充输入框
    if (inputElement.contentEditable === 'true') {
        // 清空输入框并插入文本
        inputElement.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = text;
        inputElement.appendChild(p);
    } else {
      inputElement.value = text;
    }
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
const sendButtonSelectors = [
      '#composer-submit-button',
      '[data-testid="send-button"]',
      '[data-testid="submit-button"]',
      'button[type="submit"]',
      'button[id="composer-submit-button"]'
    ];
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      const candidate = document.querySelector(selector);
      if (candidate) {
        // 🚫 跳过语音按钮
        if (candidate.getAttribute('data-testid') === 'composer-speech-button') {
          continue;
        }
        sendButton = candidate;
        break;
      }
    }
 console.log("找到的发送按钮0:", sendButton);   // 打印整个 DOM 节点
    const buttons = document.querySelectorAll('button');
    if (!sendButton) {
        for (const btn of buttons) {
          if (btn.getAttribute('data-testid') === 'composer-speech-button') {
            continue;
          }
          if (btn.textContent.includes('send')) {
            sendButton = btn;
            break;
          }
        }
    }
 console.log("找到的发送按钮1:", sendButton);   // 打印整个 DOM 节点
    if (!sendButton) {
        for (const btn of buttons) {
          if (btn.textContent.includes('发送')) {
            sendButton = btn;
            break;
          }
        }
    }
    if (!sendButton) {
       if (buttons.length > 0) sendButton = buttons[buttons.length - 1];
    }

    console.log("找到的发送按钮2:", sendButton);   // 打印整个 DOM 节点
    if (!sendButton) {
      const errorMsg = '未找到发送按钮';
      showNotification(errorMsg, 'error');
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
    }, 100);

    }, 100);

    


  } catch (error) {
    const errorMsg = '填充和发送文本时出错: ' + error.message;
    showNotification(errorMsg, 'error');
    if (sendResponse) sendResponse({ success: false, message: errorMsg });
  }
}

createTranslateButton();

