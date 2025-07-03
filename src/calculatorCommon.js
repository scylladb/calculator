import {cfg} from './config.js';

export function getPricing() {
    cfg.pricing = document.querySelector('input[name="pricing"]:checked').value;
}

export function getRegions() {
    cfg.regions = parseInt(document.getElementById('regions').value);
}