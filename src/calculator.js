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
    cfg.peakHoursReads = Number((cfg.peakDurationReads * 365 / 12).toFixed(1));
    cfg.peakHoursWrites = Number((cfg.peakDurationWrites * 365 / 12).toFixed(1));
    cfg.baselineHoursReads = cfg.hoursPerMonth - cfg.peakHoursReads;
    cfg.baselineHoursWrites = cfg.hoursPerMonth - cfg.peakHoursWrites;
    cfg.reservedPercentage = parseInt(document.getElementById('reserved').value);
}

export function calculateProvisionedReads() {
    const itemRCU = Math.ceil(cfg.itemSizeKB / 4.0);
    const costPerRCU = (cfg.tableClass === 'standard' ? cfg.pricePerRCU : cfg.pricePerRCU_IA);

    const totalBaseRCU = (cfg.baselineReads * cfg.readEventuallyConsistent * 0.5 * itemRCU) + (cfg.baselineReads * cfg.readStronglyConsistent * itemRCU);

    const totalPeakRCU = (cfg.peakReads * cfg.readEventuallyConsistent * 0.5 * itemRCU) + (cfg.peakReads * cfg.readStronglyConsistent * itemRCU);

    const totalReservedRCU = Math.ceil((totalBaseRCU * (cfg.reservedPercentage / 100.0)) / 100.0) * 100;

    const unreservedBaseRCU = Math.ceil(Math.max(totalBaseRCU - totalReservedRCU, 0));
    const unreservedBaseRCUHours = unreservedBaseRCU * cfg.baselineHoursReads;
    const unreservedPeakRCU = Math.ceil(Math.max(totalPeakRCU - totalReservedRCU, 0));
    const unreservedPeakRCUHours = unreservedPeakRCU * cfg.peakHoursReads;

    const totalUnreservedRCUHours = Math.ceil(unreservedBaseRCUHours + unreservedPeakRCUHours);
    const costRCUProvisioned = totalUnreservedRCUHours * costPerRCU;

    const reservedRCUCost = totalReservedRCU * cfg.pricePerReservedRCU * cfg.hoursPerMonth;
    const upfrontReservedRCUCost = totalReservedRCU * 1.5;

    cfg._provisionedReadCost = {
        monthlyCost: Number(Math.trunc((costRCUProvisioned) * 100) / 100),
        reservedMonthlyCost: Number(Math.trunc((reservedRCUCost) * 100) / 100),
        reservedUpfrontCost: Number(Math.trunc((upfrontReservedRCUCost) * 100) / 100),
        totalMonthly: Number(Math.trunc(((costRCUProvisioned + reservedRCUCost)) * 100) / 100)
    };
}

export function calculateProvisionedWrites() {
    const itemWCU = Math.ceil(cfg.itemSizeKB);
    const costPerWCU = (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);

    const totalBaseWCU = cfg.baselineWrites * itemWCU;

    const totalPeakWCU = cfg.peakWrites * itemWCU;

    const totalReservedWCU = Math.ceil((totalBaseWCU * (cfg.reservedPercentage / 100.0)) / 100.0) * 100;

    const unreservedBaseWCU = Math.ceil(Math.max(totalBaseWCU - totalReservedWCU, 0));
    const unreservedBaseWCUHours = unreservedBaseWCU * cfg.baselineHoursWrites;
    const unreservedPeakWCU = Math.ceil(Math.max(totalPeakWCU - totalReservedWCU, 0));
    const unreservedPeakWCUHours = unreservedPeakWCU * cfg.peakHoursWrites;

    const totalUnreservedWCUHours = Math.ceil(unreservedBaseWCUHours + unreservedPeakWCUHours);
    const costWCUProvisioned = totalUnreservedWCUHours * costPerWCU;

    const reservedWCUCost = totalReservedWCU * cfg.pricePerReservedWCU * cfg.hoursPerMonth;
    const upfrontReservedWCUCost = totalReservedWCU * 1.5;

    cfg._provisionedWriteCost = {
        monthlyCost: Number(Math.trunc((costWCUProvisioned) * 100) / 100),
        reservedMonthlyCost: Number(Math.trunc((reservedWCUCost) * 100) / 100),
        reservedUpfrontCost: Number(Math.trunc((upfrontReservedWCUCost) * 100) / 100),
        totalMonthly: Number(Math.trunc(((costWCUProvisioned + reservedWCUCost)) * 100) / 100)
    };
}

export function calculateReplicatedProvisionedWrites() {
    const itemWCU = Math.ceil(cfg.itemSizeKB);
    const costPerWCU = (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);

    const totalBaseWCU = cfg.baselineWrites * itemWCU;
    const totalPeakWCU = cfg.peakWrites * itemWCU;

    const totalReplicatedWCU = (cfg.regions - 1) * (totalBaseWCU + totalPeakWCU);

    cfg._replicatedProvisionedWriteCost = {
        monthlyCost: Number(Math.trunc((totalReplicatedWCU * costPerWCU) * 100) / 100)
    };
}

export function calculateProvisionedCosts() {
    calculateProvisionedReads();
    calculateProvisionedWrites();
    calculateReplicatedProvisionedWrites();

    cfg.costProvisionedMonthly = cfg._provisionedReadCost.monthlyCost + cfg._provisionedWriteCost.monthlyCost + cfg._replicatedProvisionedWriteCost.monthlyCost;
    cfg.costReservedUpfront = cfg._provisionedReadCost.reservedUpfrontCost + cfg._provisionedWriteCost.reservedUpfrontCost;
    cfg.costProvisioned = cfg.costProvisionedMonthly + cfg.costReservedUpfront / 12;
}

export function calculateDemandReads() {
    const itemRRU = Math.ceil(cfg.itemSizeKB / 4.0);
    const costPerRRU = (cfg.tableClass === 'standard' ? cfg.pricePerRRU : cfg.pricePerRRU_IA);

    const totalBaseRRU = (cfg.baselineReads * cfg.readEventuallyConsistent * 0.5 * itemRRU) + (cfg.baselineReads * cfg.readStronglyConsistent * itemRRU);
    const totalPeakRRU = (cfg.peakReads * cfg.readEventuallyConsistent * 0.5 * itemRRU) + (cfg.peakReads * cfg.readStronglyConsistent * itemRRU);

    const totalBaseRRUHours = totalBaseRRU * 3600 * cfg.baselineHoursReads;
    const totalPeakRRUHours = totalPeakRRU * 3600 * cfg.peakHoursReads;
    const totalRRUHours = Math.ceil(totalBaseRRUHours + totalPeakRRUHours);
    const costRRU = totalRRUHours * costPerRRU;

    cfg._demandReadCost = {
        monthlyCost: Number(Math.trunc(costRRU * 100) / 100),
    };
}

export function calculateDemandWrites() {
    const itemWRU = Math.ceil(cfg.itemSizeKB);
    const costPerWRU = (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    const totalBaseWRU = cfg.baselineWrites * itemWRU;
    const totalPeakWRU = cfg.peakWrites * itemWRU;

    const totalBaseWRUHours = totalBaseWRU * 3600 * cfg.baselineHoursWrites;
    const totalPeakWRUHours = totalPeakWRU * 3600 * cfg.peakHoursWrites;
    const totalWRUHours = Math.ceil(totalBaseWRUHours + totalPeakWRUHours);
    const costWRU = totalWRUHours * costPerWRU;

    cfg._demandWriteCost = {
        monthlyCost: Number(Math.trunc(costWRU * 100) / 100),
    }
}

export function calculateDemandReplicatedWrites() {
    const itemWRU = Math.ceil(cfg.itemSizeKB);
    const costPerWRU = (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    const totalBaseWRU = cfg.baselineWrites * itemWRU;
    const totalPeakWRU = cfg.peakWrites * itemWRU;

    const totalReplicatedWRU = (cfg.regions - 1) * (totalBaseWRU + totalPeakWRU);

    const totalBaseReplicatedWRUHours = totalReplicatedWRU * 3600 * cfg.baselineHoursWrites;
    const totalPeakReplicatedWRUHours = totalReplicatedWRU * 3600 * cfg.peakHoursWrites;
    const totalReplicatedWRUHours = Math.ceil(totalBaseReplicatedWRUHours + totalPeakReplicatedWRUHours);
    const costReplicatedWRU = totalReplicatedWRUHours * costPerWRU;

    cfg._replicatedDemandWriteCost = {
        monthlyCost: Number(Math.trunc(costReplicatedWRU * 100) / 100)
    }
}

export function calculateDemandCosts() {
    calculateDemandReads();
    calculateDemandWrites();
    calculateDemandReplicatedWrites();

    cfg.costDemandMonthly = cfg._demandReadCost.monthlyCost + cfg._demandWriteCost.monthlyCost + cfg._replicatedDemandWriteCost.monthlyCost;
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
        logs.push(`Monthly write cost: ${Math.floor(cfg._demandWriteCost.monthlyCost).toLocaleString()}`);

        if (cfg._replicatedDemandWriteCost.monthlyCost !== 0) {
            logs.push(`Monthly write cost (replicated): ${Math.floor(cfg._replicatedDemandWriteCost.monthlyCost).toLocaleString()}`);
        }

        logs.push(`Monthly read cost: ${Math.floor(cfg._demandReadCost.monthlyCost).toLocaleString()}`);
    } else {
        logs.push(`Monthly write cost: ${Math.floor(cfg._provisionedWriteCost.monthlyCost).toLocaleString()}`);

        if (cfg._replicatedProvisionedWriteCost.monthlyCost !== 0) {
            logs.push(`Monthly write cost (replicated): ${Math.floor(cfg._replicatedProvisionedWriteCost.monthlyCost).toLocaleString()}`);
        }

        if (cfg._provisionedWriteCost.reservedUpfrontCost !== 0) {
            logs.push(`Upfront write cost: ${Math.floor(cfg._provisionedWriteCost.reservedUpfrontCost).toLocaleString()}`);
        }

        logs.push(`Monthly read cost: ${Math.floor(cfg._provisionedReadCost.monthlyCost).toLocaleString()}`);

        if (cfg._provisionedReadCost.reservedUpfrontCost !== 0) {
            logs.push(`Upfront read cost: ${Math.floor(cfg._provisionedReadCost.reservedUpfrontCost).toLocaleString()}`);
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

    console.log(cfg);

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