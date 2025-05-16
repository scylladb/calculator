import {cfg} from './config.js';
import {updateDisplayedCosts} from "./utils.js";

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
    cfg.readTransactional = 0;
    cfg.readNonTransactional = 1 - cfg.readTransactional;
    cfg.writeTransactional = 0;
    cfg.writeNonTransactional = 1 - cfg.writeTransactional;
}

function getReservedValues() {
    cfg.reserved = parseInt(document.getElementById('reserved').value);
}

function getHoursValues() {
    cfg.peakHoursReads = cfg.peakDurationReads * 30;
    cfg.peakHoursWrites = cfg.peakDurationWrites * 30;
    cfg.baselineHoursReads = cfg.hoursPerMonth - cfg.peakHoursReads;
    cfg.baselineHoursWrites = cfg.hoursPerMonth - cfg.peakHoursWrites;
    cfg.reserved = parseInt(document.getElementById('reserved').value);
}

export function calculateProvisionedCosts() {
    cfg.perItemWRU = Math.ceil(cfg.itemSizeKB);
    cfg.perItemRRU = Math.ceil(cfg.itemSizeKB / 4.0);

    cfg.baselineWCUNonTransactional = cfg.baselineWrites * cfg.writeNonTransactional * cfg.perItemWRU;
    cfg.baselineWCUTransactional = cfg.baselineWrites* cfg.writeTransactional * 2 * cfg.perItemWRU;
    cfg.baselineWCUTotal = cfg.baselineWCUNonTransactional + cfg.baselineWCUTransactional;
    cfg.reservedWCU = cfg.baselineWCUTotal * (cfg.reserved / 100.0);
    cfg.reservedWCU = Math.ceil(cfg.reservedWCU / 100.0) * 100;
    cfg.baselineWCU = cfg.baselineWCUTotal - cfg.reservedWCU;
    cfg.baselineWCU = Math.ceil(Math.max(cfg.baselineWCU, 0));
    cfg.baselineWCUHours = Math.ceil(cfg.baselineWCU * cfg.baselineHoursWrites);
    cfg.peakWCUNonTransactional = cfg.peakWrites * cfg.writeNonTransactional * cfg.perItemWRU;
    cfg.peakWCUTransactional = cfg.peakWrites * cfg.writeTransactional * 2 * cfg.perItemWRU;
    cfg.peakWCUTotal = cfg.peakWCUNonTransactional + cfg.peakWCUTransactional;
    cfg.peakWCU = cfg.peakWCUTotal - cfg.reservedWCU;
    cfg.peakWCU = Math.ceil(Math.max(cfg.peakWCU, 0));
    cfg.peakWCUHours = Math.ceil(cfg.peakWCU * cfg.peakHoursWrites);
    cfg.totalWCUHours = Math.ceil(cfg.baselineWCUHours + cfg.peakWCUHours);
    cfg.costProvisionedWCU = cfg.totalWCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);
    cfg.costReservedWCU = cfg.reservedWCU * cfg.pricePerRWCU * cfg.hoursPerMonth;
    cfg.replicatedWCUHours =  Math.ceil(cfg.baselineWCUTotal * cfg.baselineHoursWrites) + Math.ceil(cfg.peakWCUTotal * cfg.peakHoursWrites);
    cfg.costMonthlyReplicatedWCU = (cfg.regions - 1) * cfg.replicatedWCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);
    cfg.costMonthlyWCU = cfg.costProvisionedWCU + cfg.costReservedWCU;
    cfg.costUpfrontWCU = cfg.reservedWCU * 1.50;

    cfg.baselineRCUNonTransactional = cfg.baselineReads * cfg.readEventuallyConsistent * 0.5 * cfg.perItemRRU;
    cfg.baselineRCUStronglyConsistent = cfg.baselineReads * cfg.readStronglyConsistent * cfg.perItemRRU;
    cfg.baselineRCUTransactional = cfg.baselineReads * cfg.readTransactional * 2 * cfg.perItemRRU;
    cfg.baselineRCUTotal = cfg.baselineRCUNonTransactional + cfg.baselineRCUStronglyConsistent + cfg.baselineRCUTransactional;
    cfg.reservedRCU = cfg.baselineRCUTotal * (cfg.reserved / 100.0);
    cfg.reservedRCU = Math.ceil(cfg.reservedRCU / 100.0) * 100;
    cfg.baselineRCU = cfg.baselineRCUTotal - cfg.reservedRCU;
    cfg.baselineRCU = Math.ceil(Math.max(cfg.baselineRCU, 0));
    cfg.baselineRCUHours = Math.ceil(cfg.baselineRCU * cfg.baselineHoursReads);
    cfg.peakRCUNonTransactional = cfg.peakReads * cfg.readEventuallyConsistent * 0.5 * cfg.perItemRRU;
    cfg.peakRCUStronglyConsistent = cfg.peakReads * cfg.readStronglyConsistent * cfg.perItemRRU;
    cfg.peakRCUTransactional = cfg.peakReads * cfg.readTransactional * 2 * cfg.perItemRRU;
    cfg.peakRCUTotal = cfg.peakRCUNonTransactional + cfg.peakRCUStronglyConsistent + cfg.peakRCUTransactional;
    cfg.peakRCU = cfg.peakRCUTotal - cfg.reservedRCU;
    cfg.peakRCU = Math.ceil(Math.max(cfg.peakRCU, 0));
    cfg.peakRCUHours = Math.ceil(cfg.peakRCU * cfg.peakHoursReads);
    cfg.totalRCUHours = Math.ceil(cfg.baselineRCUHours + cfg.peakRCUHours);
    cfg.costProvisionedRCU = cfg.totalRCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerRCU : cfg.pricePerRCU_IA);
    cfg.costReservedRCU = cfg.reservedRCU * cfg.pricePerRRCU * cfg.hoursPerMonth;
    cfg.costMonthlyRCU = cfg.costProvisionedRCU + cfg.costReservedRCU;
    cfg.costUpfrontRCU = cfg.reservedRCU * 0.3;

    cfg.costProvisionedMonthly = cfg.costMonthlyWCU + cfg.costMonthlyRCU + cfg.costMonthlyReplicatedWCU;
    cfg.costReservedUpfront = cfg.costUpfrontWCU + cfg.costUpfrontRCU;
    cfg.costProvisioned = cfg.costProvisionedMonthly + cfg.costReservedUpfront / 12;
}

export function calculateDemandCosts() {
    cfg.perItemRRU = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.perItemWRU = Math.ceil(cfg.itemSizeKB);
    cfg.totalReads = (cfg.baselineReads * 3600 * cfg.baselineHoursReads) + (cfg.peakReads * 3600 * cfg.peakHoursReads);
    cfg.totalRRU = (cfg.totalReads * cfg.readEventuallyConsistent * 0.5 * cfg.perItemRRU) +
        (cfg.totalReads * cfg.readStronglyConsistent * cfg.perItemRRU) +
        (cfg.totalReads * cfg.readTransactional * 2 * cfg.perItemRRU);
    cfg.costDemandMonthlyReads = cfg.totalRRU * (cfg.tableClass === 'standard' ? cfg.pricePerRRU : cfg.pricePerRRU_IA);

    cfg.totalWrites = (cfg.baselineWrites * 3600 * cfg.baselineHoursWrites) + (cfg.peakWrites * 3600 * cfg.peakHoursWrites);
    cfg.totalWRU = (cfg.totalWrites * cfg.writeNonTransactional * cfg.perItemWRU) +
        (cfg.totalWrites * cfg.writeTransactional * 2 * cfg.perItemWRU);
    cfg.costDemandMonthlyWrites = cfg.totalWRU * (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    cfg.costDemandMonthlyReplicatedWRU = (cfg.regions - 1) * cfg.totalWRU * (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    cfg.costDemandMonthly = cfg.costDemandMonthlyReads + cfg.costDemandMonthlyWrites + cfg.costDemandMonthlyReplicatedWRU;
}

function calculateNetworkCosts() {
    cfg.totalReadsKB = cfg.totalReadOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalWritesKB = cfg.totalWriteOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalReplicatedWritesGB =((cfg.regions - 1) * cfg.totalWritesKB) / 1024 / 1024;
    cfg.costNetwork = cfg.totalReplicatedWritesGB * cfg.priceIntraRegPerGB;
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
    if(cfg.override) {
        cfg.daxInstanceClassCost = cfg.daxInstanceClassCosts.find(instance => instance.instance === cfg.daxInstanceClass).price * cfg.daxNodes;
        cfg.dynamoDaxCost = cfg.hoursPerMonth * cfg.daxInstanceClassCost;
        return;
    }

    if (cfg.cacheSizeGB === 0) {
        cfg.dynamoDaxCost = 0;
        document.getElementById('daxNodesDsp').innerText = '0';
        document.getElementById('daxNodes').value = '0';
        return;
    }

    let readRPS_CacheHit = cfg.baselineReads * cfg.cacheRatio / 100;
    let readRPS_CacheMiss = cfg.baselineReads * (1 - cfg.cacheRatio / 100);
    let readMissFactor = 1;
    let size = cfg.itemSizeKB;
    let writeRPS = cfg.totalWriteOpsSec;
    let writeFactor = 1;
    let targetUtilization = 1 / 0.70;
    let normalizedRPS = (readRPS_CacheHit * size) + (readRPS_CacheMiss * size * readMissFactor) + (writeRPS * writeFactor * size * 3);
    let targetRPS = normalizedRPS * targetUtilization;
    let bestCombination = findBestDaxCombination(targetRPS);

    if (bestCombination) {
        cfg.daxInstanceClass = bestCombination.instance;
        cfg.daxNodes = bestCombination.nodes;
        cfg.daxInstanceClassCost = bestCombination.totalCost;
        cfg.dynamoDaxCost = cfg.hoursPerMonth * cfg.daxInstanceClassCost;
        document.getElementById('daxInstanceClass').value = bestCombination.instance;
        document.getElementById('daxNodes').value = bestCombination.nodes;
        document.getElementById('daxNodesDsp').innerText = bestCombination.nodes;
        cfg.costDemandMonthlyReads = cfg.costDemandMonthlyReads * (1 - cfg.cacheRatio / 100);
        cfg.costMonthlyRCU = cfg.costMonthlyRCU * (1 - cfg.cacheRatio / 100);
    } else {
        console.error('No valid DAX combination found.');
    }
}

export function calculateStorageCost() {
    cfg.costStorage = cfg.storageGB * 0.25;
}

function calculateTotalOpsSec() {
    cfg.totalReadOpsSec = cfg.baselineReads;
    cfg.totalWriteOpsSec = cfg.baselineWrites;
    cfg.totalOpsSec = cfg.totalReadOpsSec + cfg.totalWriteOpsSec;
}

function logCosts() {
    let logs = [
        `Monthly storage cost: ${Math.floor(cfg.costStorage).toLocaleString()}`,];

    if (cfg.pricing === 'demand') {
        logs.push(`Monthly write cost: ${Math.floor(cfg.costDemandMonthlyWrites).toLocaleString()}`);

        if (cfg.costDemandMonthlyReplicatedWRU !== 0) {
            logs.push(`Monthly write cost (replicated): ${Math.floor(cfg.costDemandMonthlyReplicatedWRU).toLocaleString()}`);
        }

        logs.push(`Monthly read cost: ${Math.floor(cfg.costDemandMonthlyReads).toLocaleString()}`);
    } else {
        logs.push(`Monthly write cost: ${Math.floor(cfg.costMonthlyWCU).toLocaleString()}`);

        if (cfg.costMonthlyReplicatedWCU !== 0) {
            logs.push(`Monthly write cost (replicated): ${Math.floor(cfg.costMonthlyReplicatedWCU).toLocaleString()}`);
        }

        if (cfg.costUpfrontWCU !== 0) {
            logs.push(`Upfront write cost: ${Math.floor(cfg.costUpfrontWCU).toLocaleString()}`);
        }

        logs.push(`Monthly read cost: ${Math.floor(cfg.costMonthlyRCU).toLocaleString()}`);

        if (cfg.costUpfrontRCU !== 0) {
            logs.push(`Upfront read cost: ${Math.floor(cfg.costUpfrontRCU).toLocaleString()}`);
        }
    }

    if (cfg.costNetwork !== 0) {
        logs.push(`Monthly network cost: ${Math.floor(cfg.costNetwork).toLocaleString()}`);
    }

    if (cfg.dynamoDaxCost !== 0) {
        logs.push(`Monthly DAX cost: ${Math.floor(cfg.dynamoDaxCost).toLocaleString()}`);
    }

    logs.push(`---: ---`);

    if (cfg.costTotalUpfront !== 0 && cfg.pricing === 'provisioned') {
        logs.push(`Total monthly cost: ${Math.floor(cfg.costTotalMonthly).toLocaleString()}`);
        logs.push(`Total upfront cost: ${Math.floor(cfg.costTotalUpfront).toLocaleString()}`);
        logs.push(`Total annual + upfront cost: ${Math.floor(cfg.costTotalUpfront + (cfg.costTotalMonthly * 12)).toLocaleString()}`);
    } else {
        logs.push(`Total monthly cost: ${Math.floor(cfg.costTotalMonthly).toLocaleString()}`);
        logs.push(`Total annual cost: ${Math.floor(cfg.costTotalMonthly * 12).toLocaleString()}`);
    }

    //console.log(cfg);

    updateDisplayedCosts(logs);
}

export function updateCosts() {
    getPricing();
    getTableClass();
    getReplicatedRegions()
    getStorageValues();
    getConsistencyValues();
    getHoursValues();
    getReservedValues();
    getDaxValues();

    calculateProvisionedCosts();
    calculateDemandCosts();
    calculateStorageCost();
    calculateTotalOpsSec();
    calculateNetworkCosts();
    calculateDaxCosts();

    cfg.costTotalMonthly = cfg.pricing === 'demand' ?
        cfg.costDemandMonthly + cfg.costStorage + cfg.costNetwork + cfg.dynamoDaxCost :
        cfg.costProvisionedMonthly + cfg.costStorage + cfg.costNetwork + cfg.dynamoDaxCost;

    cfg.costTotalUpfront = cfg.costReservedUpfront;

    logCosts();
}