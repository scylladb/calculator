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

export function calculateScyllaCosts(storageGB, totalOpsSec) {
    const scyllaStorageGB = storageGB * 0.5;
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

export function updateCosts() {
    const totalHoursPerMonth = 730;

// item size
    let itemSizeKB = parseInt(document.getElementById('itemSize').value) * 0.0009765625;
    if (itemSizeKB > 1) {
        itemSizeKB = Math.floor(itemSizeKB);
    }
    const readRequestUnitsPerItem = Math.ceil(itemSizeKB / 4.0);
    const writeRequestUnitsPerItem = Math.ceil(itemSizeKB);

// consistency
    const readStronglyConsistent = parseInt(document.getElementById('readConst').value) / 100;
    const readEventuallyConsistent = 1 - readStronglyConsistent;
    const readTransactional = parseInt(document.getElementById('readTrans').value) / 100;
    const writeTransactional = parseInt(document.getElementById('writeTrans').value) / 100;
    const writeNonTransactional = 1 - writeTransactional;

// provisioned
    const peakHours = config.peakWidth * 30;
    const baselineHours = totalHoursPerMonth - peakHours;
    const baselineXCUHours = config.baseline * baselineHours;
    const peakXCUHours = config.peak * peakHours;
    const totalXCUHours = baselineXCUHours + peakXCUHours;
    const readRatioProvisioned = parseInt(document.getElementById('ratioProvisioned').value) / 100;
    const rcuHours = totalXCUHours * readRatioProvisioned;
    const rcuHoursProvisioned = (rcuHours * readEventuallyConsistent * 0.5 * readRequestUnitsPerItem) + (rcuHours * readStronglyConsistent * readRequestUnitsPerItem) + (rcuHours * readTransactional * 2 * readRequestUnitsPerItem);
    const dynamoReadCostProvisioned = rcuHoursProvisioned * 0.00013;
    const writeRatioProvisioned = 1 - readRatioProvisioned;
    const wcuHours = totalXCUHours * writeRatioProvisioned;
    const wcuHoursProvisioned = (wcuHours * writeNonTransactional * writeRequestUnitsPerItem) + (wcuHours * writeTransactional * 2 * writeRequestUnitsPerItem);
    const dynamoWriteCostProvisioned = wcuHoursProvisioned * 0.00065;
    const dynamoCostProvisioned = dynamoReadCostProvisioned + dynamoWriteCostProvisioned;

// demand
    const readRatioDemand = parseInt(document.getElementById('ratioDemand').value) / 100;
    const numberReads = config.onDemand * readRatioDemand * 3600 * totalHoursPerMonth;
    const readRequestUnits = (numberReads * readEventuallyConsistent * 0.5 * readRequestUnitsPerItem) + (numberReads * readStronglyConsistent * readRequestUnitsPerItem) + (numberReads * readTransactional * 2 * readRequestUnitsPerItem);
    const dynamoReadCostDemand = readRequestUnits * 0.000000125;
    const writeRatioDemand = 1 - readRatioProvisioned;
    const numberWrites = config.onDemand * writeRatioDemand * 3600 * totalHoursPerMonth;
    const writeRequestUnits = (numberWrites * writeNonTransactional * writeRequestUnitsPerItem) + (numberWrites * writeTransactional * 2 * writeRequestUnitsPerItem);
    const dynamoWriteCostDemand = writeRequestUnits * 0.000000625;
    const dynamoCostDemand = dynamoReadCostDemand + dynamoWriteCostDemand;

// storage
    const storageGB = parseInt(document.getElementById('storage').value);
    const dynamoStorageCost = storageGB * 0.25;

// dynamo total
    const selectedPricingModel = document.querySelector('input[name="pricingModel"]:checked').value;
    const dynamoCostTotal = selectedPricingModel === 'onDemand' ? dynamoCostDemand + dynamoStorageCost : dynamoCostProvisioned + dynamoStorageCost;

// scylla
    const readsOpsSec = selectedPricingModel === 'onDemand' ? config.onDemand * readRatioDemand : config.baseline * readRatioProvisioned;
    const writesOpsSec = selectedPricingModel === 'onDemand' ? config.onDemand * writeRatioDemand : config.baseline * writeRatioProvisioned;
    const totalOpsSec = readsOpsSec + writesOpsSec;
    const scyllaResult = calculateScyllaCosts(storageGB, totalOpsSec);

// comparison
    const savings = dynamoCostTotal / 2;
    const costRatio = (dynamoCostTotal / scyllaResult.scyllaCost).toFixed(1);

    document.getElementById('costDiff').textContent = `$${formatNumber(savings)}`;

    let logs = ["DEBUG:", `itemSizeKB: ${itemSizeKB}`, `storageGB: ${storageGB}`, `readsOpsSec: ${readsOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0, maximumFractionDigits: 0
    })}`, `writesOpsSec: ${writesOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0, maximumFractionDigits: 0
    })}`, `totalOpsSec: ${totalOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0, maximumFractionDigits: 0
    })}`,];

    if (selectedPricingModel === 'onDemand') {
        logs = logs.concat([`readRequestUnits: ${readRequestUnits.toLocaleString(undefined, {
            minimumFractionDigits: 0, maximumFractionDigits: 0
        })}`, `writeRequestUnits: ${writeRequestUnits.toLocaleString(undefined, {
            minimumFractionDigits: 0, maximumFractionDigits: 0
        })}`, `dynamoReadCostDemand: $${dynamoReadCostDemand.toFixed(2)}`, `dynamoWriteCostDemand: $${dynamoWriteCostDemand.toFixed(2)}`, `dynamoCostDemand: $${dynamoCostDemand.toFixed(2)}`,]);
    } else {
        logs = logs.concat([`rcuHoursProvisioned: ${rcuHoursProvisioned.toLocaleString(undefined, {
            minimumFractionDigits: 0, maximumFractionDigits: 0
        })}`, `wcuHoursProvisioned: ${wcuHoursProvisioned.toLocaleString(undefined, {
            minimumFractionDigits: 0, maximumFractionDigits: 0
        })}`, `dynamoReadCostProvisioned: $${dynamoReadCostProvisioned.toFixed(2)}`, `dynamoWriteCostProvisioned: $${dynamoWriteCostProvisioned.toFixed(2)}`,]);
    }

    logs = logs.concat([`dynamoStorageCost: $${dynamoStorageCost.toFixed(2)}`, `dynamoCostTotal: $${dynamoCostTotal.toFixed(2)}`, `scyllaCost: $${scyllaResult.scyllaCost.toFixed(2)}`, `costRatio: ${costRatio}`, `nodeCount: ${scyllaResult.nodeCount}`, `family: ${scyllaResult.family}`]);

    updateDebugPanel(logs);

    chart.update();
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
