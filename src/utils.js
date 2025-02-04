import { cfg } from './config.js';
import {updateCosts, updateOps} from "./calculator.js";
import {chart, updateChart} from "./chart.js";

export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(0) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    if (num >= 1) return num.toFixed(0);
    return num.toString();
}

export function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('workload')) cfg.workload = params.get('workload');
    if (params.get('onDemand')) cfg.onDemand = parseInt(params.get('onDemand'));
    if (params.get('baseline')) cfg.baseline = parseInt(params.get('baseline'));
    if (params.get('peak')) cfg.peak = parseInt(params.get('peak'));
    if (params.get('peakWidth')) cfg.peakWidth = parseInt(params.get('peakWidth'));
    if (params.get('hoursPerMonth')) cfg.hoursPerMonth = parseInt(params.get('hoursPerMonth'));
    if (params.get('storageGB')) cfg.storageGB = parseInt(params.get('storageGB'));
    if (params.get('pricingModel')) cfg.pricingModel = params.get('pricingModel');
    if (params.get('replicatedRegions')) cfg.replicatedRegions = parseInt(params.get('replicatedRegions'));
    if (params.get('daxNodes')) cfg.daxNodes = parseInt(params.get('daxNodes'));
}

let debounceTimeout;

export function updateQueryParams() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);

        params.set('pricingModel', cfg.pricingModel);
        params.set('hoursPerMonth', cfg.hoursPerMonth);
        params.set('storageGB', cfg.storageGB);
        params.set('itemSize', cfg.itemSize);

        if (cfg.pricingModel === 'onDemand') {
            params.delete('baseline');
            params.delete('peak');
            params.delete('peakWidth');
            params.set('onDemand', cfg.onDemand);
        } else {
            params.delete('onDemand');
            params.set('baseline', cfg.baseline);
            params.set('peak', cfg.peak);
            params.set('peakWidth', cfg.peakWidth);
        }

        if (cfg.daxNodes === 0) {
            params.delete('daxNodes');
            params.delete('daxInstanceClass');
        } else {
            params.set('daxNodes', cfg.daxNodes);
            params.set('daxInstanceClass', cfg.daxInstanceClass);
        }

        if (cfg.replicatedRegions === 0) {
            params.delete('replicatedRegions');
        } else {
            params.set('replicatedRegions', cfg.replicatedRegions);
        }

        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }, 2000); // Adjust the delay as needed
}

export function updateAll() {
    updateQueryParams();
    updateChart();
    updateOps();
    updateCosts();
}

export function updateSavedCosts(logs) {
    const costDiffPanel = document.getElementById('costSavedTip');
    costDiffPanel.style.display = 'block';
    costDiffPanel.innerHTML = logs.map(log => {
        const [key, value] = log.split(': ');
        return `<div class="cost-entry"><span class="cost-key">${key}:</span><span class="cost-value">${value}</span></div>`;
    }).join('');
}
