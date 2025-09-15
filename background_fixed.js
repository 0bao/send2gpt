// 增强版background.js - 改进错误处理和连接检查机制

// 存储GPT页面的tabId
let gptTabId = null;

// 从存储中恢复GPT页面ID
chrome.storage.local.get(['gptTabId'], function(result) {
  if (result.gptTabId) {
    gptTabId = result.gptTabId;
    console.log('从存储中恢复GPT页面ID:', gptTabId);
  }
});

// 监听来自popup或content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === 'translateText') {
    // 处理翻译文本的请求
    handleTranslateText(request.text, sendResponse);
    return true; // 保持消息通道开放以进行异步响应
  } else if (request.action === 'setAsGPTPage') {
    // 设置当前标签页为GPT页面
    setAsGPTPage(sender.tab.id);
    sendResponse({ message: '已设置为GPT页面' });
  } else if (request.action === 'checkIfGPTPage') {
    // 检查当前标签页是否为GPT页面
    const isGPTPage = sender.tab.id === gptTabId;
    sendResponse({ isGPTPage: isGPTPage });
  } else if (request.action === 'getCurrentGPTTabId') {
    // 获取当前GPT页面ID（用于调试）
    sendResponse({ gptTabId: gptTabId });
  } else if (request.action === 'clearGPTPage') {
    // 清除GPT页面设置（用于调试）
    gptTabId = null;
    chrome.storage.local.remove('gptTabId');
    sendResponse({ message: 'GPT页面设置已清除' });
  } else if (request.action === 'showNotification') {
    // 显示通知
    chrome.notifications.create({
      type: 'basic',
      title: request.title || '划词翻译助手',
      message: request.message,
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    });
    sendResponse({ success: true });
  } else if (request.action === 'contentScriptLoaded') {
    // 内容脚本加载完成
    try {
      console.log('Content script loaded in tab:', sender.tab ? sender.tab.id : 'unknown');
      sendResponse({ success: true });
    } catch (error) {
      console.error('处理contentScriptLoaded消息时发生异常:', error.message);
      // 即使出现异常也尝试发送响应
      try {
        sendResponse({ success: false, error: error.message });
      } catch (responseError) {
        console.error('发送响应时出错:', responseError.message);
      }
    }
  } else if (request.action === 'contentScriptUnloading') {
    // 内容脚本即将卸载
    try {
      console.log('Content script unloading from tab:', sender.tab ? sender.tab.id : 'unknown');
      sendResponse({ success: true });
    } catch (error) {
      console.error('处理contentScriptUnloading消息时发生异常:', error.message);
      // 即使出现异常也尝试发送响应
      try {
        sendResponse({ success: false, error: error.message });
      } catch (responseError) {
        console.error('发送响应时出错:', responseError.message);
      }
    }
  }
  
  return true;
});

// 处理翻译文本的函数
function handleTranslateText(text, sendResponse) {
  console.log('处理翻译文本:', text);
  
  // 如果还没有设置GPT页面，则提示用户打开GPT页面
  if (!gptTabId) {
    const errorMsg = '未设置GPT页面，请先打开GPT页面并点击插件图标设置为目标页面';
    console.warn(errorMsg);
    
    // 创建通知提示用户打开GPT页面
    chrome.notifications.create({
      type: 'basic',
      title: '划词翻译助手',
      message: errorMsg,
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    });
    
    sendResponse({ success: false, message: errorMsg });
  } else {
    // 检查GPT页面是否仍然存在
    chrome.tabs.get(gptTabId, function(tab) {
      if (chrome.runtime.lastError) {
        // 如果页面不存在，清除gptTabId
        console.error('GPT页面不存在:', chrome.runtime.lastError.message);
        gptTabId = null;
        chrome.storage.local.remove('gptTabId');
        
        const errorMsg = 'GPT页面已关闭，请重新打开GPT页面并设置为目标页面';
        chrome.notifications.create({
          type: 'basic',
          title: '划词翻译助手',
          message: errorMsg,
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        });
        
        sendResponse({ success: false, message: errorMsg });
      } else {
        // 如果页面存在，则发送文本
        sendTextToGPT(text, sendResponse);
      }
    });
  }
}

// 设置GPT页面的函数
function setAsGPTPage(tabId) {
  gptTabId = tabId;
  
  // 保存GPT页面ID到存储中
  chrome.storage.local.set({gptTabId: gptTabId}, function() {
    if (chrome.runtime.lastError) {
      console.error('保存GPT页面ID时出错:', chrome.runtime.lastError.message);
    } else {
      console.log('GPT tab ID saved:', gptTabId);
    }
  });
  
  // 更新插件图标状态
  // 移除了图标设置相关代码，避免因缺少图标文件导致的错误
}

// 可配置的前缀文本
const prefixText = "将下列内容翻译成中文：";

// 发送文本到GPT页面
function sendTextToGPT(text, sendResponse) {
  if (gptTabId) {
    console.log('准备向GPT页面发送文本，Tab ID:', gptTabId);
    // 激活GPT页面标签
    chrome.tabs.update(gptTabId, {active: true}, function(tab) {
      if (chrome.runtime.lastError) {
        console.error('激活GPT页面时出错:', chrome.runtime.lastError.message);
        // 如果页面不存在，清除gptTabId
        if (chrome.runtime.lastError.message.includes('No tab') || 
            chrome.runtime.lastError.message.includes('Invalid tab id')) {
          console.log('检测到GPT页面不存在，清除GPT页面ID');
          gptTabId = null;
          chrome.storage.local.remove('gptTabId');
          showNotification('GPT页面不存在，请重新设置目标页面', 'error');
        }
        // 如果有sendResponse回调，调用它
        if (sendResponse) {
          sendResponse({ success: false, message: '激活GPT页面时出错: ' + chrome.runtime.lastError.message });
        }
        return;
      }
      
      console.log('GPT页面已激活，准备发送消息');
      // 向GPT页面的内容脚本发送消息
      chrome.tabs.sendMessage(gptTabId, {
        action: 'sendTextToGPT',
        text: prefixText + text
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送消息到GPT页面时出错:', chrome.runtime.lastError.message);
          // 检查是否为连接错误
          const errorMessage = chrome.runtime.lastError.message;
          if (errorMessage.includes('Could not establish connection') || 
              errorMessage.includes('Receiving end does not exist')) {
            console.log('检测到连接错误，清除GPT页面ID');
            gptTabId = null;
            chrome.storage.local.remove('gptTabId');
            showNotification('与GPT页面的连接已断开，请重新设置目标页面', 'error');
          } else {
            showNotification('发送消息到GPT页面时出错: ' + errorMessage, 'error');
          }
          // 如果有sendResponse回调，调用它
          if (sendResponse) {
            sendResponse({ success: false, message: '发送消息到GPT页面时出错: ' + errorMessage });
          }
        } else {
          console.log('成功发送文本到GPT页面');
          if (response && response.success) {
            showNotification(response.message || '文本已发送到GPT页面', 'info');
          } else {
            showNotification(response.message || '发送文本到GPT页面失败', 'error');
          }
          // 如果有sendResponse回调，调用它
          if (sendResponse) {
            sendResponse({ success: true, message: response.message || '文本已发送到GPT页面' });
          }
        }
      });
    });
  } else {
    const errorMsg = '未设置GPT页面，请先打开GPT页面并设置为目标页面';
    showNotification(errorMsg, 'error');
    // 如果有sendResponse回调，调用它
    if (sendResponse) {
      sendResponse({ success: false, message: errorMsg });
    }
  }
}

// 显示通知函数
function showNotification(message, type = 'info') {
  // 使用chrome.notifications API显示通知
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    title: '划词翻译助手',
    message: message
  }, function(notificationId) {
    // 3秒后清除通知
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 3000);
  });
}

// 创建右键菜单项
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'translateContextMenu',
    title: '翻译选中文本',
    contexts: ['selection']
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('创建右键菜单时出错:', chrome.runtime.lastError.message);
    } else {
      console.log('右键菜单创建成功');
    }
  });
  
  // 创建设置GPT页面的上下文菜单
  chrome.contextMenus.create({
    id: 'setAsGPTPage',
    title: '设为GPT目标页面',
    contexts: ['all']
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('创建GPT页面设置菜单时出错:', chrome.runtime.lastError.message);
    } else {
      console.log('GPT页面设置菜单创建成功');
    }
  });
});

// 监听右键菜单点击事件
  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'translateContextMenu') {
      // 获取选中的文本
      const selectedText = info.selectionText;
      
      // 保存文本并尝试发送到GPT页面
      chrome.storage.local.set({selectedText: selectedText}, function() {
        if (chrome.runtime.lastError) {
          console.error('保存选中文本时出错:', chrome.runtime.lastError.message);
        } else {
          console.log('Text saved to storage:', selectedText);
        }
      });
      
      if (!gptTabId) {
        // 如果没有设置GPT页面，则提示用户
        const errorMsg = '请先打开GPT页面并设置为目标页面';
        chrome.notifications.create({
          type: 'basic',
          title: '划词翻译助手',
          message: errorMsg,
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        });
      } else {
        // 发送文本到GPT页面
        sendTextToGPT(selectedText, null);
      }
    }
    
    if (info.menuItemId === 'setAsGPTPage') {
      // 设置当前页面为GPT页面
      setAsGPTPage(tab.id);
      
      // 显示通知确认设置成功
      chrome.notifications.create({
        type: 'basic',
        title: '划词翻译助手',
        message: '已将此页面设置为GPT目标页面',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });
    }
  });

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener(function(tabId) {
  // 如果关闭的是GPT页面，则清除gptTabId
  if (tabId === gptTabId) {
    gptTabId = null;
    chrome.storage.local.remove('gptTabId', function() {
      if (chrome.runtime.lastError) {
        console.error('清除GPT页面ID时出错:', chrome.runtime.lastError.message);
      } else {
        console.log('GPT tab ID removed from storage');
      }
    });
  }
});

// 当插件图标被点击时
chrome.action.onClicked.addListener(function(tab) {
  // 检查当前页面是否为GPT页面
  chrome.tabs.sendMessage(tab.id, {action: 'checkIfGPTPage'}, function(response) {
    if (chrome.runtime.lastError) {
      // 如果无法发送消息，说明当前页面不是GPT页面，设置为GPT页面
      console.log('无法发送消息到当前页面，将其设置为GPT页面');
      setAsGPTPage(tab.id);
      
      // 显示通知
      chrome.notifications.create({
        type: 'basic',
        title: '划词翻译助手',
        message: '已将此页面设置为GPT目标页面',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });
    } else if (response && response.isGPTPage) {
      // 如果是GPT页面，则取消设置
      gptTabId = null;
      chrome.storage.local.remove('gptTabId', function() {
        if (chrome.runtime.lastError) {
          console.error('清除GPT页面ID时出错:', chrome.runtime.lastError.message);
        }
        
        // 显示通知
        chrome.notifications.create({
          type: 'basic',
          title: '划词翻译助手',
          message: '已取消GPT目标页面设置',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        });
      });
    } else {
      // 如果不是GPT页面，则设置为GPT页面
      setAsGPTPage(tab.id);
      
      // 显示通知
      chrome.notifications.create({
        type: 'basic',
        title: '划词翻译助手',
        message: '已将此页面设置为GPT目标页面',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });
    }
  });
});

console.log('划词翻译助手background script已加载');