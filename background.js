// =================================================================
// 常量和状态管理
// =================================================================
const PREFIX_TEXT = "将下列内容翻译成中文：";
let gptTabId = null;

// 从本地存储中恢复 GPT 页面 ID
chrome.storage.local.get(['gptTabId'], (result) => {
  if (result.gptTabId) {
    gptTabId = result.gptTabId;
  }
});

// =================================================================
// 消息处理和通知
// =================================================================

/**
 * 显示浏览器通知
 * @param {string} message - 通知内容
 * @param {('info'|'error')} [type='info'] - 通知类型
 */
function showNotification(message, type = 'info') {
  try {
    const iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconUrl,
      title: '划词翻译助手',
      message: message,
      priority: type === 'error' ? 2 : 0,
    }, (id) => {
      // 3秒后自动清除通知
      if (id && !chrome.runtime.lastError) {
        setTimeout(() => chrome.notifications.clear(id), 3000);
      }
    });
  } catch (e) {
    console.error(`[${type.toUpperCase()}] Notification error: ${e.message}`);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

/**
 * 封装的错误处理函数，用于发送错误响应和显示通知
 * @param {string} message - 错误信息
 * @param {function} sendResponse - sendResponse 回调函数
 */
function handleResponseError(message, sendResponse) {
  showNotification(message, 'error');
  sendResponse?.({ success: false, message: message });
}

/**
 * 清除 GPT 页面设置
 */
function clearGPTPage() {
  gptTabId = null;
  chrome.storage.local.remove('gptTabId');
}

/**
 * 检查 GPT 页面是否存在并更新状态
 * @param {function} callback - 回调函数
 * @param {function} [sendResponse] - sendResponse 回调函数
 */
function checkGPTPageAndRun(callback, sendResponse) {
  if (!gptTabId) {
    handleResponseError('未设置GPT页面，请先打开GPT页面并点击插件图标设置为目标页面', sendResponse);
    return;
  }

  chrome.tabs.get(gptTabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      clearGPTPage();
      handleResponseError('GPT页面已关闭，请重新设置目标页面', sendResponse);
    } else {
      callback();
    }
  });
}

// =================================================================
// 主要功能函数
// =================================================================

/**
 * 发送文本到 GPT 页面进行处理
 * @param {string} text - 需要发送的文本
 * @param {function} [sendResponse] - sendResponse 回调函数
 */
function sendTextToGPT(text, sendResponse) {
  checkGPTPageAndRun(() => {
    chrome.tabs.update(gptTabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        clearGPTPage();
        handleResponseError('GPT页面不存在或已断开连接，请重新设置目标页面', sendResponse);
        return;
      }
      
      chrome.tabs.sendMessage(
        gptTabId,
        { action: 'sendTextToGPT', text: PREFIX_TEXT + text },
        (response) => {
          if (chrome.runtime.lastError) {
            clearGPTPage();
            handleResponseError('与GPT页面的连接已断开，请重新设置目标页面', sendResponse);
            return;
          }

          if (response?.success) {
            showNotification(response.message || '文本已发送到GPT页面', 'info');
            sendResponse?.({ success: true, message: response.message });
          } else {
            handleResponseError(response?.message || '发送失败', sendResponse);
          }
        }
      );
    });
  }, sendResponse);
}

/**
 * 设置当前标签页为 GPT 目标页面
 * @param {number} tabId - 标签页 ID
 */
function setAsGPTPage(tabId) {
  gptTabId = tabId;
  chrome.storage.local.set({ gptTabId });
}

// =================================================================
// 事件监听器
// =================================================================

// 监听来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'translateText':
      console.log('333');
      sendTextToGPT(request.text, sendResponse);
      break;
    case 'setAsGPTPage':
      setAsGPTPage(sender.tab.id);
      showNotification('已设置为GPT页面', request.type);
      sendResponse({ message: '已设置为GPT页面' });
      break;
    case 'checkIfGPTPage':
      sendResponse({ isGPTPage: sender.tab.id === gptTabId });
      break;
    case 'getCurrentGPTTabId':
      sendResponse({ gptTabId: gptTabId });
      break;
    case 'clearGPTPage':
      clearGPTPage();
      sendResponse({ message: 'GPT页面设置已清除' });
      break;
    case 'showNotification':
      showNotification(request.message, request.type);
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ success: false, message: '未知动作' });
      break;
  }
  return true;
});

// 监听扩展程序安装事件，创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translateContextMenu',
    title: '翻译选中文本',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'setAsGPTPage',
    title: '设为GPT目标页面',
    contexts: ['page']
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateContextMenu' && info.selectionText) {
    sendTextToGPT(info.selectionText, null);
  } else if (info.menuItemId === 'setAsGPTPage') {
    setAsGPTPage(tab.id);
    showNotification('已将当前页面设为GPT目标页面', 'info');
  }
});

// 监听标签页关闭事件，如果关闭的是 GPT 页面，则清除设置
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === gptTabId) {
    clearGPTPage();
  }
});