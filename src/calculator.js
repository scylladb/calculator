import {config} from './config.js';
import {chart} from "./chart.js";
import {formatNumber, updateDebugPanel} from "./utils.js";

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

export function calculateScyllaCosts(totalOpsSec) {
    const scyllaStorageGB = config.storageGB * 0.5;
    const annualDiscount = 0.2;

    const i4i_nodeCount = getNodeCount(scyllaStorageGB, scyllaPrices[0].storage, totalOpsSec, scyllaPrices[0].baseline);
    const i3en_nodeCount = getNodeCount(scyllaStorageGB, scyllaPrices[1].storage, totalOpsSec, scyllaPrices[1].baseline);

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

function getStorageValues() {
    config.storageGB = parseInt(document.getElementById('storage').value);
    config.itemSizeKB = parseInt(document.getElementById('itemSize').value) * 0.0009765625;
    config.itemSizeKB = config.itemSizeKB > 1 ? Math.floor(config.itemSizeKB) : config.itemSizeKB;
}

function getConsistencyValues() {
    config.readStronglyConsistent = parseInt(document.getElementById('readConst').value) / 100;
    config.readEventuallyConsistent = 1 - config.readStronglyConsistent;
    config.readTransactional = parseInt(document.getElementById('readTrans').value) / 100;
    config.readNonTransactional = 1 - config.readTransactional;
    config.writeTransactional = parseInt(document.getElementById('writeTrans').value) / 100;
    config.writeNonTransactional = 1 - config.writeTransactional;
}

function getDemandValues() {
    config.readRatioDemand = parseInt(document.getElementById('ratioDemand').value) / 100;
    config.writeRatioDemand = 1 - config.readRatioDemand;
}

function getProvisionedValues() {
    config.peakHours = config.peakWidth * 30;
    config.baselineHours = config.totalHoursPerMonth - config.peakHours;
    config.reservedCapacity = parseInt(document.getElementById('reservedCapacity').value) / 100;
    config.readRatioProvisioned = parseInt(document.getElementById('ratioProvisioned').value) / 100;
    config.writeRatioProvisioned = 1 - config.readRatioProvisioned;
}

function calculateProvisionedCosts() {
    config.writeRequestUnitsPerItem = Math.ceil(config.itemSizeKB);
    config.readRequestUnitsPerItem = Math.ceil(config.itemSizeKB / 4.0);

    config.baselineWCUNonTransactional = config.baseline * config.writeRatioProvisioned * config.writeNonTransactional * config.writeRequestUnitsPerItem;
    config.baselineWCUTransactional = config.baseline * config.writeRatioProvisioned * config.writeTransactional * 2 * config.writeRequestUnitsPerItem;
    config.baselineWCUTotal = config.baselineWCUNonTransactional + config.baselineWCUTransactional;
    config.reservedWCU = config.baselineWCUTotal * config.reservedCapacity;
    config.reservedWCU = Math.ceil(config.reservedWCU / 100.0) * 100;
    config.provisionedBaselineWCU = config.baselineWCUTotal - config.reservedWCU;
    config.provisionedBaselineWCU = Math.ceil(Math.max(config.provisionedBaselineWCU, 0));
    config.provisionedBaselineWCUHours = Math.ceil(config.provisionedBaselineWCU * config.baselineHours);
    config.peakWCUNonTransactional = config.peak * config.writeRatioProvisioned * config.writeNonTransactional * config.writeRequestUnitsPerItem;
    config.peakWCUTransactional = config.peak * config.writeRatioProvisioned * config.writeTransactional * 2 * config.writeRequestUnitsPerItem;
    config.peakWCUTotal = config.peakWCUNonTransactional + config.peakWCUTransactional;
    config.provisionedPeakWCU = config.peakWCUTotal - config.reservedWCU;
    config.provisionedPeakWCU = Math.ceil(Math.max(config.provisionedPeakWCU, 0));
    config.provisionedPeakWCUHours = Math.ceil(config.provisionedPeakWCU * config.peakHours);
    config.provisionedTotalWCUHours = Math.ceil(config.provisionedBaselineWCUHours + config.provisionedPeakWCUHours);
    config.dynamoCostProvisionedWCU = config.provisionedTotalWCUHours * 0.00065;
    config.dynamoCostReservedWCU = config.reservedWCU * 0.000128 * 730;
    config.dynamoCostMonthlyWCU = config.dynamoCostProvisionedWCU + config.dynamoCostReservedWCU;
    config.dynamoCostUpfrontWCU = config.reservedWCU * 1.50;

    config.baselineRCUNonTransactional = config.baseline * config.readRatioProvisioned * config.readEventuallyConsistent * 0.5 * config.readRequestUnitsPerItem;
    config.baselineRCUStronglyConsistent = config.baseline * config.readRatioProvisioned * config.readStronglyConsistent * config.readRequestUnitsPerItem;
    config.baselineRCUTransactional = config.baseline * config.readRatioProvisioned * config.readTransactional * 2 * config.readRequestUnitsPerItem;
    config.baselineRCUTotal = config.baselineRCUNonTransactional + config.baselineRCUStronglyConsistent + config.baselineRCUTransactional;
    config.reservedRCU = config.baselineRCUTotal * config.reservedCapacity;
    config.reservedRCU = Math.ceil(config.reservedRCU / 100.0) * 100;
    config.provisionedBaselineRCU = config.baselineRCUTotal - config.reservedRCU;
    config.provisionedBaselineRCU = Math.ceil(Math.max(config.provisionedBaselineRCU, 0));
    config.provisionedBaselineRCUHours = Math.ceil(config.provisionedBaselineRCU * config.baselineHours);
    config.peakRCUNonTransactional = config.peak * config.readRatioProvisioned * config.readEventuallyConsistent * 0.5 * config.readRequestUnitsPerItem;
    config.peakRCUStronglyConsistent = config.peak * config.readRatioProvisioned * config.readStronglyConsistent * config.readRequestUnitsPerItem;
    config.peakRCUTransactional = config.peak * config.readRatioProvisioned * config.readTransactional * 2 * config.readRequestUnitsPerItem;
    config.peakRCUTotal = config.peakRCUNonTransactional + config.peakRCUStronglyConsistent + config.peakRCUTransactional;
    config.provisionedPeakRCU = config.peakRCUTotal - config.reservedRCU;
    config.provisionedPeakRCU = Math.ceil(Math.max(config.provisionedPeakRCU, 0));
    config.provisionedPeakRCUHours = Math.ceil(config.provisionedPeakRCU * config.peakHours);
    config.provisionedTotalRCUHours = Math.ceil(config.provisionedBaselineRCUHours + config.provisionedPeakRCUHours);
    config.dynamoCostProvisionedRCU = config.provisionedTotalRCUHours * 0.00013;
    config.dynamoCostReservedRCU = config.reservedRCU * 0.000025 * 730;
    config.dynamoCostMonthlyRCU = config.dynamoCostProvisionedRCU + config.dynamoCostReservedRCU;
    config.dynamoCostUpfrontRCU = config.reservedRCU * 0.3;

    config.dynamoCostProvisionedMonthly = config.dynamoCostMonthlyWCU + config.dynamoCostMonthlyRCU;
    config.dynamoCostProvisionedUpfront = config.dynamoCostUpfrontWCU + config.dynamoCostUpfrontRCU;
    config.dynamoCostProvisioned = config.dynamoCostProvisionedMonthly + config.dynamoCostProvisionedUpfront / 12;
}

function calculateDemandCosts() {
    config.readRequestUnitsPerItem = Math.ceil(config.itemSizeKB / 4.0);
    config.writeRequestUnitsPerItem = Math.ceil(config.itemSizeKB);

    config.numberReads = config.onDemand * config.readRatioDemand * 3600 * config.totalHoursPerMonth;
    config.readRequestUnits = (config.numberReads * config.readEventuallyConsistent * 0.5 * config.readRequestUnitsPerItem) +
        (config.numberReads * config.readStronglyConsistent * config.readRequestUnitsPerItem) +
        (config.numberReads * config.readTransactional * 2 * config.readRequestUnitsPerItem);
    config.dynamoCostDemandReads = config.readRequestUnits * 0.000000125;

    config.numberWrites = config.onDemand * config.writeRatioDemand * 3600 * config.totalHoursPerMonth;
    config.writeRequestUnits = (config.numberWrites * config.writeNonTransactional * config.writeRequestUnitsPerItem) +
        (config.numberWrites * config.writeTransactional * 2 * config.writeRequestUnitsPerItem);
    config.dynamoCostDemandWrites = config.writeRequestUnits * 0.000000625;

    config.dynamoCostDemand = config.dynamoCostDemandReads + config.dynamoCostDemandWrites;
}

export function updateCosts() {
    getSelectedPricingModel();
    getStorageValues();
    getConsistencyValues();
    getDemandValues();
    getProvisionedValues();

    calculateProvisionedCosts();
    calculateDemandCosts();
    calculateStorageCost();
    calculateTotalOpsSec();

    config.dynamoCostTotal = config.selectedPricingModel === 'onDemand' ? config.dynamoCostDemand + config.dynamoCostStorage : config.dynamoCostProvisioned + config.dynamoCostStorage;

    const scyllaResult = calculateScyllaCosts();

    const savings = config.dynamoCostTotal / 2;
    const costRatio = (config.dynamoCostTotal / scyllaResult.scyllaCost).toFixed(1);

    document.getElementById('costDiff').textContent = `$${formatNumber(savings)}`;

    logCosts(scyllaResult, costRatio);

    chart.update();
}

function calculateStorageCost() {
    config.dynamoCostStorage = config.storageGB * 0.25;
}

function calculateTotalOpsSec() {
    config.readsOpsSec = config.selectedPricingModel === 'onDemand' ? config.onDemand * config.readRatioDemand : config.baseline *  config.readRatioProvisioned;
    config.writesOpsSec = config.selectedPricingModel === 'onDemand' ? config.onDemand *  config.writeRatioDemand : config.baseline *  config.writeRatioProvisioned;
    config.totalOpsSec = config.readsOpsSec + config.writesOpsSec;
}

function getSelectedPricingModel() {
    config.selectedPricingModel = document.querySelector('input[name="pricingModel"]:checked').value;
}

function logCosts(scyllaResult, costRatio) {
    let logs = [
        `itemSizeKB: ${config.itemSizeKB} KB`,
        `storageGB: ${config.storageGB} GB`,
        `totalOpsSec: ${config.totalOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0, maximumFractionDigits: 0
    })}`,];

    if (config.selectedPricingModel === 'onDemand') {
        logs = logs.concat([
            `dynamoCostDemandReads: $${config.dynamoCostDemandReads.toFixed(2)}`,
            `dynamoCostDemandWrites: $${config.dynamoCostDemandWrites.toFixed(2)}`,
            `dynamoCostDemand: $${config.dynamoCostDemand.toFixed(2)}`,]);
    } else {
        logs = logs.concat([
            `dynamoCostMonthlyWCU: $${config.dynamoCostMonthlyWCU.toFixed(2)}`,
            `dynamoCostUpfrontWCU: $${config.dynamoCostUpfrontWCU.toFixed(2)}`,
            `dynamoCostMonthlyRCU: $${config.dynamoCostMonthlyRCU.toFixed(2)}`,
            `dynamoCostUpfrontRCU: $${config.dynamoCostUpfrontRCU.toFixed(2)}`,]);
    }

    logs = logs.concat([
        `dynamoCostStorage: $${config.dynamoCostStorage.toFixed(2)}`,
        `dynamoCostTotal: $${config.dynamoCostTotal.toFixed(2)}`,
        `scyllaCost: $${scyllaResult.scyllaCost.toFixed(2)}`,
        `costRatio: ${costRatio}`,
        `nodeCount: ${scyllaResult.nodeCount}`,
        `family: ${scyllaResult.family}`]);

    updateDebugPanel(logs);
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
