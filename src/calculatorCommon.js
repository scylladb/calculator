import {cfg} from './config.js';

export function getPricing() {
    cfg.pricing = document.querySelector('input[name="pricing"]:checked').value;
}
