import {cfg} from './config.js';
import {chart} from "./chart.js";
import {formatNumber, updateSavedCosts} from "./utils.js";

function getNodeCount(storageGB, storageLimit, totalOpsSec, baselineOpsSec) {
    for (let nodes = 3; nodes < 1000; nodes += 3) {
        const storageCondition = ((3 / nodes * storageGB) / storageLimit) <= 0.9;
        const opsCondition = (baselineOpsSec / 3 * nodes) >= totalOpsSec;
        if (storageCondition && opsCondition) {
            return nodes;
        }
    }
    return 3;
}

export function calculateScyllaCosts() {
    const scyllaStorageGB = cfg.storageGB * 0.5;
    const annualDiscount = 0.2;

    const i4i_nodeCount = getNodeCount(scyllaStorageGB, cfg.scyllaPrices[0].storage, cfg.totalOpsSec, cfg.scyllaPrices[0].baseline);
    const i3en_nodeCount = getNodeCount(scyllaStorageGB, cfg.scyllaPrices[1].storage, cfg.totalOpsSec, cfg.scyllaPrices[1].baseline);

    const i4i_CostPerHour = cfg.scyllaPrices[0].price;
    const i3en_CostPerHour = cfg.scyllaPrices[1].price;

    const i4i_scyllaCost = (i4i_nodeCount / 3) * i4i_CostPerHour * 730 * (1 - annualDiscount);
    const i3en_scyllaCost = (i3en_nodeCount / 3) * i3en_CostPerHour * 730 * (1 - annualDiscount);

    const scyllaCost = i3en_scyllaCost <= i4i_scyllaCost ? i3en_scyllaCost : i4i_scyllaCost;
    const family = i3en_scyllaCost <= i4i_scyllaCost ? 'i3en' : 'i4i';
    const nodeCount = i3en_scyllaCost <= i4i_scyllaCost ? i3en_nodeCount : i4i_nodeCount;

    return {
        scyllaCost, nodeCount, family
    };
}

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
    cfg.readStronglyConsistent = parseInt(document.getElementById('readConst').value) / 100;
    cfg.readEventuallyConsistent = 1 - cfg.readStronglyConsistent;
    cfg.readTransactional = parseInt(document.getElementById('readTrans').value) / 100;
    cfg.readNonTransactional = 1 - cfg.readTransactional;
    cfg.writeTransactional = parseInt(document.getElementById('writeTrans').value) / 100;
    cfg.writeNonTransactional = 1 - cfg.writeTransactional;
}

function getRatioValues() {
    cfg.readRatio = parseInt(document.getElementById('ratio').value) / 100;
    cfg.writeRatio = 1 - cfg.readRatio;
}

function getDemandValues() {
    cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
    cfg.peakHours = cfg.peakWidth * 30;
}

function getProvisionedValues() {
    cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
    cfg.peakHours = cfg.peakWidth * 30;
    cfg.reservedCapacity = parseInt(document.getElementById('reservedCapacity').value) / 100;
}

export function calculateProvisionedCosts() {
    cfg.writeRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB);
    cfg.readRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB / 4.0);

    cfg.baselineWCUNonTransactional = cfg.baseline * cfg.writeRatio * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem;
    cfg.baselineWCUTransactional = cfg.baseline * cfg.writeRatio * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem;
    cfg.baselineWCUTotal = cfg.baselineWCUNonTransactional + cfg.baselineWCUTransactional;
    cfg.reservedWCU = cfg.baselineWCUTotal * cfg.reservedCapacity;
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
    cfg.reservedRCU = cfg.baselineRCUTotal * cfg.reservedCapacity;
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
        `Storage: $${Math.floor(cfg.dynamoCostStorage).toLocaleString()}`,];

    if (cfg.pricing === 'demand') {
        logs = logs.concat([
            `Monthly writes: $${Math.floor(cfg.dynamoCostDemandWrites).toLocaleString()}`,
            `Monthly reads: $${Math.floor(cfg.dynamoCostDemandReads).toLocaleString()}`]);
    } else {
        logs = logs.concat([
            `Monthly writes: $${Math.floor(cfg.dynamoCostMonthlyWCU).toLocaleString()}`,
            `Upfront writes (monthly): $${Math.floor(cfg.dynamoCostUpfrontWCU).toLocaleString()}`,
            `Monthly reads: $${Math.floor(cfg.dynamoCostMonthlyRCU).toLocaleString()}`,
            `Upfront reads (monthly): $${Math.floor(cfg.dynamoCostUpfrontRCU).toLocaleString()}`,]);
    }

    logs = logs.concat([
        `Global tables: $${Math.floor(cfg.dynamoCostReplication).toLocaleString()}`,
        `Network transfer: $${Math.floor(cfg.dynamoCostNetwork).toLocaleString()}`,
        `DAX: $${Math.floor(cfg.dynamoDaxCost).toLocaleString()}`,
        `---: ---`,
        `Total cost/month: $${Math.floor(cfg.dynamoCostTotal).toLocaleString()}`]);

    updateSavedCosts(logs);
}

export function updateOps() {
    const dataSeries0 = chart.data.datasets[0].data;
    const visibleSeriesIndex = chart.data.datasets[1].hidden ? 2 : 1;
    const dataVisibleSeries = chart.data.datasets[visibleSeriesIndex].data;

    let totalOpsSeries0 = 0;
    let totalOpsVisibleSeries = 0;

    for (let i = 1; i < dataSeries0.length; i++) {
        const x1 = dataSeries0[i - 1].x;
        const y1 = dataSeries0[i - 1].y;
        const x2 = dataSeries0[i].x;
        const y2 = dataSeries0[i].y;

        const integral = ((y1 + y2) / 2) * (x2 - x1) * 3600;
        totalOpsSeries0 += integral;
    }

    for (let i = 1; i < dataVisibleSeries.length; i++) {
        const x1 = dataVisibleSeries[i - 1].x;
        const y1 = dataVisibleSeries[i - 1].y;
        const x2 = dataVisibleSeries[i].x;
        const y2 = dataVisibleSeries[i].y;

        const integral = ((y1 + y2) / 2) * (x2 - x1) * 3600;
        totalOpsVisibleSeries += integral;
    }

    const totalOpsInMillionsSeries0 = totalOpsSeries0 / 1000000;
    const coveragePercentage = (totalOpsVisibleSeries / totalOpsSeries0) * 100;

    if (totalOpsInMillionsSeries0 !== 0) {
        chart.options.plugins.tooltip.callbacks.title = function () {
            return `Total Workload: ${totalOpsInMillionsSeries0.toFixed(0)}M ops/month, Pricing coverage: ${coveragePercentage.toFixed(0)}%`;
        };
    }
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

    cfg.dynamoCostTotal = cfg.pricing === 'demand' ?
        cfg.dynamoCostDemand + cfg.dynamoCostStorage :
        cfg.dynamoCostProvisioned + cfg.dynamoCostStorage;

    cfg.dynamoCostTotal = cfg.dynamoCostTotal + cfg.dynamoCostNetwork + cfg.dynamoCostReplication + cfg.dynamoDaxCost;

    const scyllaResult = calculateScyllaCosts();

    const savings = cfg.dynamoCostTotal / 2;
    const costRatio = (cfg.dynamoCostTotal / scyllaResult.scyllaCost).toFixed(1);

    document.getElementById('costDiff').textContent = `$${formatNumber(savings)}`;

    logCosts();
}