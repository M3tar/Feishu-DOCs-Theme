// 预设主题配置
const THEMES = {
    'soft-beige': {
        primary: '#E8DCC4',
        background: '#FEF9EF',
        text: '#4A4A4A'
    },
    'warm-beige-1': {
        primary: '#E8DCC4',
        background: '#FAF5E9',
        text: '#4A4A4A'
    },
    'warm-beige-2': {
        primary: '#E8DCC4',
        background: '#F9F2E2',
        text: '#4A4A4A'
    },
    'warm-eye': {
        primary: '#F5DEB3',
        background: '#FDFBF7',
        text: '#333333'
    },
    'cool-eye': {
        primary: '#E0EEE0',
        background: '#F5F9F5',
        text: '#2F4F4F'
    },
    'natural': {
        primary: '#D2B48C',
        background: '#FAF9F6',
        text: '#3A3A3A'
    }
};

// 将颜色从 HEX 转换为 HSL
function hexToHSL(hex) {
    // 移除 # 号（如果存在）
    hex = hex.replace('#', '');
    
    // 将 hex 转换为 RGB
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: h * 360,
        s: s * 100,
        l: l * 100
    };
}

// 将 HSL 转换为 HEX
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// 生成背景色变体
function generateBackgroundVariants(primaryColor) {
    const hsl = hexToHSL(primaryColor);
    
    // 生成 --bg-body 的颜色（较亮的变体）
    const bgBody = hslToHex(
        hsl.h,
        Math.max(hsl.s * 0.3, 5), // 降低饱和度
        Math.min(hsl.l + 25, 98)  // 提高亮度，但不超过98%
    );
    
    // 生成 --bg-body-overlay 的颜色（稍微暗一点的变体）
    const bgBodyOverlay = hslToHex(
        hsl.h,
        Math.max(hsl.s * 0.4, 7), // 稍微高一点的饱和度
        Math.min(hsl.l + 20, 95)  // 亮度比bg-body低一点
    );
    
    return {
        bgBody,
        bgBodyOverlay
    };
}

// 应用主题的函数
function applyTheme(theme) {
    try {
        const style = document.createElement('style');
        
        // 移除之前的主题样式
        const oldStyle = document.getElementById('feishu-theme');
        if (oldStyle) {
            oldStyle.remove();
        }

        // 生成背景色变体
        const backgroundVariants = generateBackgroundVariants(theme.primary);

        // 创建新的主题样式
        const css = `
            /* 设置自定义属性 */
            :root {
                --custom-background-color: ${theme.background};
                --custom-text-color: ${theme.text};
                --custom-primary-color: ${theme.primary};
                --bg-body: ${theme.background};
                --bg-body-overlay: ${theme.background};
                --bg-float: ${theme.background};
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

// 辅助函数：调整颜色亮度
function adjustBrightness(color, percent) {
    try {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    } catch (error) {
        console.error('调整颜色亮度时出错:', error);
        return color;
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