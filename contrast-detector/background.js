// background.js - фоновый сервис расширения
const SCAN_HISTORY_KEY = 'scanHistory';
const SETTINGS_KEY = 'userSettings';

// Инициализация хранилища при установке
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get([SCAN_HISTORY_KEY, SETTINGS_KEY], (result) => {
        if (!result[SCAN_HISTORY_KEY]) {
            chrome.storage.local.set({ [SCAN_HISTORY_KEY]: [] });
        }

        if (!result[SETTINGS_KEY]) {
            chrome.storage.local.set({
                [SETTINGS_KEY]: {
                    autoScan: true,
                    notifyErrors: true,
                    minContrastLevel: 4.5
                }
            });
        }
    });

    // Контекстное меню для быстрой проверки
    chrome.contextMenus.create({
        id: "check-contrast",
        title: "Проверить контрастность",
        contexts: ["page"]
    });
});

// Обработчик сообщений от других частей расширения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "updateIcon":
            updateIcon(request.count);
            break;

        case "getTabData":
            getActiveTabInfo().then(tabInfo => sendResponse(tabInfo));
            return true; // Асинхронный ответ

        case "saveScanResult":
            saveScanResult(request.data);
            break;

        case "getSettings":
            getSettings().then(settings => sendResponse(settings));
            return true;

        case "updateSettings":
            updateSettings(request.settings);
            break;

        case "getHistory":
            getScanHistory().then(history => sendResponse(history));
            return true;
    }
});

// Обновление иконки расширения
function updateIcon(errorCount) {
    const iconPaths = {
        "16": errorCount > 0 ? "icons/icon-alert16.png" : "icons/icon16.png",
        "32": errorCount > 0 ? "icons/icon-alert32.png" : "icons/icon32.png",
        "48": errorCount > 0 ? "icons/icon-alert48.png" : "icons/icon48.png"
    };

    chrome.action.setIcon({ path: iconPaths });

    // Уведомление пользователя
    if (errorCount > 0) {
        getSettings().then(settings => {
            if (settings.notifyErrors) {
                try {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon-alert48.png',
                        title: 'Обнаружены проблемы контрастности',
                        message: `Найдено ${errorCount} нарушений WCAG на странице`
                    });
                } catch (e) {
                    console.error("Notification failed:", e);
                }
            }
        });
    }
}

// Получение информации об активной вкладке
async function getActiveTabInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return {
            url: tab.url,
            title: tab.title,
            id: tab.id
        };
    } catch (e) {
        console.error("Failed to get active tab:", e);
        return {};
    }
}

// Сохранение результатов сканирования
async function saveScanResult(scanData) {
    try {
        const history = await getScanHistory();
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            url: scanData.url,
            errorCount: scanData.errors.length,
            elementsScanned: scanData.elements.length,
            details: scanData
        };

        // Сохраняем только последние 50 записей
        const newHistory = [newEntry, ...history].slice(0, 50);

        await chrome.storage.local.set({ [SCAN_HISTORY_KEY]: newHistory });
    } catch (e) {
        console.error("Failed to save scan result:", e);
    }
}

// Получение истории сканирований
function getScanHistory() {
    return new Promise(resolve => {
        chrome.storage.local.get([SCAN_HISTORY_KEY], result => {
            resolve(result[SCAN_HISTORY_KEY] || []);
        });
    });
}

// Получение настроек пользователя
function getSettings() {
    return new Promise(resolve => {
        chrome.storage.local.get([SETTINGS_KEY], result => {
            resolve(result[SETTINGS_KEY] || {
                autoScan: true,
                notifyErrors: true,
                minContrastLevel: 4.5
            });
        });
    });
}

// Обновление настроек
function updateSettings(newSettings) {
    chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });

    // Применяем изменения ко всем открытым вкладкам
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
            try {
                chrome.tabs.sendMessage(tab.id, {
                    action: "settingsUpdated",
                    settings: newSettings
                });
            } catch (e) {
                // Игнорируем ошибки для вкладок без контент-скрипта
            }
        });
    });
}

// Очистка старых данных при обновлении страницы
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        try {
            chrome.tabs.sendMessage(tabId, { action: "clearHighlights" });
        } catch (e) {
            // Игнорируем ошибки для вкладок без контент-скрипта
        }
    }
});

// Контекстное меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "check-contrast") {
        try {
            chrome.tabs.sendMessage(tab.id, { action: "scanPage" });
        } catch (e) {
            console.error("Context menu scan failed:", e);
        }
    }
});

export default {};
