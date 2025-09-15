// 存储选中的文本
let selectedText = '';

// 创建翻译按钮
function createTranslateButton() {
  // 创建按钮元素
  const button = document.createElement('div');
  button.id = 'translate-button';
  button.innerHTML = '翻译';
  button.style.cssText = `
    position: fixed;
    z-index: 10000;
    background-color: #4CAF50;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  // 添加点击事件
  button.addEventListener('click', function() {
    if (selectedText) {
      // 发送消息到background script
      chrome.runtime.sendMessage({
        action: 'translateText',
        text: selectedText
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送消息时出错:', chrome.runtime.lastError.message);
        } else {
          console.log('翻译请求已发送:', response);
        }
      });
      
      // 隐藏按钮
      button.style.display = 'none';
    }
  });
  
  // 添加鼠标移出事件，延迟隐藏按钮
  button.addEventListener('mouseleave', function() {
    setTimeout(() => {
      button.style.display = 'none';
    }, 500);
  });
  
  // 将按钮添加到页面
  document.body.appendChild(button);
  return button;
}

// 显示翻译按钮
function showTranslateButton(x, y) {
  let button = document.getElementById('translate-button');
  if (!button) {
    button = createTranslateButton();
  }
  
  // 设置按钮位置
  button.style.left = (x + 10) + 'px';
  button.style.top = (y + 10) + 'px';
  button.style.display = 'block';
}

// 监听鼠标抬起事件
document.addEventListener('mouseup', function(event) {
  // 获取选中的文本
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // 如果有选中的文本，显示翻译按钮
  if (selectedText) {
    showTranslateButton(event.clientX, event.clientY);
  } else {
    // 如果没有选中文本，隐藏翻译按钮
    const button = document.getElementById('translate-button');
    if (button) {
      button.style.display = 'none';
    }
  }
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script收到消息:', request);
  
  if (request.action === 'fillAndSend') {
    // 填充文本并发送
    fillAndSendToChat(request.text);
    sendResponse({ success: true });
  } else if (request.action === 'sendTextToGPT') {
    // 发送文本到GPT（保持向后兼容）
    fillAndSendToChat(request.text);
    sendResponse({ success: true });
  } else if (request.action === 'checkIfGPTPage') {
    // 检查是否为GPT页面（简单检查页面标题是否包含GPT）
    const isGPTPage = document.title.toLowerCase().includes('gpt') || 
                     document.title.toLowerCase().includes('chatgpt') ||
                     window.location.hostname.includes('chat.openai.com');
    sendResponse({ isGPTPage: isGPTPage });
  }
});

// 填充文本并发送到聊天框
function fillAndSendToChat(text) {
  // 查找聊天输入框（适配不同的GPT版本）
  const inputSelectors = [
    'textarea',  // 通用textarea
    'input[type="text"]',  // 通用text input
    '[contenteditable="true"]',  // 可编辑div
    'textarea[id*="prompt"]',  // 包含prompt的textarea
    'div[contenteditable="true"][data-id*="input"]',  // 特定的可编辑div
    '#prompt-textarea',  // ChatGPT特定的textarea
    'textarea[data-id*="root"]'  // 另一种可能的textarea
  ];
  
  let inputElement = null;
  
  // 尝试找到输入元素
  for (const selector of inputSelectors) {
    inputElement = document.querySelector(selector);
    if (inputElement) {
      break;
    }
  }
  
  // 如果没找到，尝试更广泛的搜索
  if (!inputElement) {
    const allTextareas = document.querySelectorAll('textarea');
    if (allTextareas.length > 0) {
      inputElement = allTextareas[0];
    }
    
    if (!inputElement) {
      const allInputs = document.querySelectorAll('input[type="text"]');
      if (allInputs.length > 0) {
        inputElement = allInputs[0];
      }
    }
    
    if (!inputElement) {
      const allEditableDivs = document.querySelectorAll('[contenteditable="true"]');
      if (allEditableDivs.length > 0) {
        inputElement = allEditableDivs[0];
      }
    }
  }
  
  if (inputElement) {
    // 清空输入框并填入新文本
    if (inputElement.tagName.toLowerCase() === 'textarea' || 
        inputElement.tagName.toLowerCase() === 'input') {
      inputElement.value = text;
      // 触发input事件，确保页面能检测到值的变化
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // 对于contenteditable元素
      inputElement.innerHTML = text;
      // 触发input事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    
    // 查找发送按钮
    const sendButtonSelectors = [
      'button[type="submit"]',
      '[data-testid*="send"]',
      '[aria-label*="发送"]',
      '[aria-label*="Send"]',
      'button:last-child',
      'input[type="submit"]'
    ];
    
    let sendButton = null;
    
    // 尝试找到发送按钮
    for (const selector of sendButtonSelectors) {
      sendButton = document.querySelector(selector);
      if (sendButton) {
        break;
      }
    }
    
    // 如果找到了发送按钮，点击它
    if (sendButton) {
      sendButton.click();
    } else {
      // 如果没找到发送按钮，尝试按回车键
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(enterEvent);
    }
    
    console.log('文本已填充并发送到聊天框');
  } else {
    console.error('未找到聊天输入框');
    
    // 如果没找到输入框，创建一个通知
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: '划词翻译助手',
      message: '未找到聊天输入框，请确保在GPT页面上使用'
    });
  }
}