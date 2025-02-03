import {cfg} from './config.js';
import {chart} from "./chart.js";
import {formatNumber, updateSavedCosts} from "./utils.js";

const scyllaPrices = [{
    family: "i4i", instance: "i4i.xlarge", baseline: 78000, peak: 120000, storage: 937, price: 3.325
}, {family: "i3en", instance: "i3en.xlarge", baseline: 39000, peak: 60000, storage: 2.44 * 1024, price: 4.378},]

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

    const i4i_nodeCount = getNodeCount(scyllaStorageGB, scyllaPrices[0].storage, cfg.totalOpsSec, scyllaPrices[0].baseline);
    const i3en_nodeCount = getNodeCount(scyllaStorageGB, scyllaPrices[1].storage, cfg.totalOpsSec, scyllaPrices[1].baseline);

    const i4i_CostPerHour = scyllaPrices[0].price;
    const i3en_CostPerHour = scyllaPrices[1].price;

    const i4i_scyllaCost = (i4i_nodeCount / 3) * i4i_CostPerHour * 730 * (1 - annualDiscount);
    const i3en_scyllaCost = (i3en_nodeCount / 3) * i3en_CostPerHour * 730 * (1 - annualDiscount);

    const scyllaCost = i3en_scyllaCost <= i4i_scyllaCost ? i3en_scyllaCost : i4i_scyllaCost;
    const family = i3en_scyllaCost <= i4i_scyllaCost ? 'i3en' : 'i4i';
    const nodeCount = i3en_scyllaCost <= i4i_scyllaCost ? i3en_nodeCount : i4i_nodeCount;

    return {
        scyllaCost, nodeCount, family
    };
}

function getTableClass() {
    cfg.tableClass = document.getElementById('tableClass').value;
}

function getReplicatedRegions() {
    cfg.replicatedRegions = parseInt(document.getElementById('replicatedRegions').value);
}

function getStorageValues() {
    cfg.storageGB = parseInt(document.getElementById('storage').value);
    cfg.itemSizeKB = parseInt(document.getElementById('itemSize').value) * (1 / 1024);
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

function getDemandValues() {
    cfg.readRatioDemand = parseInt(document.getElementById('ratioDemand').value) / 100;
    cfg.writeRatioDemand = 1 - cfg.readRatioDemand;
}

function getProvisionedValues() {
    cfg.peakHours = cfg.peakWidth * 30;
    cfg.baselineHours = cfg.totalHoursPerMonth - cfg.peakHours;
    cfg.reservedCapacity = parseInt(document.getElementById('reservedCapacity').value) / 100;
    cfg.readRatioProvisioned = parseInt(document.getElementById('ratioProvisioned').value) / 100;
    cfg.writeRatioProvisioned = 1 - cfg.readRatioProvisioned;
}

function calculateProvisionedCosts() {
    cfg.writeRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB);
    cfg.readRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB / 4.0);

    cfg.baselineWCUNonTransactional = cfg.baseline * cfg.writeRatioProvisioned * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem;
    cfg.baselineWCUTransactional = cfg.baseline * cfg.writeRatioProvisioned * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem;
    cfg.baselineWCUTotal = cfg.baselineWCUNonTransactional + cfg.baselineWCUTransactional;
    cfg.reservedWCU = cfg.baselineWCUTotal * cfg.reservedCapacity;
    cfg.reservedWCU = Math.ceil(cfg.reservedWCU / 100.0) * 100;
    cfg.provisionedBaselineWCU = cfg.baselineWCUTotal - cfg.reservedWCU;
    cfg.provisionedBaselineWCU = Math.ceil(Math.max(cfg.provisionedBaselineWCU, 0));
    cfg.provisionedBaselineWCUHours = Math.ceil(cfg.provisionedBaselineWCU * cfg.baselineHours);
    cfg.peakWCUNonTransactional = cfg.peak * cfg.writeRatioProvisioned * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem;
    cfg.peakWCUTransactional = cfg.peak * cfg.writeRatioProvisioned * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem;
    cfg.peakWCUTotal = cfg.peakWCUNonTransactional + cfg.peakWCUTransactional;
    cfg.provisionedPeakWCU = cfg.peakWCUTotal - cfg.reservedWCU;
    cfg.provisionedPeakWCU = Math.ceil(Math.max(cfg.provisionedPeakWCU, 0));
    cfg.provisionedPeakWCUHours = Math.ceil(cfg.provisionedPeakWCU * cfg.peakHours);
    cfg.provisionedTotalWCUHours = Math.ceil(cfg.provisionedBaselineWCUHours + cfg.provisionedPeakWCUHours);
    cfg.dynamoCostProvisionedWCU = cfg.provisionedTotalWCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerWCU : cfg.pricePerWCU_IA);
    cfg.dynamoCostReplication = cfg.replicatedRegions * cfg.provisionedTotalWCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerRWRU : cfg.pricePerRWRU_IA);
    cfg.dynamoCostReservedWCU = cfg.reservedWCU * 0.000128 * 730;
    cfg.dynamoCostMonthlyWCU = cfg.dynamoCostProvisionedWCU + cfg.dynamoCostReservedWCU + cfg.dynamoCostReplication;
    cfg.dynamoCostUpfrontWCU = cfg.reservedWCU * 1.50;

    cfg.baselineRCUNonTransactional = cfg.baseline * cfg.readRatioProvisioned * cfg.readEventuallyConsistent * 0.5 * cfg.readRequestUnitsPerItem;
    cfg.baselineRCUStronglyConsistent = cfg.baseline * cfg.readRatioProvisioned * cfg.readStronglyConsistent * cfg.readRequestUnitsPerItem;
    cfg.baselineRCUTransactional = cfg.baseline * cfg.readRatioProvisioned * cfg.readTransactional * 2 * cfg.readRequestUnitsPerItem;
    cfg.baselineRCUTotal = cfg.baselineRCUNonTransactional + cfg.baselineRCUStronglyConsistent + cfg.baselineRCUTransactional;
    cfg.reservedRCU = cfg.baselineRCUTotal * cfg.reservedCapacity;
    cfg.reservedRCU = Math.ceil(cfg.reservedRCU / 100.0) * 100;
    cfg.provisionedBaselineRCU = cfg.baselineRCUTotal - cfg.reservedRCU;
    cfg.provisionedBaselineRCU = Math.ceil(Math.max(cfg.provisionedBaselineRCU, 0));
    cfg.provisionedBaselineRCUHours = Math.ceil(cfg.provisionedBaselineRCU * cfg.baselineHours);
    cfg.peakRCUNonTransactional = cfg.peak * cfg.readRatioProvisioned * cfg.readEventuallyConsistent * 0.5 * cfg.readRequestUnitsPerItem;
    cfg.peakRCUStronglyConsistent = cfg.peak * cfg.readRatioProvisioned * cfg.readStronglyConsistent * cfg.readRequestUnitsPerItem;
    cfg.peakRCUTransactional = cfg.peak * cfg.readRatioProvisioned * cfg.readTransactional * 2 * cfg.readRequestUnitsPerItem;
    cfg.peakRCUTotal = cfg.peakRCUNonTransactional + cfg.peakRCUStronglyConsistent + cfg.peakRCUTransactional;
    cfg.provisionedPeakRCU = cfg.peakRCUTotal - cfg.reservedRCU;
    cfg.provisionedPeakRCU = Math.ceil(Math.max(cfg.provisionedPeakRCU, 0));
    cfg.provisionedPeakRCUHours = Math.ceil(cfg.provisionedPeakRCU * cfg.peakHours);
    cfg.provisionedTotalRCUHours = Math.ceil(cfg.provisionedBaselineRCUHours + cfg.provisionedPeakRCUHours);
    cfg.dynamoCostProvisionedRCU = cfg.provisionedTotalRCUHours * (cfg.tableClass === 'standard' ? cfg.pricePerRCU : cfg.pricePerRCU_IA);
    cfg.dynamoCostReservedRCU = cfg.reservedRCU * 0.000025 * 730;
    cfg.dynamoCostMonthlyRCU = cfg.dynamoCostProvisionedRCU + cfg.dynamoCostReservedRCU;
    cfg.dynamoCostUpfrontRCU = cfg.reservedRCU * 0.3;

    cfg.dynamoCostProvisionedMonthly = cfg.dynamoCostMonthlyWCU + cfg.dynamoCostMonthlyRCU;
    cfg.dynamoCostProvisionedUpfront = cfg.dynamoCostUpfrontWCU + cfg.dynamoCostUpfrontRCU;
    cfg.dynamoCostProvisioned = cfg.dynamoCostProvisionedMonthly + cfg.dynamoCostProvisionedUpfront / 12;
}

function calculateDemandCosts() {
    cfg.readRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB / 4.0);
    cfg.writeRequestUnitsPerItem = Math.ceil(cfg.itemSizeKB);

    cfg.numberReads = cfg.onDemand * cfg.readRatioDemand * 3600 * cfg.totalHoursPerMonth;
    cfg.readRequestUnits = (cfg.numberReads * cfg.readEventuallyConsistent * 0.5 * cfg.readRequestUnitsPerItem) +
        (cfg.numberReads * cfg.readStronglyConsistent * cfg.readRequestUnitsPerItem) +
        (cfg.numberReads * cfg.readTransactional * 2 * cfg.readRequestUnitsPerItem);
    cfg.dynamoCostDemandReads = cfg.readRequestUnits * (cfg.tableClass === 'standard' ? cfg.pricePerRRU : cfg.pricePerRRU_IA);

    cfg.numberWrites = cfg.onDemand * cfg.writeRatioDemand * 3600 * cfg.totalHoursPerMonth;
    cfg.writeRequestUnits = (cfg.numberWrites * cfg.writeNonTransactional * cfg.writeRequestUnitsPerItem) +
        (cfg.numberWrites * cfg.writeTransactional * 2 * cfg.writeRequestUnitsPerItem);
    cfg.dynamoCostDemandWrites = cfg.writeRequestUnits * (cfg.tableClass === 'standard' ? cfg.pricePerWRU : cfg.pricePerWRU_IA);

    cfg.dynamoCostReplication = cfg.replicatedRegions * cfg.writeRequestUnits * (cfg.tableClass === 'standard' ? cfg.pricePerRWRU : cfg.pricePerRWRU_IA);

    cfg.dynamoCostDemand = cfg.dynamoCostDemandReads + cfg.dynamoCostDemandWrites + cfg.dynamoCostReplication;
}

function calculateNetworkCosts() {
    cfg.totalReadsKB = cfg.readsOpsSec * 3600 * cfg.totalHoursPerMonth * cfg.itemSizeKB;
    cfg.totalWritesKB = cfg.writesOpsSec * 3600 * cfg.totalHoursPerMonth * cfg.itemSizeKB;
    cfg.totalReplicatedWritesGB =( cfg.replicatedRegions * cfg.totalWritesKB) / 1024 / 1024;
    cfg.dynamoCostNetwork = cfg.totalReplicatedWritesGB * cfg.priceIntraRegPerGB;
}

export function updateCosts() {
    getSelectedPricingModel();
    getTableClass();
    getReplicatedRegions()
    getStorageValues();
    getConsistencyValues();
    getDemandValues();
    getProvisionedValues();

    calculateProvisionedCosts();
    calculateDemandCosts();
    calculateStorageCost();
    calculateTotalOpsSec();
    calculateNetworkCosts();

    cfg.dynamoCostTotal = cfg.selectedPricingModel === 'onDemand' ?
        cfg.dynamoCostDemand + cfg.dynamoCostStorage :
        cfg.dynamoCostProvisioned + cfg.dynamoCostStorage;

    cfg.dynamoCostTotal = cfg.dynamoCostTotal + cfg.dynamoCostNetwork + cfg.dynamoCostReplication;

    const scyllaResult = calculateScyllaCosts();

    const savings = cfg.dynamoCostTotal / 2;
    const costRatio = (cfg.dynamoCostTotal / scyllaResult.scyllaCost).toFixed(1);

    document.getElementById('costDiff').textContent = `$${formatNumber(savings)}`;

    logCosts(scyllaResult, costRatio);

    chart.update();
}

function calculateStorageCost() {
    cfg.dynamoCostStorage = cfg.storageGB * 0.25;
}

function calculateTotalOpsSec() {
    cfg.readsOpsSec = cfg.selectedPricingModel === 'onDemand' ? cfg.onDemand * cfg.readRatioDemand : cfg.baseline *  cfg.readRatioProvisioned;
    cfg.writesOpsSec = cfg.selectedPricingModel === 'onDemand' ? cfg.onDemand *  cfg.writeRatioDemand : cfg.baseline *  cfg.writeRatioProvisioned;
    cfg.totalOpsSec = cfg.readsOpsSec + cfg.writesOpsSec;
}

function getSelectedPricingModel() {
    cfg.selectedPricingModel = document.querySelector('input[name="pricingModel"]:checked').value;
}

function logCosts(scyllaResult, costRatio) {
    let logs = [
        `itemSizeKB: ${cfg.itemSizeKB} KB`,
        `storageGB: ${cfg.storageGB} GB`,
        `totalOpsSec: ${cfg.totalOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0, maximumFractionDigits: 0
    })}`,];

    if (cfg.selectedPricingModel === 'onDemand') {
        logs = logs.concat([
            `dynamoCostDemandReads: $${cfg.dynamoCostDemandReads.toFixed(2)}`,
            `dynamoCostDemandWrites: $${cfg.dynamoCostDemandWrites.toFixed(2)}`,
            `dynamoCostDemand: $${cfg.dynamoCostDemand.toFixed(2)}`,]);
    } else {
        logs = logs.concat([
            `dynamoCostMonthlyWCU: $${cfg.dynamoCostMonthlyWCU.toFixed(2)}`,
            `dynamoCostUpfrontWCU: $${cfg.dynamoCostUpfrontWCU.toFixed(2)}`,
            `dynamoCostMonthlyRCU: $${cfg.dynamoCostMonthlyRCU.toFixed(2)}`,
            `dynamoCostUpfrontRCU: $${cfg.dynamoCostUpfrontRCU.toFixed(2)}`,]);
    }

    logs = logs.concat([
        `dynamoCostNetwork: $${cfg.dynamoCostNetwork.toFixed(2)}`,
        `dynamoCostReplication: $${cfg.dynamoCostReplication.toFixed(2)}`,
        `dynamoCostStorage: $${cfg.dynamoCostStorage.toFixed(2)}`,
        `dynamoCostTotal: $${cfg.dynamoCostTotal.toFixed(2)}`,
        `scyllaCost: $${scyllaResult.scyllaCost.toFixed(2)}`,
        `costRatio: ${costRatio}`,
        `nodeCount: ${scyllaResult.nodeCount}`,
        `family: ${scyllaResult.family}`]);

    console.log(cfg);
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

    const titleColor = coveragePercentage < 100 ? 'red' : 'black';

    chart.options.plugins.title.text = `Total Workload: ${totalOpsInMillionsSeries0.toFixed(0)}M ops, Pricing coverage: ${coveragePercentage.toFixed(2)}%`;
    chart.options.plugins.title.color = titleColor;
    chart.update();
}
