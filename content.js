// 修复版content.js - 增强错误处理和GPT页面兼容性

// 存储选中的文本
let selectedText = '';

// 创建翻译按钮
function createTranslateButton() {
  // 创建按钮元素
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
  
  // 添加点击事件监听器
  button.addEventListener('click', function() {
    console.log('翻译按钮被点击，selectedText:', selectedText);
  
    检查文本是否为空
    if (selectedText.trim() === '') {
      console.warn('选中的文本为空');
      showNotification('选中的文本为空', 'error');
      return;
    }
    
    // 发送翻译请求到background script
    console.log('准备发送翻译请求:', selectedText);
    chrome.runtime.sendMessage({
      action: 'translateText',
      text: selectedText
    }, function(response) {
      console.log('收到翻译请求响应:', response);
      if (chrome.runtime.lastError) {
        console.error('发送翻译请求时出错:', chrome.runtime.lastError.message);
        showNotification('发送翻译请求时出错: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && !response.success) {
        console.error('翻译请求失败:', response.message);
        // 检查是否是因为未设置GPT页面导致的错误
        if (response.message && response.message.includes('未设置GPT页面')) {
          showNotification('请先打开GPT页面并设置为目标页面', 'error');
        } else {
          showNotification(response.message, 'error');
        }
      } else {
        console.log('翻译请求已发送');
        showNotification('文本已发送到GPT页面', 'info');
      }
    });
  });
  
  // 将按钮添加到页面
  document.body.appendChild(button);
}

// 显示翻译按钮
function showTranslateButton(x, y) {
  const button = document.getElementById('translate-button');
  if (button) {
    button.style.left = (x + 10) + 'px';
    button.style.top = (y + 10) + 'px';
    button.style.display = 'block';
  }
}

// 隐藏翻译按钮
function hideTranslateButton() {
  const button = document.getElementById('translate-button');
  if (button) {
    button.style.display = 'none';
  }
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
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

  // 添加样式动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes notificationSlideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // 将通知添加到页面
  document.body.appendChild(notification);

  // 3秒后自动移除通知
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          if (style.parentNode) {
            style.parentNode.removeChild(style);
          }
        }
      }, 300);
    }
  }, 3000);
}

// 监听鼠标事件
document.addEventListener('mouseup', function(event) {
  // 获取选中的文本
  selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    // 显示翻译按钮
    showTranslateButton(event.clientX, event.clientY);
  } else {
    // 隐藏翻译按钮
    hideTranslateButton();
  }
});

// 点击页面其他地方隐藏翻译按钮
document.addEventListener('mousedown', function(event) {
  const button = document.getElementById('translate-button');
  if (button && event.target !== button && !button.contains(event.target)) {
    hideTranslateButton();
  }
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script收到消息:', request);
  
  if (request.action === 'fillAndSend') {
    // 填充文本并发送
    console.log('开始处理fillAndSend消息');
    fillAndSendToChat(request.text, sendResponse);
    console.log('fillAndSend消息处理完成');
    return true; // 保持消息通道开放以进行异步响应
  } else if (request.action === 'sendTextToGPT') {
    // 直接发送文本到GPT
    console.log('开始处理sendTextToGPT消息');
    fillAndSendToChat(request.text, sendResponse);
    console.log('sendTextToGPT消息处理完成');
    return true; // 保持消息通道开放以进行异步响应
  } else if (request.action === 'checkIfGPTPage') {
    // 检查当前页面是否为GPT页面
    // 在GPT页面上，我们可以通过检查是否存在特定元素来判断
    const isGPTPage = !!document.querySelector('textarea[data-id*="root"]');
    console.log('检查GPT页面结果:', isGPTPage);
    sendResponse({ isGPTPage: isGPTPage });
    return true; // 保持消息通道开放以进行异步响应
  } else if (request.action === 'contentScriptLoaded') {
    // 内容脚本加载完成
    console.log('Content script loaded');
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'contentScriptUnloading') {
    // 内容脚本即将卸载
    console.log('Content script unloading');
    sendResponse({ success: true });
    return true;
  }
  
  console.log('未知消息类型:', request.action);
  return true;
});

// 填充文本到聊天框并发送
function fillAndSendToChat(text, sendResponse) {
  console.log('尝试填充文本到聊天框:', text);
  
  try {
    // 查找聊天输入框
    const inputSelectors = [
      'textarea[data-id*="root"]',  // 新版GPT
      'textarea',                   // 通用textarea
      'input[type="text"]',         // 通用文本输入框
      '[contenteditable="true"]'    // 可编辑元素
    ];
    
    let inputElement = null;
    
    // 遍历选择器查找输入框
    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) {
        console.log('找到输入框元素:', selector);
        break;
      }
    }
    
    if (!inputElement) {
      const errorMsg = '未找到聊天输入框';
      console.error(errorMsg);
      showNotification(errorMsg, 'error');
      if (sendResponse) {
        sendResponse({ success: false, message: errorMsg });
      }
      return;
    }
    
    // 清空输入框并填入新文本
    if (inputElement.contentEditable === 'true') {
      // 处理可编辑元素
      inputElement.innerHTML = '';
      const textNode = document.createTextNode(text);
      inputElement.appendChild(textNode);
    } else {
      // 处理表单元素
      inputElement.value = text;
    }
    
    // 触发输入事件，让GPT页面知道内容已更改
    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
    
    // 查找发送按钮
    const sendButtonSelectors = [
      '[data-testid="send-button"]',  // 新版GPT发送按钮
      '[data-testid="submit-button"]', // 新版GPT提交按钮
      'button[type="submit"]',         // 通用提交按钮
      'button:contains("Send")',       // 包含"Send"的按钮
      'button:contains("发送")'        // 包含"发送"的按钮
      // 移除了'svg'选择器，因为SVG元素通常不是可点击的按钮
    ];
    
    let sendButton = null;
    
    // 遍历选择器查找发送按钮
    for (const selector of sendButtonSelectors) {
      // 特殊处理包含文本的按钮
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
      
      // 确保找到的元素是按钮或可点击的元素
      if (sendButton && (sendButton.tagName === 'BUTTON' || sendButton.type === 'submit' || sendButton.onclick)) {
        console.log('找到发送按钮元素:', selector, '元素类型:', sendButton.tagName, '是否有click方法:', typeof sendButton.click);
        break;
      }
      // 重置sendButton，继续查找
      sendButton = null;
    }
    
    // 如果还是没找到按钮，尝试查找所有按钮元素
    if (!sendButton) {
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) {
        // 通常最后一个按钮是发送按钮
        sendButton = buttons[buttons.length - 1];
        console.log('使用备用方法找到发送按钮');
      }
    }
    
    if (!sendButton) {
      const errorMsg = '未找到发送按钮';
      console.error(errorMsg);
      showNotification(errorMsg, 'error');
      if (sendResponse) {
        sendResponse({ success: false, message: errorMsg });
      }
      return;
    }
    
    // 点击发送按钮
    setTimeout(() => {
      // 确保元素有click方法
      if (typeof sendButton.click === 'function') {
        sendButton.click();
        console.log('已点击发送按钮');
        showNotification('文本已发送到GPT', 'info');
        if (sendResponse) {
          sendResponse({ success: true, message: '文本已发送到GPT' });
        }
      } else {
        // 如果没有click方法，尝试创建并派发点击事件
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        const clicked = sendButton.dispatchEvent(clickEvent);
        if (clicked) {
          console.log('已通过事件派发点击发送按钮');
          showNotification('文本已发送到GPT', 'info');
        } else {
          console.error('点击发送按钮失败');
          showNotification('点击发送按钮失败', 'error');
        }
        if (sendResponse) {
          sendResponse({ success: clicked, message: clicked ? '文本已发送到GPT' : '点击发送按钮失败' });
        }
      }
    }, 300); // 延迟300ms确保输入事件处理完成
    
  } catch (error) {
    const errorMsg = '填充和发送文本时出错: ' + error.message;
    console.error(errorMsg);
    showNotification(errorMsg, 'error');
    if (sendResponse) {
      sendResponse({ success: false, message: errorMsg });
    }
  }
}

// 创建翻译按钮
createTranslateButton();

// 页面加载完成后通知background script
window.addEventListener('load', function() {
  console.log('划词翻译助手content script已加载');
  
  // 通知background script页面已加载
  try {
    chrome.runtime.sendMessage({
      action: 'contentScriptLoaded'
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('通知background script时出错:', chrome.runtime.lastError.message);
      } else {
        console.log('成功通知background script页面已加载');
      }
    });
  } catch (error) {
    console.error('发送contentScriptLoaded消息时发生异常:', error.message);
  }
});

// 页面卸载前通知background script
window.addEventListener('beforeunload', function() {
  try {
    chrome.runtime.sendMessage({
      action: 'contentScriptUnloading'
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('通知background script卸载时出错:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('发送contentScriptUnloading消息时发生异常:', error.message);
  }
});

// 添加DOMContentLoaded事件监听器，确保DOM完全加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM内容已加载');
});