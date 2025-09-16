// 通知处理模块
// 提供统一的通知接口，兼容不同环境和设置

class NotificationHandler {
  /**
   * 显示通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型 ('info', 'error', 'warning')
   * @param {string} title - 通知标题
   */
  static show(message, type = 'info', title = '划词翻译助手') {
    // 首先尝试使用浏览器通知API
    if (chrome && chrome.notifications) {
      this.showBrowserNotification(message, type, title)
        .catch(() => {
          // 如果浏览器通知失败，回退到页面内通知
          this.showPageNotification(message, type);
        });
    } else {
      // 如果没有浏览器通知API，使用页面内通知
      this.showPageNotification(message, type);
    }
  }

  /**
   * 显示浏览器系统通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型
   * @param {string} title - 通知标题
   */
  static async showBrowserNotification(message, type, title) {
    return new Promise((resolve, reject) => {
      try {
        // 检查通知权限
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          title: title,
          message: message,
          priority: type === 'error' ? 2 : 0
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.warn('浏览器通知创建失败，回退到页面内通知:', chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
          } else {
            console.log('浏览器通知显示成功');
            // 3秒后清除通知
            setTimeout(() => {
              chrome.notifications.clear(notificationId);
            }, 3000);
            resolve();
          }
        });
      } catch (error) {
        console.warn('浏览器通知异常，回退到页面内通知:', error.message);
        reject(error);
      }
    });
  }

  /**
   * 显示页面内通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型
   */
  static showPageNotification(message, type) {
    try {
      // 创建通知元素
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        background-color: ${this.getBackgroundColor(type)};
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
    } catch (error) {
      console.error('页面内通知显示失败:', error.message);
      // 最后的回退方案：使用浏览器控制台
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * 根据通知类型获取背景颜色
   * @param {string} type - 通知类型
   * @returns {string} 背景颜色
   */
  static getBackgroundColor(type) {
    switch (type) {
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      default:
        return '#4CAF50';
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationHandler;
}