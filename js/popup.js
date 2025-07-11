document.addEventListener('DOMContentLoaded', () => {
    const primaryColorInput = document.getElementById('primary-color');
    const backgroundColorInput = document.getElementById('background-color');
    const textColorInput = document.getElementById('text-color');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const applyButton = document.getElementById('apply-btn');
    const resetButton = document.getElementById('reset-btn');
    const previewBox = document.querySelector('.preview-box');

    // 更新预览
    function updatePreview() {
        const primary = primaryColorInput.value;
        const background = backgroundColorInput.value;
        const text = textColorInput.value;

        previewBox.style.setProperty('--preview-bg', background);
        previewBox.style.setProperty('--preview-text', text);
        previewBox.style.setProperty('--preview-primary', primary);
    }

    // 检查当前标签页是否是飞书文档
    async function checkCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            if (!currentTab?.url) return null;
            
            const url = new URL(currentTab.url);
            if (!url.hostname.includes('feishu')) {
                throw new Error('非飞书页面');
            }
            return currentTab;
        } catch (error) {
            console.error('检查标签页时出错:', error);
            return null;
        }
    }

    // 检查content script是否已注入
    async function ensureContentScriptInjected(tab) {
        if (!tab) return false;
        
        try {
            // 尝试发送ping消息
            await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
            return true;
        } catch (error) {
            try {
                // 如果消息发送失败，尝试注入脚本
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['js/main.js']
                });
                
                // 注入CSS
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ['css/material-colors.min.css', 'css/style.css']
                });
                
                // 再次尝试发送ping消息确认注入成功
                await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                return true;
            } catch (injectionError) {
                console.error('注入脚本时出错:', injectionError);
                return false;
            }
        }
    }

    // 应用主题
    async function applyCustomTheme() {
        try {
            const currentTab = await checkCurrentTab();
            if (!currentTab) {
                alert('请在飞书文档页面使用此插件');
                return;
            }

            const injected = await ensureContentScriptInjected(currentTab);
            if (!injected) {
                alert('无法注入主题脚本，请刷新页面后重试');
                return;
            }

            const theme = {
                primary: primaryColorInput.value,
                background: backgroundColorInput.value,
                text: textColorInput.value
            };

            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'applyTheme',
                customTheme: theme
            });

            if (response?.success) {
                await chrome.storage.local.set({lastTheme: theme});
            }
        } catch (error) {
            console.error('应用主题时出错:', error);
            alert('应用主题失败，请刷新页面后重试');
        }
    }

    // 应用预设主题
    async function applyPresetTheme(presetName) {
        try {
            const currentTab = await checkCurrentTab();
            if (!currentTab) {
                alert('请在飞书文档页面使用此插件');
                return;
            }

            const injected = await ensureContentScriptInjected(currentTab);
            if (!injected) {
                alert('无法注入主题脚本，请刷新页面后重试');
                return;
            }

            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'applyTheme',
                preset: presetName
            });

            if (response?.success) {
                await chrome.storage.local.set({lastPreset: presetName});
            }
        } catch (error) {
            console.error('应用预设主题时出错:', error);
            alert('应用主题失败，请刷新页面后重试');
        }
    }

    // 重置主题
    async function resetTheme() {
        try {
            const currentTab = await checkCurrentTab();
            if (!currentTab) {
                alert('请在飞书文档页面使用此插件');
                return;
            }

            const injected = await ensureContentScriptInjected(currentTab);
            if (!injected) {
                alert('无法注入主题脚本，请刷新页面后重试');
                return;
            }

            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'reset'
            });

            if (response?.success) {
                await chrome.storage.local.remove(['lastTheme', 'lastPreset']);
            }
        } catch (error) {
            console.error('重置主题时出错:', error);
            alert('重置主题失败，请刷新页面后重试');
        }
    }

    // 初始化插件
    async function initializePlugin() {
        try {
            const currentTab = await checkCurrentTab();
            if (!currentTab) {
                document.body.innerHTML = '<div class="error-message">请在飞书文档页面使用此插件</div>';
                return;
            }

            // 事件监听器
            primaryColorInput.addEventListener('input', updatePreview);
            backgroundColorInput.addEventListener('input', updatePreview);
            textColorInput.addEventListener('input', updatePreview);
            applyButton.addEventListener('click', applyCustomTheme);
            resetButton.addEventListener('click', resetTheme);

            presetButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const presetName = button.dataset.theme;
                    applyPresetTheme(presetName);
                });
            });

            // 初始化预览
            updatePreview();

            // 恢复上次使用的主题
            const result = await chrome.storage.local.get(['lastTheme', 'lastPreset']);
            if (result.lastPreset) {
                await applyPresetTheme(result.lastPreset);
            } else if (result.lastTheme) {
                primaryColorInput.value = result.lastTheme.primary;
                backgroundColorInput.value = result.lastTheme.background;
                textColorInput.value = result.lastTheme.text;
                updatePreview();
                await applyCustomTheme();
            }
        } catch (error) {
            console.error('初始化插件时出错:', error);
            document.body.innerHTML = '<div class="error-message">插件初始化失败，请刷新页面后重试</div>';
        }
    }

    // 启动插件
    initializePlugin();
}); 