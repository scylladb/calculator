import {cfg} from './config.js';
import {updateCosts} from "./calculator.js";
import {updateChart} from "./chart.js";

export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    if (num >= 1) return num.toFixed(0);
    return num.toString();
}

export function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

export function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('workload')) cfg.workload = params.get('workload');
    if (params.get('baselineReads')) cfg.baselineReads = parseInt(params.get('baselineReads'));
    if (params.get('baselineWrites')) cfg.baselineWrites = parseInt(params.get('baselineWrites'));
    if (params.get('peakReads')) cfg.peakReads = parseInt(params.get('peakReads'));
    if (params.get('peakWrites')) cfg.peakWrites = parseInt(params.get('peakWrites'));
    if (params.get('peakDurationReads')) cfg.peakDurationReads = parseInt(params.get('peakDurationReads'));
    if (params.get('peakDurationWrites')) cfg.peakDurationWrites = parseInt(params.get('peakDurationWrites'));
    if (params.get('storageGB')) cfg.storageGB = parseInt(params.get('storageGB'));
    if (params.get('itemSizeB')) cfg.itemSizeB = parseInt(params.get('itemSizeB'));
    if (params.get('pricing')) cfg.pricing = params.get('pricing');
    if (params.get('regions')) cfg.regions = parseInt(params.get('regions'));
    if (params.get('cacheSizeGB')) cfg.cacheSizeGB = parseInt(params.get('cacheSizeGB'));
    if (params.get('cacheRatio')) cfg.cacheRatio = parseInt(params.get('cacheRatio'));
    if (params.get('reserved')) cfg.reserved = parseInt(params.get('reserved'));
    if (params.get('readConst')) cfg.readConst = parseInt(params.get('readConst'));

    if (params.get('format') === 'json') {
        updateAll();
        const jsonResponse = JSON.stringify(cfg, null, 2);
        const response = new Response(jsonResponse, {
            headers: { 'Content-Type': 'application/json' }
        });
        response.text().then(text => {
            const blob = new Blob([text], { type: 'application/json' });
            window.location.href = URL.createObjectURL(blob);
        });
    }
}

let debounceTimeout;

export function updateQueryParams() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);

        params.set('pricing', cfg.pricing);
        params.set('storageGB', cfg.storageGB.toString());
        params.set('itemSizeB', cfg.itemSizeB.toString());
        params.set('tableClass', cfg.tableClass);
        params.set('ratio', cfg.ratio.toString());
        params.set('baselineReads', cfg.baselineReads.toString());
        params.set('baselineWrites', cfg.baselineWrites.toString());
        params.set('peakReads', cfg.peakReads.toString());
        params.set('peakWrites', cfg.peakWrites.toString());
        params.set('peakDurationReads', cfg.peakDurationReads.toString());
        params.set('peakDurationWrites', cfg.peakDurationWrites.toString());
        params.set('reserved', cfg.reserved.toString());
        params.set('readConst', cfg.readConst.toString());

        if (cfg.cacheSizeGB === 0) {
            params.delete('cacheSizeGB');
            params.delete('cacheRatio');
        } else {
            params.set('cacheSizeGB', cfg.cacheSizeGB.toString());
            params.set('cacheRatio', cfg.cacheRatio.toString());
        }

        if (cfg.regions === 1) {
            params.delete('regions');
        } else {
            params.set('regions', cfg.regions.toString());
        }

        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }, 1000);
}

export function updateAll() {
    updateQueryParams();
    updateChart();
    updateCosts();
}

export function updateDisplayedCosts(logs) {
    const costs = document.getElementById('costs');
    costs.style.display = 'block';
    costs.innerHTML = logs.map(log => {
        const [key, value] = log.split(': ');
        if (key === '---' && value === '---') {
            return `<div class="cost-entry"><span class="cost-key"></span><span class="cost-value"><span class="dollar-sign"></span><span class="number">${value}</span></span></div>`;
        }
        return `<div class="cost-entry"><span class="cost-key">${key}</span><span class="cost-value"><span class="dollar-sign">$</span><span class="number">${value}</span></span></div>`;
    }).join('');
}
