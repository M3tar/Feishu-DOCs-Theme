// 检查是否是飞书文档页面
function isFeishuDocsPage(url) {
    return url && (
        url.includes('.feishu.cn/') ||
        url.includes('.feishu.com/') ||
        url.includes('.larksuite.com/')
    );
}

// 应用主题到页面
async function applyThemeToPage(tabId) {
    try {
        // 获取插件状态和上次使用的主题
        const { enabled = true, lastTheme, lastPreset } = await chrome.storage.local.get(['enabled', 'lastTheme', 'lastPreset']);
        
        if (!enabled) {
            return; // 如果插件未启用，不执行任何操作
        }

        // 等待一小段时间确保content script已加载
        await new Promise(resolve => setTimeout(resolve, 500));

        // 尝试应用主题，如果失败可能是因为content script还没准备好
        try {
            if (lastPreset) {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'applyTheme',
                    preset: lastPreset
                });
            } else if (lastTheme) {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'applyTheme',
                    customTheme: lastTheme
                });
            }
        } catch (error) {
            // 如果消息发送失败，可能是因为页面还在加载中，这是正常的
            console.log('主题将在页面完全加载后应用');
        }
    } catch (error) {
        console.error('应用主题时出错:', error);
    }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && isFeishuDocsPage(tab.url)) {
        applyThemeToPage(tabId);
    }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (isFeishuDocsPage(tab.url)) {
            applyThemeToPage(tab.id);
        }
    } catch (error) {
        console.error('获取标签页信息时出错:', error);
    }
}); 