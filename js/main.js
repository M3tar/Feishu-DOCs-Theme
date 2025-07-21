// 预设主题配置
const THEMES = {
    'soft-beige': {
        background: '#FEF9EF',
        text: '#4A4A4A'
    },
    'warm-beige-1': {
        background: '#FAF5E9',
        text: '#4A4A4A'
    },
    'warm-beige-2': {
        background: '#F9F2E2',
        text: '#4A4A4A'
    },
    'warm-eye': {
        background: '#FDFBF7',
        text: '#333333'
    },
    'cool-eye': {
        background: '#F5F9F5',
        text: '#2F4F4F'
    },
    'natural': {
        background: '#FAF9F6',
        text: '#3A3A3A'
    }
};

// 应用主题的函数
function applyTheme(theme) {
    try {
        const style = document.createElement('style');
        
        // 移除之前的主题样式
        const oldStyle = document.getElementById('feishu-theme');
        if (oldStyle) {
            oldStyle.remove();
        }

        // 创建新的主题样式
        const css = `
            /* 设置自定义属性 */
            :root {
                --custom-background-color: ${theme.background};
                --custom-text-color: ${theme.text};
                --bg-body: ${theme.background};
                --bg-body-overlay: ${theme.background};
                --bg-float: ${theme.background};
                --text-title: ${theme.text};
                --text-caption: ${theme.text};
            }

            /* 应用背景色样式 */
            .lark-editor-sidebar,
            .lark-editor-main,
            .lark-editor-header,
            .mindmap-container,
            .lark-editor-workspace,
            .toolbar-container,
            .sidebar-container,
            .lark-popover,
            .lark-dropdown-menu {
                background-color: ${theme.background} !important;
            }

            /* 处理page-main-item editor类 */
            .page-main-item.editor,
            .page-main-item.editor .editor-container,
            .page-main-item.editor .editor-content {
                background-color: ${theme.background} !important;
            }

            /* 处理目录滚动容器 */
            .scrollbar-container.catalogue__scroller.scrollbar-container-small.ps {
                background-color: ${theme.background} !important;
            }

            /* 处理滚动条样式 */
            .scrollbar-container.catalogue__scroller.scrollbar-container-small.ps::-webkit-scrollbar {
                width: 6px;
            }

            .scrollbar-container.catalogue__scroller.scrollbar-container-small.ps::-webkit-scrollbar-track {
                background-color: ${theme.background} !important;
            }

            .scrollbar-container.catalogue__scroller.scrollbar-container-small.ps::-webkit-scrollbar-thumb {
                background-color: ${theme.text} !important;
                opacity: 0.2;
                border-radius: 3px;
            }

            /* 处理wiki-md模式下的页面区域 */
            .page-main.docx-width-mode-standard.synced-new-ui.synced-overflow-ui.normal-font-size.docx-width-mode.page-main-in-wiki-md,
            .page-main.docx-width-mode-standard.synced-new-ui.synced-overflow-ui.normal-font-size.docx-width-mode.page-main-in-wiki-md .wiki-content {
                background-color: ${theme.background} !important;
            }

            /* wiki-md模式下的文本内容 */
            .page-main.docx-width-mode-standard.synced-new-ui.synced-overflow-ui.normal-font-size.docx-width-mode.page-main-in-wiki-md .wiki-content * {
                color: var(--custom-text-color) !important;
            }

            /* 处理目录列表 */
            .catalogue__list.show-full,
            .catalogue__list.show-full .catalogue-item,
            .catalogue__main-wrapper,
            .catalogue__main-wrapper * {
                background-color: ${theme.background} !important;
            }

            /* 目录主包装器内的分隔线和边框 */
            .catalogue__main-wrapper .catalogue-divider,
            .catalogue__main-wrapper .catalogue-border {
                border-color: ${theme.text} !important;
                opacity: 0.1;
            }

            /* 通用文档内容文字颜色 */
            .docs-editor-container,
            .docs-editor-container *,
            .docs-title,
            .docs-title *,
            .docs-content p,
            .docs-content div,
            .docs-content span,
            [data-slate-node="text"],
            .slate-editor [data-slate-node="text"] {
                color: ${theme.text} !important;
            }
        `;

        style.id = 'feishu-theme';
        style.textContent = css;
        document.head.appendChild(style);

        // 添加MutationObserver以处理动态加载的内容
        if (!window._themeObserver) {
            window._themeObserver = new MutationObserver((mutations) => {
                const newStyle = document.getElementById('feishu-theme');
                if (!newStyle) {
                    document.head.appendChild(style.cloneNode(true));
                }
            });

            window._themeObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        return true;
    } catch (error) {
        console.error('应用主题样式时出错:', error);
        return false;
    }
}



// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        // 添加ping响应
        if (request.action === 'ping') {
            sendResponse({success: true});
            return true;
        }
        
        // 处理启用/禁用请求
        if (request.action === 'disable') {
            const oldStyle = document.getElementById('feishu-theme');
            if (oldStyle) {
                oldStyle.remove();
            }
            // 停止观察器
            if (window._themeObserver) {
                window._themeObserver.disconnect();
                delete window._themeObserver;
            }
            sendResponse({success: true});
            return true;
        }

        if (request.action === 'enable') {
            // 恢复主题将通过后续的 applyTheme 消息处理
            sendResponse({success: true});
            return true;
        }
        
        if (request.action === 'applyTheme') {
            let success = false;
            if (request.preset && THEMES[request.preset]) {
                success = applyTheme(THEMES[request.preset]);
            } else if (request.customTheme) {
                success = applyTheme(request.customTheme);
            }
            sendResponse({success});
        } else if (request.action === 'reset') {
            const oldStyle = document.getElementById('feishu-theme');
            if (oldStyle) {
                oldStyle.remove();
            }
            // 停止观察器
            if (window._themeObserver) {
                window._themeObserver.disconnect();
                delete window._themeObserver;
            }
            sendResponse({success: true});
        } else {
            sendResponse({success: false, error: '未知的操作类型'});
        }
    } catch (error) {
        console.error('处理消息时出错:', error);
        sendResponse({success: false, error: error.message});
    }
    return true; // 保持消息通道开放
});