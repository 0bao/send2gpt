document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('prefixInput');
  const saveBtn = document.getElementById('saveBtn');

  // 从 storage 加载现有前缀
  chrome.storage.local.get('prefixText', (result) => {
    input.value = result.prefixText || "将下列内容翻译成中文：";
  });

  // 保存新前缀
  saveBtn.addEventListener('click', () => {
    const newPrefix = input.value.trim() || "将下列内容翻译成中文：";
    chrome.runtime.sendMessage({ action: 'updatePrefixText', value: newPrefix });

    // 获取当前活动的 tab，并向 content.js 发送消息
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "showNotification", payload: { message: "前缀已保存！", type: "info" } }
          );
        }
      });

      // 关闭 popup
      window.close();
  });
});
