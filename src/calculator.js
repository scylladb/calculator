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
    cfg.cacheHitPercentage =  cfg.cacheRatio / 100;
    cfg.cacheMissPercentage =  1 - cfg.cacheRatio / 100;
}

function getStorageValues() {
    cfg.storageGB = parseInt(document.getElementById('storageGB').value);
    cfg.itemSizeKB = parseInt(document.getElementById('itemSizeB').value) * (1 / 1024);
    cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.round(cfg.itemSizeKB) : cfg.itemSizeKB;
    cfg.itemRRU = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.itemWRU = Math.ceil(cfg.itemSizeKB);
    cfg.itemRCU = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.itemWCU = Math.ceil(cfg.itemSizeKB);
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
    cfg.reservedReads = parseInt(document.getElementById('reservedReads').value);
    cfg.reservedWrites = parseInt(document.getElementById('reservedWrites').value);
}

function getProvisionedValues() {
    cfg.overprovisioned = parseInt(document.getElementById('overprovisioned').value);
    cfg.overprovisionedPercentage = 1 + (cfg.overprovisioned / 100.0);
}

function getHoursValues() {
    cfg.daysPerMonth = 365 / 12;
    cfg.secondsPerDay = 24 * 60 * 60;
    cfg.totalPeakHoursPerMonthReads = Number((cfg.peakDurationReads * cfg.daysPerMonth).toFixed(1));
    cfg.totalPeakHoursPerMonthWrites = Number((cfg.peakDurationWrites * cfg.daysPerMonth).toFixed(1));
    cfg.totalBaseHoursPerMonthReads = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthReads;
    cfg.totalBaseHoursPerMonthWrites = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthWrites;
    cfg.reservedReadsPercentage = parseInt(document.getElementById('reservedReads').value) / 100.0;
    cfg.reservedWritesPercentage = parseInt(document.getElementById('reservedWrites').value) / 100.0;
    cfg.unreservedReadsPercentage = 1 - cfg.reservedReadsPercentage;
    cfg.unreservedWritesPercentage = 1 - cfg.reservedWritesPercentage;
}

function getTotalOps() {
    cfg.totalReads = 0;
    cfg.totalWrites = 0;

    for (const point of cfg.seriesReads) {
        cfg.totalReads += (point.y * 3600);
    }
    for (const point of cfg.seriesWrites) {
        cfg.totalWrites += (point.y * 3600);
    }
}

export function calculateProvisionedReads() {
    const costPerRCU = (cfg.tableClass === 'standard' ? cfg.pricePerRCU : cfg.pricePerRCU_IA);
    const baseRCU = ((cfg.baselineReads * cfg.readEventuallyConsistent * 0.5 * cfg.itemRCU) +
        (cfg.baselineReads * cfg.readStronglyConsistent * cfg.itemRCU)) * cfg.overprovisionedPercentage;
    const peakRCU = ((cfg.peakReads * cfg.readEventuallyConsistent * 0.5 * cfg.itemRCU) +
        (cfg.peakReads * cfg.readStronglyConsistent * cfg.itemRCU)) * cfg.overprovisionedPercentage;
    const totalRCU = ((cfg.totalReads / cfg.secondsPerDay * cfg.readEventuallyConsistent * 0.5 * cfg.itemRCU) +
        (cfg.totalReads / cfg.secondsPerDay * cfg.readStronglyConsistent * cfg.itemRCU)) * cfg.overprovisionedPercentage;
    const maxRCU = ((cfg.maxReads * cfg.readEventuallyConsistent * 0.5 * cfg.itemRCU) +
        (cfg.maxReads * cfg.readStronglyConsistent * cfg.itemRCU)) * cfg.overprovisionedPercentage;
    let reservedRCU, unreservedRCU, costReservedRCU, costReservedUpfrontRCU, costUnreservedRCU;

    if (cfg.workload === 'baselinePeak') {
        reservedRCU = baseRCU * cfg.reservedReadsPercentage;
        cfg.totalReservedRCU = Math.ceil(reservedRCU / 100) * 100;
        const unreservedBaseRCU = Math.max(baseRCU - cfg.totalReservedRCU, 0);
        const unreservedPeakRCU = Math.max(peakRCU - cfg.totalReservedRCU, 0);
        const baselineHours = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthReads;
        const peakHours = cfg.totalPeakHoursPerMonthReads;
        unreservedRCU = (unreservedBaseRCU * baselineHours) + (unreservedPeakRCU * peakHours);
    } else {
        reservedRCU = maxRCU * cfg.reservedReadsPercentage;
        cfg.totalReservedRCU = Math.ceil(reservedRCU / 100) * 100;
        unreservedRCU = Math.max(totalRCU - cfg.totalReservedRCU, 0) * cfg.hoursPerMonth;
    }

    costReservedRCU = cfg.totalReservedRCU * cfg.pricePerReservedRCU * cfg.hoursPerMonth;
    costReservedUpfrontRCU = cfg.totalReservedRCU * cfg.pricePerReservedRCUUpfront;
    costUnreservedRCU = unreservedRCU * cfg.cacheMissPercentage * costPerRCU;

    cfg._provisionedReadCost = {
        monthlyCost: Number(Math.trunc((costUnreservedRCU + costReservedRCU) * 100) / 100),
        reservedMonthlyCost: Number(Math.trunc((costReservedRCU) * 100) / 100),
        reservedUpfrontCost: Number(Math.trunc((costReservedUpfrontRCU) * 100) / 100),
        totalMonthly: Number(Math.trunc(((costUnreservedRCU + costReservedRCU)) * 100) / 100)
    };
}

export function calculateProvisionedWrites() {
    const costPerWCU = (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);
    const baseWCU = (cfg.baselineWrites * cfg.itemWCU) * cfg.overprovisionedPercentage;
    const peakWCU = (cfg.peakWrites * cfg.itemWCU) * cfg.overprovisionedPercentage;
    const totalWCU = (cfg.totalWrites / cfg.secondsPerDay * cfg.itemWCU) * cfg.overprovisionedPercentage;
    const maxWCU = cfg.maxWrites * cfg.itemWCU * cfg.overprovisionedPercentage;
    let reservedWCU, unreservedWCU, costReservedWCU, costReservedUpfrontWCU, costUnreservedWCU;

    if (cfg.workload === 'baselinePeak') {
        reservedWCU = baseWCU * cfg.reservedWritesPercentage;
        cfg.totalReservedWCU = Math.ceil(reservedWCU / 100) * 100;
        const unreservedBaseWCU = Math.max(baseWCU - cfg.totalReservedWCU, 0);
        const unreservedPeakWCU = Math.max(peakWCU - cfg.totalReservedWCU, 0);
        const baselineHours = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthWrites;
        const peakHours = cfg.totalPeakHoursPerMonthWrites;
        unreservedWCU = (unreservedBaseWCU * baselineHours) + (unreservedPeakWCU * peakHours);
    } else {
        reservedWCU = maxWCU * cfg.reservedWritesPercentage;
        cfg.totalReservedWCU = Math.ceil(reservedWCU / 100) * 100;
        unreservedWCU = Math.max(totalWCU - cfg.totalReservedWCU, 0) * cfg.hoursPerMonth;
    }

    costReservedWCU = cfg.totalReservedWCU * cfg.pricePerReservedWCU * cfg.hoursPerMonth;
    costReservedUpfrontWCU = cfg.totalReservedWCU * cfg.pricePerReservedWCUUpfront;
    costUnreservedWCU = unreservedWCU * costPerWCU;

    cfg._provisionedWriteCost = {
        monthlyCost: Number(Math.trunc((costUnreservedWCU + costReservedWCU) * 100) / 100),
        reservedMonthlyCost: Number(Math.trunc((costReservedWCU) * 100) / 100),
        reservedUpfrontCost: Number(Math.trunc((costReservedUpfrontWCU) * 100) / 100),
        totalMonthly: Number(Math.trunc(((costUnreservedWCU + costReservedWCU)) * 100) / 100)
    };
}

export function calculateReplicatedProvisionedWrites() {
    const costPerWCU = (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);
    let replicatedWCU;
    if (cfg.workload === 'baselinePeak') {
        // Use baseline and peak WCUs for all regions except the primary
        const baseWCU = (cfg.baselineWrites * cfg.itemWCU) * cfg.overprovisionedPercentage;
        const peakWCU = (cfg.peakWrites * cfg.itemWCU) * cfg.overprovisionedPercentage;
        const baselineHours = cfg.hoursPerMonth - cfg.totalPeakHoursPerMonthWrites;
        const peakHours = cfg.totalPeakHoursPerMonthWrites;
        // Calculate replicated WCU for all regions except the primary
        replicatedWCU = (cfg.regions - 1) * ((baseWCU * baselineHours) + (peakWCU * peakHours));
    } else {
        // Use totalWCU for all regions except the primary
        const totalWCU = (cfg.totalWrites / cfg.secondsPerDay * cfg.itemWCU) * cfg.overprovisionedPercentage;
        replicatedWCU = (cfg.regions - 1) * totalWCU * cfg.hoursPerMonth;
    }
    cfg._replicatedProvisionedWriteCost = {
        monthlyCost: Number(Math.trunc((replicatedWCU * costPerWCU) * 100) / 100)
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
    const costPerRRU = (cfg.tableClass === 'standard' ? cfg.pricePerRRU : cfg.pricePerRRU_IA);

    const totalBaseRRU = (cfg.baselineReads * cfg.readEventuallyConsistent * 0.5 * cfg.itemRRU) +
        (cfg.baselineReads * cfg.readStronglyConsistent * cfg.itemRRU);
    const totalPeakRRU = (cfg.peakReads * cfg.readEventuallyConsistent * 0.5 * cfg.itemRRU) +
        (cfg.peakReads * cfg.readStronglyConsistent * cfg.itemRRU);
    const totalRRU = (cfg.totalReads * cfg.daysPerMonth * cfg.readEventuallyConsistent * 0.5 * cfg.itemRRU) +
        (cfg.totalReads * cfg.daysPerMonth * cfg.readStronglyConsistent * cfg.itemRRU);

    const totalBasePerMonthRRU = totalBaseRRU * 3600 * cfg.totalBaseHoursPerMonthReads;
    const totalPeakPerMonthRRU = totalPeakRRU * 3600 * cfg.totalPeakHoursPerMonthReads;
    const totalPerMonthRRU = (cfg.workload === 'baselinePeak') ?
        Math.ceil(totalBasePerMonthRRU + totalPeakPerMonthRRU) :
        Math.ceil(totalRRU);

    const costRRU = totalPerMonthRRU * cfg.cacheMissPercentage * costPerRRU;

    cfg._demandReadCost = {
        monthlyCost: Number(Math.trunc(costRRU * 100) / 100),
    };
}

export function calculateDemandWrites() {
    const costPerWRU = (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    const totalBaseWRU = cfg.baselineWrites * cfg.itemWRU;
    const totalPeakWRU = cfg.peakWrites * cfg.itemWRU;
    const totalWRU = cfg.totalWrites * cfg.itemWRU;

    const totalBasePerMonthWRU = totalBaseWRU * 3600 * cfg.totalBaseHoursPerMonthWrites;
    const totalPeakPerMonthWRU = totalPeakWRU * 3600 * cfg.totalPeakHoursPerMonthWrites;
    const totalPerMonthWRU = (cfg.workload === 'baselinePeak') ?
        Math.ceil(totalBasePerMonthWRU + totalPeakPerMonthWRU) :
        Math.ceil(totalWRU * cfg.daysPerMonth);

    const costWRU = totalPerMonthWRU * costPerWRU;

    cfg._demandWriteCost = {
        monthlyCost: Number(Math.trunc(costWRU * 100) / 100),
    }
}

export function calculateDemandReplicatedWrites() {
    const costPerWRU = (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    const totalBaseWRU = cfg.baselineWrites * cfg.itemWRU;
    const totalPeakWRU = cfg.peakWrites * cfg.itemWRU;
    const totalWRU = cfg.totalWrites * cfg.itemWRU;

    const totalBaseReplicatedHoursPerMonthWRU = totalBaseWRU * 3600 * cfg.totalBaseHoursPerMonthWrites;
    const totalPeakReplicatedHoursPerMonthWRU = totalPeakWRU * 3600 * cfg.totalPeakHoursPerMonthWrites;

    const totalReplicatedPerMonthWRU = (cfg.workload === 'baselinePeak') ?
        (cfg.regions - 1) * (totalBaseReplicatedHoursPerMonthWRU + totalPeakReplicatedHoursPerMonthWRU) :
        (cfg.regions - 1) * (totalWRU * cfg.daysPerMonth);

    const costReplicatedWRU = totalReplicatedPerMonthWRU * costPerWRU;

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

    let readRPS_CacheHit = cfg.baselineReads * cfg.cacheHitPercentage;
    let readRPS_CacheMiss = cfg.baselineReads * cfg.cacheMissPercentage;
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
    getProvisionedValues()
    getDaxValues();
    getTotalOps();

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