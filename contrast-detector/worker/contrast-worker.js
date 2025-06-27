// Веб-воркер для ресурсоемких вычислений
self.addEventListener('message', (e) => {
    const { colors } = e.data;
    const results = [];

    for (const [textColor, bgColor] of colors) {
        const contrast = calculateContrast(textColor, bgColor);
        results.push({ textColor, bgColor, contrast });
    }

    self.postMessage(results);
});

function calculateContrast(color1, color2) {
    // Упрощенный расчет для воркера
    const lum1 = relativeLuminance(color1);
    const lum2 = relativeLuminance(color2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

function relativeLuminance({ r, g, b }) {
    const [sr, sg, sb] = [r, g, b].map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
}