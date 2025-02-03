export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(0) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    if (num >= 1) return num.toFixed(0);
    return num.toString();
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        workload: params.get('workload') || 'morningPeak'
    };
}

export const queryParams = getQueryParams();

export function updateSavedCosts(logs) {
    const costDiffPanel = document.getElementById('costSavedTip');
    costDiffPanel.style.display = 'block';
    costDiffPanel.innerHTML = logs.map(log => {
        const [key, value] = log.split(': ');
        return `<div class="cost-entry"><span class="cost-key">${key}:</span><span class="cost-value">${value}</span></div>`;
    }).join('');
}
