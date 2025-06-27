// Импорт функций из ядра с использованием динамического импорта
let scanPage;
(async () => {
    try {
        const coreModule = await import(chrome.runtime.getURL('core/contrast-core.js'));
        scanPage = coreModule.scanPage;
    } catch (e) {
        console.error("Failed to load core module:", e);
    }
})();

// Состояние расширения на странице
let isActive = false;
let currentErrors = [];

// Функция для подсветки элементов с ошибками
function highlightErrors(errors) {
    // Сначала убираем старую подсветку
    removeHighlights();

    // Запоминаем текущие ошибки
    currentErrors = errors;

    // Добавляем новую подсветку
    errors.forEach(error => {
        try {
            const elements = document.querySelectorAll(error.selector);
            elements.forEach(el => {
                el.classList.add('wcag-error');

                // Добавляем кастомный атрибут с информацией
                el.setAttribute('data-wcag-error',
                    `Контраст: ${error.contrast}:1 (требуется ${error.required}:1)`);
            });
        } catch (e) {
            console.error('Error highlighting element:', error.selector, e);
        }
    });
}

// Удаление подсветки
function removeHighlights() {
    document.querySelectorAll('.wcag-error, .wcag-warning').forEach(el => {
        el.classList.remove('wcag-error', 'wcag-warning');
        el.removeAttribute('data-wcag-error');
    });
    currentErrors = [];
}

// Обработчик сообщений от popup и background
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    // Обработчик для проверки связи
    if (request.action === "ping") {
        sendResponse({ status: "pong" });
        return true;
    }

    if (request.action === "scanPage") {
        try {
            // Ждем загрузки core-модуля при первом вызове
            if (!scanPage) {
                const coreModule = await import(chrome.runtime.getURL('core/contrast-core.js'));
                scanPage = coreModule.scanPage;
            }

            const results = await scanPage();
            highlightErrors(results.errors);
            sendResponse({ errors: results.errors });
        } catch (e) {
            console.error("Scan failed:", e);
            sendResponse({ error: e.message });
        }
        return true; // Для асинхронного ответа
    }

    if (request.action === "clearHighlights") {
        removeHighlights();
        sendResponse({ status: "cleared" });
    }

    if (request.action === "exportReport") {
        try {
            const results = await scanPage();
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            sendResponse({ url });
        } catch (e) {
            console.error("Export failed:", e);
            sendResponse({ error: "Export failed" });
        }
    }

    if (request.action === "settingsUpdated") {
        // Обновляем настройки в контент-скрипте
        console.log("Settings updated", request.settings);
    }
});

// Автоматическая проверка при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Задержка для загрузки динамического контента
    setTimeout(async () => {
        try {
            const settings = await chrome.storage.local.get(['autoScan']);
            if (settings.autoScan) {
                isActive = true;

                // Гарантируем загрузку модуля
                if (!scanPage) {
                    const coreModule = await import(chrome.runtime.getURL('core/contrast-core.js'));
                    scanPage = coreModule.scanPage;
                }

                const results = await scanPage();
                highlightErrors(results.errors);

                // Отправляем уведомление в background
                chrome.runtime.sendMessage({
                    action: "updateIcon",
                    count: results.errors.length
                });
            }
        } catch (e) {
            console.error("Auto scan failed:", e);
        }
    }, 3000);
});

// Перепроверка при изменениях DOM
const observer = new MutationObserver(async mutations => {
    if (!isActive) return;

    let needsRescan = false;

    mutations.forEach(mutation => {
        // Проверяем, были ли изменения в релевантных элементах
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'style' ||
                mutation.attributeName === 'class')) {
            needsRescan = true;
        }

        // Проверяем добавление/удаление элементов
        if (mutation.type === 'childList') {
            needsRescan = true;
        }
    });

    if (needsRescan) {
        try {
            const results = await scanPage();
            highlightErrors(results.errors);
            chrome.runtime.sendMessage({
                action: "updateIcon",
                count: results.errors.length
            });
        } catch (e) {
            console.error("Rescan failed:", e);
        }
    }
});

// Настройка observer
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
});

// Обработка ручного запуска/остановки (для отладки)
window.toggleAccessibilityScanner = () => {
    isActive = !isActive;
    if (isActive) {
        scanPage().then(highlightErrors).catch(e => console.error("Toggle scan failed:", e));
    } else {
        removeHighlights();
    }
    return isActive;
};