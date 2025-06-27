// Кэш для ускорения расчетов
const contrastCache = new Map();

// Конвертация цвета в RGB
function parseColor(colorStr) {
    if (colorStr.startsWith('#')) {
        return hexToRgb(colorStr);
    }

    if (colorStr.startsWith('rgb')) {
        const [r, g, b] = colorStr.match(/\d+/g).map(Number);
        return { r, g, b };
    }

    return { r: 0, g: 0, b: 0 }; // Fallback
}

// HEX в RGB
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
}

// Расчет относительной яркости (WCAG 2.1)
function getLuminance(r, g, b) {
    const sRGB = [r, g, b].map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

// Расчет контрастности с кэшированием
function getContrastRatio(color1, color2) {
    const cacheKey = `${JSON.stringify(color1)}_${JSON.stringify(color2)}`;

    if (contrastCache.has(cacheKey)) {
        return contrastCache.get(cacheKey);
    }

    const lum1 = getLuminance(...Object.values(color1)) + 0.05;
    const lum2 = getLuminance(...Object.values(color2)) + 0.05;
    const ratio = Math.max(lum1, lum2) / Math.min(lum1, lum2);

    contrastCache.set(cacheKey, ratio);
    return ratio;
}

// Глобальный кэш элементов
let elementCache = new WeakMap();

export async function scanPage() {
    const startTime = performance.now();
    const elements = getTextElements();
    const results = {
        url: location.href,
        timestamp: new Date().toISOString(),
        elements: [],
        errors: []
    };

    // Асинхронная обработка с ограничением времени
    for (const el of elements.slice(0, 1000)) {
        if (performance.now() - startTime > 500) break; // Таймаут 500мс

        const elementData = await processElement(el);
        if (elementData) {
            results.elements.push(elementData);
            if (elementData.status === 'ERROR') {
                results.errors.push(elementData);
            }
        }
    }

    // Оптимизация: кэширование результатов
    sessionStorage.setItem('lastScan', JSON.stringify(results));
    return results;
}

// Получение текстовых элементов
function getTextElements() {
    const selectors = 'p, h1, h2, h3, h4, h5, h6, span, a, li, td, button, label';
    return Array.from(document.querySelectorAll(selectors))
        .filter(el => {
            const text = el.textContent.trim();
            return text.length > 0 && isVisible(el);
        });
}

// Проверка видимости элемента
function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

// Обработка элемента
async function processElement(el) {
    // Используем кэшированные данные при наличии
    if (elementCache.has(el)) {
        return elementCache.get(el);
    }

    const styles = getComputedStyle(el);
    const textColor = parseColor(styles.color);
    const bgColor = parseColor(getEffectiveBackground(el));

    const contrast = getContrastRatio(textColor, bgColor);
    const fontSize = parseFloat(styles.fontSize);
    const isLarge = fontSize >= 18 || (styles.fontWeight === 'bold' && fontSize >= 14);
    const required = isLarge ? 3 : 4.5;

    const result = {
        element: el.tagName,
        selector: cssPath(el),
        textColor: `rgb(${textColor.r},${textColor.g},${textColor.b})`,
        bgColor: `rgb(${bgColor.r},${bgColor.g},${bgColor.b})`,
        contrast: parseFloat(contrast.toFixed(2)),
        required,
        fontSize: `${fontSize}px`,
        status: contrast >= required ? 'OK' : 'ERROR',
        suggestion: contrast >= required ? '' : getColorSuggestion(textColor, bgColor)
    };

    elementCache.set(el, result);
    return result;
}

// Поиск реального фона элемента
function getEffectiveBackground(el) {
    while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)') return bg;
        el = el.parentElement;
    }
    return '#ffffff'; // Fallback
}

// Генерация CSS-пути
function cssPath(el) {
    const path = [];
    while (el) {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
            selector += `#${el.id}`;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.tagName === el.tagName) nth++;
            }
            if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentElement;
    }
    return path.join(' > ');
}

// Рекомендации по цветам
function getColorSuggestion(textColor, bgColor) {
    const targetLuminance = 0.05 + (getLuminance(...Object.values(bgColor)) * 4.5);
    return `Измените цвет текста на ${targetLuminance > 0.5 ? 'темнее' : 'светлее'}`;
}