export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(0) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toString();
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        workload: params.get('workload') || 'morningPeak'
    };
}

export const queryParams = getQueryParams();

export function updateDebugPanel(logs) {
    const debugPanel = document.getElementById('debugPanel');
    debugPanel.innerHTML = logs.join('<br>');
}
