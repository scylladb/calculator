import {cfg} from './config.js';

export function getPricing() {
    cfg.pricing = document.querySelector('input[name="pricing"]:checked').value;
}

export function getRegions() {
    cfg.regions = parseInt(document.getElementById('regions').value);
}

export function getTableClass() {
    cfg.tableClass = document.getElementById('tableClass').value;
}

export function getStorage() {
    cfg.storageGB = parseInt(document.getElementById('storageGB').value);
}

export function getItemSize() {
    cfg.itemSizeKB = parseInt(document.getElementById('itemSizeB').value) * (1 / 1024);
    cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.round(cfg.itemSizeKB) : cfg.itemSizeKB;
    cfg.itemRRU = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.itemWRU = Math.ceil(cfg.itemSizeKB);
    cfg.itemRCU = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.itemWCU = Math.ceil(cfg.itemSizeKB);
}

export function getReadConsistency() {
    cfg.readConst = parseInt(document.getElementById('readConst').value);
    cfg.readStronglyConsistent = cfg.readConst / 100;
    cfg.readEventuallyConsistent = 1 - cfg.readStronglyConsistent;
}

export function getDAX() {
    cfg.daxInstanceClass = document.getElementById('daxInstanceClass').value;
    cfg.cacheHitPercentage =  cfg.cacheRatio / 100;
    cfg.cacheMissPercentage =  1 - cfg.cacheRatio / 100;
}
