document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
    const scanBtn = document.getElementById('scanBtn');
    const exportBtn = document.getElementById('exportBtn');
    const statusText = document.getElementById('scanStatus');

    scanBtn.addEventListener('click', startScan);
    exportBtn.addEventListener('click', exportReport);

    // Проверяем активную вкладку
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Если вкладка не поддерживается (chrome:// и т.д.), блокируем кнопку
    if (!isUrlSupported(tab.url)) {
        scanBtn.disabled = true;
        statusText.textContent = "Страница не поддерживается";
        return;
    }

    // Отправляем запрос на сканирование
    async function startScan() {
        statusText.textContent = "Сканирование...";
        scanBtn.disabled = true;

        try {
            // Проверяем, загружен ли контент-скрипт
            await ensureContentScriptLoaded(tab.id);

            const response = await chrome.tabs.sendMessage(tab.id, { action: "scanPage" });

            if (response && response.errors) {
                showResults(response.errors);
                chrome.runtime.sendMessage({ action: "updateIcon", count: response.errors.length });
            } else {
                throw new Error("Некорректный ответ от страницы");
            }
        } catch (e) {
            statusText.textContent = "Ошибка: " + e.message;
            console.error("Scan error:", e);
        } finally {
            scanBtn.disabled = false;
        }
    }

    // Гарантирует загрузку контент-скрипта
    async function ensureContentScriptLoaded(tabId) {
        try {
            // Пробуем отправить сообщение-пинг
            await chrome.tabs.sendMessage(tabId, { action: "ping" });
            return true;
        } catch (e) {
            // Если контент-скрипт не отвечает, внедряем его
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content/content-script.js']
                });

                // Ждем инициализации
                await new Promise(resolve => setTimeout(resolve, 300));
                return true;
            } catch (injectError) {
                console.error("Failed to inject content script:", injectError);
                throw new Error("Не удалось загрузить скрипт проверки");
            }
        }
    }

    function isUrlSupported(url) {
        try {
            const parsedUrl = new URL(url);
            const allowedProtocols = ['http:', 'https:'];
            return allowedProtocols.includes(parsedUrl.protocol);
        } catch (e) {
            return false;
        }
    }

    function showResults(errors) {
        const resultsDiv = document.getElementById('results');
        const errorCountSpan = document.getElementById('errorCount');
        const errorList = document.getElementById('errorList');

        resultsDiv.classList.remove('hidden');
        errorCountSpan.textContent = errors.length;
        errorList.innerHTML = '';

        if (errors.length === 0) {
            const li = document.createElement('li');
            li.textContent = "Нарушений контрастности не обнаружено";
            errorList.appendChild(li);
        } else {
            errors.slice(0, 10).forEach(error => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>${error.element}</strong>
                    <div>Контраст: ${error.contrast.toFixed(2)}:1 (требуется ${error.required}:1)</div>
                    <div>Рекомендация: ${error.suggestion}</div>
                `;
                errorList.appendChild(li);
            });
        }

        statusText.textContent = errors.length > 0 ?
            "Найдены ошибки" : "Ошибок не обнаружено";
    }

    function exportReport() {
        chrome.tabs.sendMessage(tab.id, { action: "exportReport" }, (response) => {
            if (response && response.url) {
                chrome.downloads.download({
                    url: response.url,
                    filename: `contrast-report-${new Date().toISOString().slice(0, 10)}.json`,
                    saveAs: true
                });
            } else {
                alert("Не удалось экспортировать отчет");
            }
        });
    }
}