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
  }
});

// 处理翻译文本的函数
function handleTranslateText(text, sendResponse) {
  console.log('处理翻译文本:', text);
  
  // 如果还没有设置GPT页面，则提示用户打开GPT页面
  if (!gptTabId) {
    // 创建通知提示用户打开GPT页面
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '划词翻译助手',
      message: '请打开GPT页面，然后点击插件图标设置为目标页面'
    });
    
    sendResponse({ success: false, message: '未设置GPT页面' });
  } else {
    // 如果已经设置了GPT页面，则直接发送文本
    sendTextToGPT(text);
    sendResponse({ success: true, message: '文本已发送到GPT页面' });
  }
}

// 设置GPT页面的函数
function setAsGPTPage(tabId) {
  gptTabId = tabId;
  
  // 保存GPT页面ID到存储中
  chrome.storage.local.set({gptTabId: gptTabId}, function() {
    console.log('GPT tab ID saved:', gptTabId);
  });
  
  // 更新插件图标状态
  chrome.action.setIcon({path: 'icon_active.png'});
}

// 发送文本到GPT页面
function sendTextToGPT(text) {
  if (gptTabId) {
    // 激活GPT页面标签
    chrome.tabs.update(gptTabId, {active: true}, function() {
      // 向GPT页面的内容脚本发送消息
      chrome.tabs.sendMessage(gptTabId, {
        action: 'fillAndSend',
        text: text
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送消息到GPT页面时出错:', chrome.runtime.lastError.message);
          // 如果页面不存在，清除gptTabId
          if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
            gptTabId = null;
            chrome.storage.local.remove('gptTabId');
          }
        } else {
          console.log('成功发送文本到GPT页面');
        }
      });
    });
  }
}

// 创建右键菜单项
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'translateContextMenu',
    title: '使用划词翻译助手翻译',
    contexts: ['selection']
  });
  
  // 创建设置GPT页面的上下文菜单
  chrome.contextMenus.create({
    id: 'setAsGPTPage',
    title: '将此页面设为GPT目标页面',
    contexts: ['all']
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'translateContextMenu') {
    // 获取选中的文本
    const selectedText = info.selectionText;
    
    // 保存文本并尝试发送到GPT页面
    chrome.storage.local.set({selectedText: selectedText}, function() {
      console.log('Text saved to storage:', selectedText);
    });
    
    if (!gptTabId) {
      // 如果没有设置GPT页面，则提示用户
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '划词翻译助手',
        message: '请先打开GPT页面并设置为目标页面'
      });
    } else {
      // 发送文本到GPT页面
      sendTextToGPT(selectedText);
    }
  }
  
  if (info.menuItemId === 'setAsGPTPage') {
    // 设置当前页面为GPT页面
    setAsGPTPage(tab.id);
    
    // 显示通知确认设置成功
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '划词翻译助手',
      message: '已将此页面设置为GPT目标页面'
    });
  }
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener(function(tabId) {
  // 如果关闭的是GPT页面，则清除gptTabId
  if (tabId === gptTabId) {
    gptTabId = null;
    chrome.storage.local.remove('gptTabId', function() {
      console.log('GPT tab ID removed from storage');
    });
  }
});

// 当插件图标被点击时
chrome.action.onClicked.addListener(function(tab) {
  // 检查当前页面是否为GPT页面
  chrome.tabs.sendMessage(tab.id, {action: 'checkIfGPTPage'}, function(response) {
    if (chrome.runtime.lastError) {
      // 如果无法发送消息，说明当前页面不是GPT页面，设置为GPT页面
      setAsGPTPage(tab.id);
      
      // 显示通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '划词翻译助手',
        message: '已将此页面设置为GPT目标页面'
      });
    } else if (response && response.isGPTPage) {
      // 如果是GPT页面，则取消设置
      gptTabId = null;
      chrome.storage.local.remove('gptTabId', function() {
        // 显示通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '划词翻译助手',
          message: '已取消GPT目标页面设置'
        });
      });
    } else {
      // 如果不是GPT页面，则设置为GPT页面
      setAsGPTPage(tab.id);
      
      // 显示通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '划词翻译助手',
        message: '已将此页面设置为GPT目标页面'
      });
    }
  });
});