document.addEventListener('DOMContentLoaded', () => {
    const backgroundColorInput = document.getElementById('background-color');
    const textColorInput = document.getElementById('text-color');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const presetGrid = document.querySelector('.preset-grid');
    const applyButton = document.getElementById('apply-btn');
    const resetButton = document.getElementById('reset-btn');
    const previewBox = document.querySelector('.preview-box');
    const pluginToggle = document.getElementById('plugin-toggle');
    const themeNameInput = document.getElementById('theme-name-input');
    const saveOnlyButton = document.getElementById('save-only-btn');
    const saveApplyButton = document.getElementById('save-apply-btn');

    // 初始化插件状态
    async function initializePluginState() {
        const { enabled = true } = await chrome.storage.local.get('enabled');
        pluginToggle.checked = enabled;
        document.body.classList.toggle('plugin-disabled', !enabled);
        updatePluginState(enabled);
    }

    // 加载自定义主题
    async function loadCustomThemes() {
        try {
            const result = await chrome.storage.local.get('customThemes');
            const customThemes = result.customThemes || {};
            
            // 移除之前的自定义主题按钮
            const existingCustomButtons = presetGrid.querySelectorAll('.preset-btn.custom-theme');
            existingCustomButtons.forEach(button => button.remove());
            
            // 添加自定义主题按钮
            Object.entries(customThemes).forEach(([themeId, theme]) => {
                createCustomThemeButton(themeId, theme);
            });
            
            // 更新保存按钮状态
            updateSaveButtonState();
        } catch (error) {
            console.error('加载自定义主题时出错:', error);
        }
    }

    // 创建自定义主题按钮
    function createCustomThemeButton(themeId, theme) {
        const button = document.createElement('button');
        button.className = 'preset-btn custom-theme';
        button.dataset.theme = themeId;
        
        button.innerHTML = `
            <span class="theme-name">${theme.name}</span>
            <span class="theme-preview" style="background: ${theme.background}"></span>
            <button class="delete-btn" title="删除主题"></button>
        `;
        
        // 添加点击事件
        button.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn')) {
                applyPresetTheme(themeId);
            }
        });
        
        // 添加删除事件
        const deleteBtn = button.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCustomTheme(themeId);
        });
        
        presetGrid.appendChild(button);
    }

    // 检查主题名称输入是否有效
    function isThemeNameValid() {
        const themeName = themeNameInput.value.trim();
        return themeName.length > 0 && themeName.length <= 10;
    }

    // 更新保存按钮状态
    async function updateSaveButtonState() {
        try {
            const result = await chrome.storage.local.get('customThemes');
            const customThemes = result.customThemes || {};
            const count = Object.keys(customThemes).length;
            const nameValid = isThemeNameValid();
            
            // 检查是否已达到上限
            const isLimitReached = count >= 6;
            
            // 检查主题名称是否重复
            const themeName = themeNameInput.value.trim();
            const existingNames = Object.values(customThemes).map(theme => theme.name);
            const isDuplicate = existingNames.includes(themeName);
            
            const canSave = nameValid && !isLimitReached && !isDuplicate;
            
            saveOnlyButton.disabled = !canSave;
            saveApplyButton.disabled = !canSave;
            
            const hintElement = document.querySelector('.save-theme-hint');
            if (hintElement) {
                if (isLimitReached) {
                    hintElement.textContent = '已达到自定义主题上限（6个）';
                    hintElement.style.color = '#ff3b30';
                } else if (isDuplicate && themeName) {
                    hintElement.textContent = '主题名称已存在';
                    hintElement.style.color = '#ff3b30';
                } else {
                    hintElement.textContent = `最多可保存6个自定义主题（已保存${count}个）`;
                    hintElement.style.color = '#86868b';
                }
            }
        } catch (error) {
            console.error('更新保存按钮状态时出错:', error);
        }
    }

    // 保存自定义主题
    async function saveCustomTheme(shouldApply = false) {
        const themeName = themeNameInput.value.trim();
        if (!themeName) {
            alert('请输入主题名称');
            return;
        }
        
        if (themeName.length > 10) {
            alert('主题名称不能超过10个字符');
            return;
        }
        
        try {
            const result = await chrome.storage.local.get('customThemes');
            const customThemes = result.customThemes || {};
            
            // 检查是否已达到上限
            if (Object.keys(customThemes).length >= 6) {
                alert('最多只能保存6个自定义主题，请先删除一个主题');
                return;
            }
            
            // 检查主题名称是否重复
            const existingNames = Object.values(customThemes).map(theme => theme.name);
            if (existingNames.includes(themeName)) {
                alert('主题名称已存在，请使用其他名称');
                return;
            }
            
            // 生成主题ID
            const themeId = 'custom-' + Date.now();
            
            // 保存主题
            const newTheme = {
                name: themeName,
                background: backgroundColorInput.value,
                text: textColorInput.value
            };
            
            customThemes[themeId] = newTheme;
            await chrome.storage.local.set({ customThemes });
            
            // 清空输入框
            themeNameInput.value = '';
            
            // 重新加载自定义主题
            await loadCustomThemes();
            
            // 如果需要应用主题
            if (shouldApply) {
                await applyPresetTheme(themeId);
                alert('主题保存并应用成功！');
            } else {
                alert('主题保存成功！');
            }
            
        } catch (error) {
            console.error('保存主题时出错:', error);
            alert('保存主题失败，请重试');
        }
    }

    // 删除自定义主题
    async function deleteCustomTheme(themeId) {
        if (!confirm('确定要删除这个主题吗？')) {
            return;
        }
        
        try {
            const result = await chrome.storage.local.get('customThemes');
            const customThemes = result.customThemes || {};
            
            delete customThemes[themeId];
            
            await chrome.storage.local.set({ customThemes });
            
            // 如果删除的是当前使用的主题，清除记录
            const { lastPreset } = await chrome.storage.local.get('lastPreset');
            if (lastPreset === themeId) {
                await chrome.storage.local.remove('lastPreset');
            }
            
            // 重新加载自定义主题
            await loadCustomThemes();
            
        } catch (error) {
            console.error('删除主题时出错:', error);
            alert('删除主题失败，请重试');
        }
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
                        await restoreLastTheme();
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

    // 恢复上次使用的主题
    async function restoreLastTheme() {
        try {
            const result = await chrome.storage.local.get(['lastTheme', 'lastPreset']);
            if (result.lastPreset) {
                updatePresetButtonStates(result.lastPreset);
                await applyPresetTheme(result.lastPreset);
            } else if (result.lastTheme) {
                // 恢复自定义颜色
                backgroundColorInput.value = result.lastTheme.background;
                textColorInput.value = result.lastTheme.text;
                updatePreview();
                await applyCustomTheme();
            }
        } catch (error) {
            console.error('恢复主题时出错:', error);
        }
    }

    // 更新预览
    function updatePreview() {
        const background = backgroundColorInput.value;
        const text = textColorInput.value;

        previewBox.style.setProperty('--preview-bg', background);
        previewBox.style.setProperty('--preview-text', text);
        
        // 实时更新保存按钮状态
        updateSaveButtonState();
    }

    // 更新主题按钮状态
    function updatePresetButtonStates(activePreset) {
        const allPresetButtons = presetGrid.querySelectorAll('.preset-btn');
        allPresetButtons.forEach(button => {
            if (button.dataset.theme === activePreset) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // 重置主题按钮状态
    function resetPresetButtonStates() {
        const allPresetButtons = presetGrid.querySelectorAll('.preset-btn');
        allPresetButtons.forEach(button => {
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
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <h2>飞书文档主题助手</h2>
                <p>请在飞书文档页面使用此插件</p>
            `;
        }
    }

    // 检查content script是否已注入
    async function ensureContentScriptInjected(tab) {
        if (!tab) return false;
        
        try {
            // 尝试发送ping消息，多次重试确保content script已加载
            let retries = 3;
            while (retries > 0) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                    return true;
                } catch (error) {
                    retries--;
                    if (retries > 0) {
                        // 等待一段时间后重试
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }
            }
            
            // 所有重试都失败了，可能页面需要刷新
            console.warn('无法与content script通信，可能需要刷新页面');
            return false;
        } catch (error) {
            console.warn('检查content script时出错:', error);
            return false;
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
                await chrome.storage.local.remove('lastPreset'); // 清除预设主题记录
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
                await chrome.storage.local.remove('lastTheme'); // 清除自定义主题记录
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
            
            // 加载自定义主题
            await loadCustomThemes();

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
            
            // 主题名称输入时实时更新按钮状态
            themeNameInput.addEventListener('input', updateSaveButtonState);
            
            applyButton.addEventListener('click', applyCustomTheme);
            resetButton.addEventListener('click', resetTheme);
            
            // 新的保存按钮事件
            saveOnlyButton.addEventListener('click', () => saveCustomTheme(false));
            saveApplyButton.addEventListener('click', () => saveCustomTheme(true));

            // 主题名称输入框回车保存并应用
            themeNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !saveApplyButton.disabled) {
                    saveCustomTheme(true);
                }
            });

            // 为现有预设按钮添加事件监听器
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
                await restoreLastTheme();
            }
        } catch (error) {
            console.error('初始化插件时出错:', error);
        }
    }

    // 启动插件
    initializePlugin();
}); 