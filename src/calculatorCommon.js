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

export function getHours() {
    cfg.daysPerMonth = 365 / 12;
    cfg.secondsPerDay = 24 * 60 * 60;
    cfg.totalPeakHoursPerMonthReads = Number((cfg.peakDurationReads * cfg.daysPerMonth).toFixed(1));
    cfg.totalPeakHoursPerMonthWrites = Number((cfg.peakDurationWrites * cfg.daysPerMonth).toFixed(1));
    cfg.totalBaseHoursPerMonthReads = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthReads;
    cfg.totalBaseHoursPerMonthWrites = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthWrites;
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

export function getReserved() {
    cfg.reservedReads = parseInt(document.getElementById('reservedReads').value);
    cfg.reservedWrites = parseInt(document.getElementById('reservedWrites').value);
    cfg.reservedReadsPercentage = parseInt(document.getElementById('reservedReads').value) / 100.0;
    cfg.reservedWritesPercentage = parseInt(document.getElementById('reservedWrites').value) / 100.0;
    cfg.unreservedReadsPercentage = 1 - cfg.reservedReadsPercentage;
    cfg.unreservedWritesPercentage = 1 - cfg.reservedWritesPercentage;
}

export function getOverprovisioned() {
    cfg.overprovisioned = parseInt(document.getElementById('overprovisioned').value);
    cfg.overprovisionedPercentage = 1 + (cfg.overprovisioned / 100.0);
}

export function getDAX() {
    cfg.daxInstanceClass = document.getElementById('daxInstanceClass').value;
    cfg.cacheHitPercentage =  cfg.cacheRatio / 100;
    cfg.cacheMissPercentage =  1 - cfg.cacheRatio / 100;
}
