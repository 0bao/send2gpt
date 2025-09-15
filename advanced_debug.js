// 增强版调试脚本 - 用于诊断GPT页面错误问题

// 创建调试界面
function createDebugUI() {
  // 创建调试容器
  const container = document.createElement('div');
  container.id = 'advanced-debug-container';
  container.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 100000;
    background: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 15px;
    width: 300px;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  `;
  
  // 创建标题
  const title = document.createElement('h3');
  title.textContent = '划词翻译助手 - 高级调试工具';
  title.style.cssText = 'margin: 0 0 10px 0; color: #333;';
  
  // 创建输出区域
  const output = document.createElement('div');
  output.id = 'debug-output';
  output.style.cssText = `
    height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 10px;
    font-size: 12px;
    white-space: pre-wrap;
  `;
  
  // 创建按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px;';
  
  // 创建调试按钮
  const buttons = [
    { text: '测试连接', action: testConnection },
    { text: '测试GPT页面连接', action: testGPTPageConnection },
    { text: '发送测试文本', action: testSendText },
    { text: '设置为GPT页面', action: testSetAsGPTPage },
    { text: '清除GPT页面设置', action: testClearGPTPage },
    { text: '检查GPT页面设置', action: testCheckGPTPage },
    { text: '清空输出', action: () => { output.textContent = ''; } }
  ];
  
  buttons.forEach(buttonInfo => {
    const button = document.createElement('button');
    button.textContent = buttonInfo.text;
    button.style.cssText = `
      padding: 5px 10px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    button.addEventListener('click', buttonInfo.action);
    buttonContainer.appendChild(button);
  });
  
  // 将元素添加到容器
  container.appendChild(title);
  container.appendChild(output);
  container.appendChild(buttonContainer);
  
  // 将容器添加到页面
  document.body.appendChild(container);
  
  // 输出函数
  window.logOutput = function(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${timestamp}] ${message}`;
    entry.style.color = isError ? 'red' : 'black';
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
  };
}

// 测试插件连接
function testConnection() {
  logOutput('测试插件连接...');
  chrome.runtime.sendMessage({ action: 'getCurrentGPTTabId' }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`连接失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`连接成功: ${JSON.stringify(response)}`);
    }
  });
}

// 测试与GPT页面连接
function testGPTPageConnection() {
  logOutput('测试与GPT页面连接...');
  chrome.runtime.sendMessage({ action: 'checkIfGPTPage' }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`连接GPT页面失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`GPT页面连接状态: ${response.isGPTPage ? '是' : '否'}`);
    }
  });
}

// 发送测试文本
function testSendText() {
  const testText = '这是一条测试消息';
  logOutput(`发送测试文本: "${testText}"`);
  chrome.runtime.sendMessage({ action: 'translateText', text: testText }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`发送文本失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`发送文本响应: ${JSON.stringify(response)}`);
    }
  });
}

// 设置为GPT页面
function testSetAsGPTPage() {
  logOutput('设置当前页面为GPT页面...');
  chrome.runtime.sendMessage({ action: 'setAsGPTPage' }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`设置GPT页面失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`设置GPT页面响应: ${JSON.stringify(response)}`);
    }
  });
}

// 清除GPT页面设置
function testClearGPTPage() {
  logOutput('清除GPT页面设置...');
  chrome.runtime.sendMessage({ action: 'clearGPTPage' }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`清除GPT页面设置失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`清除GPT页面设置响应: ${JSON.stringify(response)}`);
    }
  });
}

// 检查GPT页面设置
function testCheckGPTPage() {
  logOutput('检查GPT页面设置...');
  chrome.runtime.sendMessage({ action: 'getCurrentGPTTabId' }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`检查GPT页面设置失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`当前GPT页面ID: ${response.gptTabId || '未设置'}`);
    }
  });
}

// 显示通知
function showNotification(title, message, type = 'info') {
  chrome.runtime.sendMessage({
    action: 'showNotification',
    title: title,
    message: message
  }, function(response) {
    if (chrome.runtime.lastError) {
      logOutput(`显示通知失败: ${chrome.runtime.lastError.message}`, true);
    } else {
      logOutput(`通知已显示: ${title} - ${message}`);
    }
  });
}

// 页面加载完成后创建调试界面
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDebugUI);
} else {
  createDebugUI();
}

logOutput('增强版调试脚本已加载');