// =================================================================
// 常量和状态管理
// =================================================================
let prefixText = "将下列内容翻译成中文："; // 默认值
let gptTabId = null;
let lastSelectedText = '';

// 从本地存储中恢复 GPT 页面 ID 和 prefixText
chrome.storage.local.get(['gptTabId', 'prefixText'], (result) => {
  if (result.gptTabId) {
    gptTabId = result.gptTabId;
  }
  if (result.prefixText) {
    prefixText = result.prefixText;
  }
});

// =================================================================
// 消息处理和通知
// =================================================================

function showNotification(message, type = 'info') {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "showNotification", payload: { message, type } }
      );
    }
  });
}

function clearGPTPage() {
  gptTabId = null;
  chrome.storage.local.remove('gptTabId');
}

function checkGPTPageAndRun(callback) {
  if (!gptTabId) {
    showNotification('未设置GPT页面，请先打开GPT页面并设置为目标页面', 'error');
    return;
  }

  chrome.tabs.get(gptTabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      clearGPTPage();
      showNotification('GPT页面已关闭，请重新设置目标页面', 'error');
    } else {
      callback();
    }
  });
}

// =================================================================
// 主要功能函数
// =================================================================

function sendToGPT(text) {
  checkGPTPageAndRun(() => {
    chrome.tabs.update(gptTabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        clearGPTPage();
        showNotification('GPT页面不存在或已断开连接，请重新设置目标页面', 'error');
        return;
      }

      chrome.tabs.sendMessage(
        gptTabId,
        { action: 'sendTextToGPT', text: prefixText + text },
        (response) => {
          if (chrome.runtime.lastError) {
            clearGPTPage();
            showNotification('与GPT页面的连接已断开，请重新设置目标页面', 'error');
            return;
          }

          if (response?.success) {
            showNotification(response.message || '文本已发送到GPT页面', 'info');
          } else {
            showNotification(response?.message || '发送失败', 'error');
          }
        }
      );
    });
  });
}

function setAsGPTPage(tabId) {
  gptTabId = tabId;
  chrome.storage.local.set({ gptTabId });
}

// =================================================================
// 事件监听器
// =================================================================

chrome.runtime.onMessage.addListener((request, sender) => {
  switch (request.action) {
    case 'sendToGPT':
      sendToGPT(lastSelectedText);
      break;
    case 'setAsGPTPage':
      setAsGPTPage(sender.tab.id);
      showNotification('已设置为GPT页面', request.type);
      break;
    case 'saveSelectedText':
      lastSelectedText = request.text;
      console.log("保存的选中文本:", lastSelectedText);
      break;
    case 'updatePrefixText': // 🔥 新增：更新前缀
      prefixText = request.value || "将下列内容翻译成中文：";
      chrome.storage.local.set({ prefixText });
      showNotification('前缀已更新为：' + prefixText, 'info');
      break;
    default:
      showNotification('未知动作', 'error');
      break;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'setAsGPTPage',
    title: '设为GPT目标页面',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'setAsGPTPage') {
    setAsGPTPage(tab.id);
    showNotification('已将当前页面设为GPT目标页面', 'info');
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === gptTabId) {
    clearGPTPage();
  }
});
