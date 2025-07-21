document.addEventListener('DOMContentLoaded', () => {
    const backgroundColorInput = document.getElementById('background-color');
    const textColorInput = document.getElementById('text-color');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const applyButton = document.getElementById('apply-btn');
    const resetButton = document.getElementById('reset-btn');
    const previewBox = document.querySelector('.preview-box');
    const pluginToggle = document.getElementById('plugin-toggle');

    // 初始化插件状态
    async function initializePluginState() {
        const { enabled = true } = await chrome.storage.local.get('enabled');
        pluginToggle.checked = enabled;
        document.body.classList.toggle('plugin-disabled', !enabled);
        updatePluginState(enabled);
    }

    // 更新插件状态
    async function updatePluginState(enabled) {
        try {
            await chrome.storage.local.set({ enabled });
            
            // 获取当前标签页
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (currentTab?.url?.includes('feishu')) {
                // 确保content script已注入
                const injected = await ensureContentScriptInjected(currentTab);
                if (!injected) {
                    console.warn('无法注入content script，将在页面刷新后生效');
                    return;
                }

                try {
                    // 通知content script更新状态
                    await chrome.tabs.sendMessage(currentTab.id, {
                        action: enabled ? 'enable' : 'disable'
                    });

                    if (enabled) {
                        // 如果启用插件，恢复上次的主题
                        const result = await chrome.storage.local.get(['lastTheme', 'lastPreset']);
                        if (result.lastPreset) {
                            await applyPresetTheme(result.lastPreset);
                        } else if (result.lastTheme) {
                            // 恢复自定义颜色
                            backgroundColorInput.value = result.lastTheme.background;
                            textColorInput.value = result.lastTheme.text;
                            updatePreview();
                            await applyCustomTheme();
                        }
                    } else {
                        // 如果禁用插件，恢复默认配置
                        await resetTheme();
                    }
                } catch (messageError) {
                    // 如果发送消息失败，可能是页面刚刚加载或刷新
                    console.warn('无法与页面通信，请刷新页面后重试');
                    // 不抛出错误，让用户刷新页面后重试
                }
            }
        } catch (error) {
            console.error('更新插件状态时出错:', error);
            // 不要显示错误提示，因为这可能只是暂时的连接问题
        }
    }

    // 更新预览
    function updatePreview() {
        const background = backgroundColorInput.value;
        const text = textColorInput.value;

        previewBox.style.setProperty('--preview-bg', background);
        previewBox.style.setProperty('--preview-text', text);
    }

    // 更新主题按钮状态
    function updatePresetButtonStates(activePreset) {
        presetButtons.forEach(button => {
            if (button.dataset.theme === activePreset) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // 重置主题按钮状态
    function resetPresetButtonStates() {
        presetButtons.forEach(button => {
            button.classList.remove('active');
        });
    }

    // 检查当前标签页是否是飞书文档
    async function checkCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            if (!currentTab?.url) return null;
            
            const url = new URL(currentTab.url);
            if (!url.hostname.includes('feishu')) {
                showNonFeishuUI();
                return null;
            }
            return currentTab;
        } catch (error) {
            console.error('检查标签页时出错:', error);
            return null;
        }
    }

    // 显示非飞书文档页面的UI
    function showNonFeishuUI() {
        document.body.classList.add('non-feishu');
        document.querySelector('.container').innerHTML = `
            <h2>飞书文档主题助手</h2>
            <p>请在飞书文档页面使用此插件</p>
        `;
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
                
                // 等待一小段时间确保脚本加载
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 再次尝试发送ping消息确认注入成功
                await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                return true;
            } catch (injectionError) {
                console.warn('注入脚本时出错:', injectionError);
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

            // 更新按钮状态
            updatePresetButtonStates(presetName);

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

            // 重置按钮状态
            resetPresetButtonStates();

            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'reset'
            });

            if (response?.success) {
                // 不要在禁用状态下清除lastTheme和lastPreset
                if (pluginToggle.checked) {
                    await chrome.storage.local.remove(['lastTheme', 'lastPreset']);
                }
                // 重置自定义颜色输入
                backgroundColorInput.value = '#FDFBF7';
                textColorInput.value = '#333333';
                updatePreview();
            }
        } catch (error) {
            console.error('重置主题时出错:', error);
            alert('重置主题失败，请刷新页面后重试');
        }
    }

    // 初始化插件
    async function initializePlugin() {
        try {
            // 初始化插件状态
            await initializePluginState();

            const currentTab = await checkCurrentTab();
            if (!currentTab) {
                return;
            }

            // 事件监听器
            pluginToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                document.body.classList.toggle('plugin-disabled', !enabled);
                updatePluginState(enabled);
            });

            backgroundColorInput.addEventListener('input', () => {
                updatePreview();
                resetPresetButtonStates();
            });
            textColorInput.addEventListener('input', () => {
                updatePreview();
                resetPresetButtonStates();
            });
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
            const { enabled } = await chrome.storage.local.get('enabled');
            if (enabled) {
                const result = await chrome.storage.local.get(['lastTheme', 'lastPreset']);
                if (result.lastPreset) {
                    updatePresetButtonStates(result.lastPreset);
                    await applyPresetTheme(result.lastPreset);
                } else if (result.lastTheme) {
                    backgroundColorInput.value = result.lastTheme.background;
                    textColorInput.value = result.lastTheme.text;
                    updatePreview();
                    await applyCustomTheme();
                }
            }
        } catch (error) {
            console.error('初始化插件时出错:', error);
        }
    }

    // 启动插件
    initializePlugin();
}); 