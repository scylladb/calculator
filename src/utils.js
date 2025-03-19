import { cfg } from './config.js';
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
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

export function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('workload')) cfg.workload = params.get('workload');
    if (params.get('baseline')) cfg.baseline = parseInt(params.get('baseline'));
    if (params.get('peak')) cfg.peak = parseInt(params.get('peak'));
    if (params.get('peakWidth')) cfg.peakWidth = parseInt(params.get('peakWidth'));
    if (params.get('storageGB')) cfg.storageGB = parseInt(params.get('storageGB'));
    if (params.get('itemSizeB')) cfg.itemSizeB = parseInt(params.get('itemSizeB'));
    if (params.get('ratio')) cfg.ratio = parseInt(params.get('ratio'));
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
            const url = URL.createObjectURL(blob);
            window.location.href = url;
        });
        return;
    }
}

let debounceTimeout;

export function updateQueryParams() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);

        params.set('pricing', cfg.pricing);
        params.set('storageGB', cfg.storageGB);
        params.set('itemSizeB', cfg.itemSizeB);
        params.set('tableClass', cfg.tableClass);
        params.set('ratio', cfg.ratio);
        params.set('baseline', cfg.baseline);
        params.set('peak', cfg.peak);
        params.set('peakWidth', cfg.peakWidth);
        params.set('reserved', cfg.reserved);
        params.set('readConst', cfg.readConst);

        if (cfg.cacheSizeGB === 0) {
            params.delete('cacheSizeGB');
            params.delete('cacheRatio');
        } else {
            params.set('cacheSizeGB', cfg.cacheSizeGB);
            params.set('cacheRatio', cfg.cacheRatio);
        }

        if (cfg.regions === 1) {
            params.delete('regions');
        } else {
            params.set('regions', cfg.regions);
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
    const costDiffPanel = document.getElementById('costs');
    costDiffPanel.style.display = 'block';
    costDiffPanel.innerHTML = logs.map(log => {
        const [key, value] = log.split(': ');
        if (key === '---' && value === '---') {
            return `<div class="cost-entry"><span class="cost-key"></span><span class="cost-value"><span class="dollar-sign"></span><span class="number">${value}</span></span></div>`;
        }
        return `<div class="cost-entry"><span class="cost-key">${key}</span><span class="cost-value"><span class="dollar-sign">$</span><span class="number">${value}</span></span></div>`;
    }).join('');
}
