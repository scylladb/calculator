import {cfg} from './config.js';
import {updateSavedCosts} from "./utils.js";

function getPricing() {
    cfg.pricing = document.querySelector('input[name="pricing"]:checked').value;
}

function getTableClass() {
    cfg.tableClass = document.getElementById('tableClass').value;
}

function getReplicatedRegions() {
    cfg.regions = parseInt(document.getElementById('regions').value);
}

function getDaxValues() {
    cfg.daxInstanceClass = document.getElementById('daxInstanceClass').value;
}

function getStorageValues() {
    cfg.storageGB = parseInt(document.getElementById('storageGB').value);
    cfg.itemSizeKB = parseInt(document.getElementById('itemSizeB').value) * (1 / 1024);
    cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
}

function getConsistencyValues() {
    cfg.readConst = parseInt(document.getElementById('readConst').value);
    cfg.readStronglyConsistent = cfg.readConst / 100;
    cfg.readEventuallyConsistent = 1 - cfg.readStronglyConsistent;
    cfg.readTransactional = parseInt(document.getElementById('readTrans').value) / 100;
    cfg.readNonTransactional = 1 - cfg.readTransactional;
    cfg.writeTransactional = parseInt(document.getElementById('writeTrans').value) / 100;
    cfg.writeNonTransactional = 1 - cfg.writeTransactional;
}

function getRatioValues() {
    cfg.writeRatio = parseInt(document.getElementById('ratio').value) / 100;
    cfg.readRatio = 1 - cfg.writeRatio;
}

function getDemandValues() {
    cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
    cfg.peakHours = cfg.peakWidth * 30;
}

function getProvisionedValues() {
    cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
    cfg.peakHours = cfg.peakWidth * 30;
    cfg.reserved = parseInt(document.getElementById('reserved').value);
}

export function calculateProvisionedCosts() {
    cfg.writeRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB);
    cfg.readRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB / 4.0);

    cfg.baselineWCUNonTransactional = cfg.baseline * cfg.writeRatio * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem;
    cfg.baselineWCUTransactional = cfg.baseline * cfg.writeRatio * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem;
    cfg.baselineWCUTotal = cfg.baselineWCUNonTransactional + cfg.baselineWCUTransactional;
    cfg.reservedWCU = cfg.baselineWCUTotal * (cfg.reserved / 100.0);
    cfg.reservedWCU = Math.ceil(cfg.reservedWCU / 100.0) * 100;
    cfg.provisionedBaselineWCU = cfg.baselineWCUTotal - cfg.reservedWCU;
    cfg.provisionedBaselineWCU = Math.ceil(Math.max(cfg.provisionedBaselineWCU, 0));
    cfg.provisionedBaselineWCUHours = Math.ceil(cfg.provisionedBaselineWCU * cfg.baselineHours);
    cfg.peakWCUNonTransactional = cfg.peak * cfg.writeRatio * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem;
    cfg.peakWCUTransactional = cfg.peak * cfg.writeRatio * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem;
    cfg.peakWCUTotal = cfg.peakWCUNonTransactional + cfg.peakWCUTransactional;
    cfg.provisionedPeakWCU = cfg.peakWCUTotal - cfg.reservedWCU;
    cfg.provisionedPeakWCU = Math.ceil(Math.max(cfg.provisionedPeakWCU, 0));
    cfg.provisionedPeakWCUHours = Math.ceil(cfg.provisionedPeakWCU * cfg.peakHours);
    cfg.provisionedTotalWCUHours = Math.ceil(cfg.provisionedBaselineWCUHours + cfg.provisionedPeakWCUHours);
    cfg.dynamoCostProvisionedWCU = cfg.provisionedTotalWCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);
    cfg.dynamoCostReplication = (cfg.regions - 1) * cfg.provisionedTotalWCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerRWRU : cfg.pricePerRWRU_IA);
    cfg.dynamoCostReservedWCU = cfg.reservedWCU * cfg.pricePerRWCU * cfg.hoursPerMonth;
    cfg.dynamoCostMonthlyWCU = cfg.dynamoCostProvisionedWCU + cfg.dynamoCostReservedWCU + cfg.dynamoCostReplication;
    cfg.dynamoCostUpfrontWCU = cfg.reservedWCU * 1.50;

    cfg.baselineRCUNonTransactional = cfg.baseline * cfg.readRatio * cfg.readEventuallyConsistent * 0.5 * cfg.readRequestUnitsPerItem;
    cfg.baselineRCUStronglyConsistent = cfg.baseline * cfg.readRatio * cfg.readStronglyConsistent * cfg.readRequestUnitsPerItem;
    cfg.baselineRCUTransactional = cfg.baseline * cfg.readRatio * cfg.readTransactional * 2 * cfg.readRequestUnitsPerItem;
    cfg.baselineRCUTotal = cfg.baselineRCUNonTransactional + cfg.baselineRCUStronglyConsistent + cfg.baselineRCUTransactional;
    cfg.reservedRCU = cfg.baselineRCUTotal * (cfg.reserved / 100.0);
    cfg.reservedRCU = Math.ceil(cfg.reservedRCU / 100.0) * 100;
    cfg.provisionedBaselineRCU = cfg.baselineRCUTotal - cfg.reservedRCU;
    cfg.provisionedBaselineRCU = Math.ceil(Math.max(cfg.provisionedBaselineRCU, 0));
    cfg.provisionedBaselineRCUHours = Math.ceil(cfg.provisionedBaselineRCU * cfg.baselineHours);
    cfg.peakRCUNonTransactional = cfg.peak * cfg.readRatio * cfg.readEventuallyConsistent * 0.5 * cfg.readRequestUnitsPerItem;
    cfg.peakRCUStronglyConsistent = cfg.peak * cfg.readRatio * cfg.readStronglyConsistent * cfg.readRequestUnitsPerItem;
    cfg.peakRCUTransactional = cfg.peak * cfg.readRatio * cfg.readTransactional * 2 * cfg.readRequestUnitsPerItem;
    cfg.peakRCUTotal = cfg.peakRCUNonTransactional + cfg.peakRCUStronglyConsistent + cfg.peakRCUTransactional;
    cfg.provisionedPeakRCU = cfg.peakRCUTotal - cfg.reservedRCU;
    cfg.provisionedPeakRCU = Math.ceil(Math.max(cfg.provisionedPeakRCU, 0));
    cfg.provisionedPeakRCUHours = Math.ceil(cfg.provisionedPeakRCU * cfg.peakHours);
    cfg.provisionedTotalRCUHours = Math.ceil(cfg.provisionedBaselineRCUHours + cfg.provisionedPeakRCUHours);
    cfg.dynamoCostProvisionedRCU = cfg.provisionedTotalRCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerRCU : cfg.pricePerRCU_IA);
    cfg.dynamoCostReservedRCU = cfg.reservedRCU * cfg.pricePerRRCU * cfg.hoursPerMonth;
    cfg.dynamoCostMonthlyRCU = cfg.dynamoCostProvisionedRCU + cfg.dynamoCostReservedRCU;
    cfg.dynamoCostUpfrontRCU = cfg.reservedRCU * 0.3;

    cfg.dynamoCostProvisionedMonthly = cfg.dynamoCostMonthlyWCU + cfg.dynamoCostMonthlyRCU;
    cfg.dynamoCostProvisionedUpfront = cfg.dynamoCostUpfrontWCU + cfg.dynamoCostUpfrontRCU;
    cfg.dynamoCostProvisioned = cfg.dynamoCostProvisionedMonthly + cfg.dynamoCostProvisionedUpfront / 12;
}

export function calculateDemandCosts() {
    cfg.readRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.writeRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB);
    cfg.numberReads = (cfg.baseline * cfg.readRatio * 3600 * cfg.baselineHours) + (cfg.peak * cfg.readRatio * 3600 * cfg.peakHours);
    cfg.readRequestUnits = (cfg.numberReads * cfg.readEventuallyConsistent * 0.5 * cfg.readRequestUnitsPerItem) +
        (cfg.numberReads * cfg.readStronglyConsistent * cfg.readRequestUnitsPerItem) +
        (cfg.numberReads * cfg.readTransactional * 2 * cfg.readRequestUnitsPerItem);
    cfg.dynamoCostDemandReads = cfg.readRequestUnits * (cfg.tableClass === 'standard' ? cfg.pricePerRRU : cfg.pricePerRRU_IA);

    cfg.numberWrites = (cfg.baseline * cfg.writeRatio * 3600 * cfg.baselineHours) + (cfg.peak * cfg.writeRatio * 3600 * cfg.peakHours);
    cfg.writeRequestUnits = (cfg.numberWrites * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem) +
        (cfg.numberWrites * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem);
    cfg.dynamoCostDemandWrites = cfg.writeRequestUnits * (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    cfg.dynamoCostReplication = (cfg.regions -1) * cfg.writeRequestUnits * (cfg.tableClass === 'standard' ? cfg.pricePerRWRU : cfg.pricePerRWRU_IA);

    cfg.dynamoCostDemand = cfg.dynamoCostDemandReads + cfg.dynamoCostDemandWrites + cfg.dynamoCostReplication;
}

function calculateNetworkCosts() {
    cfg.totalReadsKB = cfg.readsOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalWritesKB = cfg.writesOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalReplicatedWritesGB =((cfg.regions - 1) * cfg.totalWritesKB) / 1024 / 1024;
    cfg.dynamoCostNetwork = cfg.totalReplicatedWritesGB * cfg.priceIntraRegPerGB;
}

function findBestDaxCombination(targetRPS) {
    let bestCombination = null;

    cfg.daxInstanceClassCosts.forEach(instance => {
        for (let nodes = 3; nodes <= 128; nodes += 3) { // Adjust the range as needed
            const totalMemory = nodes * instance.memory;
            const totalCost = nodes * instance.price;

            if (totalMemory >= cfg.cacheSizeGB) {
                if (!bestCombination || nodes < bestCombination.nodes ||
                    (nodes === bestCombination.nodes && totalCost < bestCombination.totalCost)) {
                    bestCombination = {
                        instance: instance.instance,
                        nodes: nodes,
                        totalMemory: totalMemory,
                        totalCost: totalCost,
                        targetRPS: targetRPS
                    };
                }
            }
        }
    });

    return bestCombination;
}

function calculateDaxCosts() {
    if (cfg.cacheSizeGB === 0) {
        cfg.dynamoDaxCost = 0;
        document.getElementById('daxInstanceClass').textContent = 'none';
        document.getElementById('daxNodes').textContent = '0';
        return;
    }
    let readRPS_CacheHit = cfg.baseline * cfg.ratio / 100 * cfg.cacheRatio / 100;
    let readRPS_CacheMiss = cfg.baseline * cfg.ratio / 100 * (1 - cfg.cacheRatio / 100);
    let readMissFactor = 1;
    let size = cfg.itemSizeKB;
    let writeRPS = cfg.writesOpsSec;
    let writeFactor = 1;
    let targetUtilization = 1 / 0.70;
    let normalizedRPS = (readRPS_CacheHit * size) + (readRPS_CacheMiss * size * readMissFactor) + (writeRPS * writeFactor * size * 3);
    let targetRPS = normalizedRPS * targetUtilization;
    let bestCombination = findBestDaxCombination(targetRPS);

    if (bestCombination) {
        console.log(bestCombination);
        cfg.daxInstanceClass = bestCombination.instance;
        cfg.daxNodes = bestCombination.nodes;
        cfg.daxInstanceClassCost = bestCombination.totalCost;
        cfg.dynamoDaxCost = cfg.hoursPerMonth * cfg.daxInstanceClassCost;
        document.getElementById('daxInstanceClass').textContent = bestCombination.instance;
        document.getElementById('daxNodes').textContent = bestCombination.nodes;
        cfg.dynamoCostDemandReads = cfg.dynamoCostDemandReads * (1 - cfg.cacheRatio / 100);
        cfg.dynamoCostMonthlyRCU = cfg.dynamoCostMonthlyRCU * (1 - cfg.cacheRatio / 100);
    } else {
        console.error('No valid DAX combination found.');
    }
}

export function calculateStorageCost() {
    cfg.dynamoCostStorage = cfg.storageGB * 0.25;
}

function calculateTotalOpsSec() {
    cfg.readsOpsSec = cfg.baseline *  cfg.readRatio;
    cfg.writesOpsSec = cfg.baseline *  cfg.writeRatio;
    cfg.totalOpsSec = cfg.readsOpsSec + cfg.writesOpsSec;
}

function logCosts() {
    let logs = [
        `Monthly storage cost: ${Math.floor(cfg.dynamoCostStorage).toLocaleString()}`,];

    if (cfg.pricing === 'demand') {
        logs = logs.concat([
            `Monthly write cost: ${Math.floor(cfg.dynamoCostDemandWrites).toLocaleString()}`,
            `Monthly read cost: ${Math.floor(cfg.dynamoCostDemandReads).toLocaleString()}`]);
    } else {
        logs.push(`Monthly write cost: ${Math.floor(cfg.dynamoCostMonthlyWCU).toLocaleString()}`);

        if (cfg.dynamoCostReplication !== 0) {
            logs.push(`Monthly write cost (replicated): ${Math.floor(cfg.dynamoCostReplication).toLocaleString()}`);
        }

        if (cfg.dynamoCostUpfrontWCU !== 0) {
            logs.push(`Upfront write cost: ${Math.floor(cfg.dynamoCostUpfrontWCU).toLocaleString()}`);
        }

        logs.push(`Monthly read cost: ${Math.floor(cfg.dynamoCostMonthlyRCU).toLocaleString()}`);

        if (cfg.dynamoCostUpfrontRCU !== 0) {
            logs.push(`Upfront read cost: ${Math.floor(cfg.dynamoCostUpfrontRCU).toLocaleString()}`);
        }
    }

    if (cfg.dynamoCostNetwork !== 0) {
        logs.push(`Monthly network cost: ${Math.floor(cfg.dynamoCostNetwork).toLocaleString()}`);
    }

    if (cfg.dynamoDaxCost !== 0) {
        logs.push(`Monthly DAX cost: ${Math.floor(cfg.dynamoDaxCost).toLocaleString()}`);
    }

    logs.push(`---: ---`);

    if (cfg.dynamoCostTotalUpfront !== 0 && cfg.pricing === 'provisioned') {
        logs.push(`Total upfront cost: ${Math.floor(cfg.dynamoCostTotalUpfront).toLocaleString()}`);
    }

    logs.push(`Total monthly cost: ${Math.floor(cfg.dynamoCostTotalMonthly).toLocaleString()}`);

    updateSavedCosts(logs);
}

export function updateCosts() {
    getPricing();
    getTableClass();
    getReplicatedRegions()
    getStorageValues();
    getConsistencyValues();
    getRatioValues();
    getDemandValues();
    getProvisionedValues();
    getDaxValues();

    calculateProvisionedCosts();
    calculateDemandCosts();
    calculateStorageCost();
    calculateTotalOpsSec();
    calculateNetworkCosts();
    calculateDaxCosts();

    cfg.dynamoCostTotalMonthly = cfg.pricing === 'demand' ?
        cfg.dynamoCostDemand + cfg.dynamoCostStorage :
        cfg.dynamoCostProvisionedMonthly + cfg.dynamoCostStorage;

    cfg.dynamoCostTotalUpfront = cfg.dynamoCostProvisionedUpfront;

    cfg.dynamoCostTotalMonthlyAveraged = cfg.dynamoCostTotalMonthly + (cfg.dynamoCostTotalUpfront / 12) + cfg.dynamoCostNetwork + cfg.dynamoCostReplication + cfg.dynamoDaxCost;

    logCosts();
}