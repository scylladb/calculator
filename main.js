const ctx = document.getElementById('chart').getContext('2d');

let onDemand = 50000;
let baseline = 30000;
let peak = 300000;
let peakWidth = 3;

const scyllaPrices = [{
    family: "i4i",
    instance: "i4i.xlarge",
    baseline: 78000,
    peak: 120000,
    storage: 937,
    price: 3.325
}, {family: "i3en", instance: "i3en.xlarge", baseline: 39000, peak: 60000, storage: 2.44 * 1024, price: 4.378},]

function updateDebugPanel(logs) {
    const debugPanel = document.getElementById('debugPanel');
    debugPanel.innerHTML = logs.join('<br>');
}

function generateProvisionedData(baseline, peak, peakWidth) {
    const data = [];
    const peakStart = Math.floor((24 - peakWidth) / 2);
    const peakEnd = peakStart + peakWidth;

    for (let hour = 0; hour <= 24; hour++) {
        if (hour >= peakStart && hour < peakEnd) {
            data.push(peak);
        } else {
            data.push(baseline);
        }
    }
    return data;
}

function setupSliderInteraction(displayId, inputId, sliderId, formatFunction) {
    const display = document.getElementById(displayId);
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    display.addEventListener('click', function (event) {
        event.stopPropagation();
        input.value = parseInt(slider.value);
        display.style.display = 'none';
        input.style.display = 'inline';
        setTimeout(() => input.focus(), 0);
    });

    input.addEventListener('blur', function () {
        const newValue = parseInt(input.value);
        if (!isNaN(newValue) && newValue >= slider.min && newValue <= slider.max) {
            slider.value = newValue;
            display.innerText = formatFunction(newValue);
            updateChart();
        }
        input.style.display = 'none';
        display.style.display = 'inline';
    });

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
            event.preventDefault();
            input.blur();
        }
    });

    slider.addEventListener('input', function (event) {
        display.innerText = formatFunction(parseInt(event.target.value));
        updateChart();
    });
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(0) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toString();
}

setupSliderInteraction('demandDsp', 'demandInp', 'demand', formatNumber);
setupSliderInteraction('baselineDsp', 'baselineInp', 'baseline', formatNumber);
setupSliderInteraction('peakDsp', 'peakInp', 'peak', formatNumber);
setupSliderInteraction('peakWidthDsp', 'peakWidthInp', 'peakWidth', value => value);
setupSliderInteraction('itemSizeDsp', 'itemSizeInp', 'itemSize', value => value < 1024 ? `${value} B` : `${Math.floor(value / 1024)} KB`);
setupSliderInteraction('storageDsp', 'storageInp', 'storage', value => value >= 1024 ? (value / 1024).toFixed(2) + ' TB' : value + ' GB');

let onDemandData = Array(25).fill(onDemand);
let provisionedData = generateProvisionedData(baseline, peak, peakWidth);

const chart = new Chart(ctx, {
    type: 'line', data: {
        labels: Array.from({length: 25}, (_, i) => `${i}h`), // X-axis labels for 24 hours
        datasets: [{
            label: 'On Demand',
            data: onDemandData,
            borderColor: '#0F1040',
            backgroundColor: 'rgba(15,16,64,0.8)',
            fill: true,
            tension: 0.1,
            pointRadius: 0
        }, {
            label: 'Provisioned',
            data: provisionedData,
            borderColor: '#0F1040',
            backgroundColor: 'rgba(15,16,64,0.8)',
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            hidden: true
        }]
    }, options: {
        plugins: {
            legend: {
                display: false
            }
        }, scales: {
            x: {
                title: {
                    display: false,
                }, ticks: {
                    display: false
                }
            }, y: {
                type: 'logarithmic', title: {
                    display: true, text: 'op/sec'
                }, min: 1000, max: 2000000, ticks: {
                    callback: function (value) {
                        if (value === 1000) return '1K';
                        if (value === 10000) return '10K';
                        if (value === 100000) return '100K';
                        if (value === 300000) return '300K';
                        if (value === 600000) return '600K';
                        if (value === 1000000) return '1M';
                        if (value === 2000000) return '2M';
                        return null;
                    }
                }
            }
        }
    }
});

function updateChart() {
    chart.data.datasets[0].data = Array(25).fill(onDemand);
    chart.data.datasets[1].data = generateProvisionedData(baseline, peak, peakWidth);
    chart.update();
    updateCosts();
}

document.querySelector('input[name="pricingModel"][value="onDemand"]').addEventListener('change', (event) => {
    const demandParams = document.getElementById('demandParams');
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        demandParams.style.display = 'block';
        provisionedParams.style.display = 'none';
        chart.data.datasets[0].hidden = false;
        chart.data.datasets[1].hidden = true;
        chart.update();
        updateCosts(); // Recalculate costs
    }
});

document.querySelector('input[name="pricingModel"][value="provisioned"]').addEventListener('change', (event) => {
    const demandParams = document.getElementById('demandParams');
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        demandParams.style.display = 'none';
        provisionedParams.style.display = 'block';
        chart.data.datasets[0].hidden = true;
        chart.data.datasets[1].hidden = false;
        chart.update();
        updateCosts(); // Recalculate costs
    }
});

document.getElementById('demand').addEventListener('input', (event) => {
    onDemand = parseInt(event.target.value);
    document.getElementById('demandDsp').innerText = formatNumber(onDemand);
    updateChart();
});

document.getElementById('ratioDemand').addEventListener('input', (event) => {
    const readRatio = parseInt(event.target.value);
    const writeRatio = 100 - readRatio;
    document.getElementById('ratioDemandDsp').innerText = `${readRatio}/${writeRatio}`;
    updateChart();
});

document.getElementById('baseline').addEventListener('input', (event) => {
    baseline = parseInt(event.target.value);
    document.getElementById('baselineDsp').innerText = formatNumber(baseline);
    updateChart();
});

document.getElementById('peakWidth').addEventListener('input', (event) => {
    peakWidth = Math.max(2, parseInt(event.target.value));
    document.getElementById('peakWidthDsp').innerText = peakWidth;
    updateChart();
});

document.getElementById('peak').addEventListener('input', (event) => {
    peak = parseInt(event.target.value);
    document.getElementById('peakDsp').innerText = formatNumber(peak);
    updateChart();
});

document.getElementById('ratioProvisioned').addEventListener('input', (event) => {
    const readRatio = parseInt(event.target.value);
    const writeRatio = 100 - readRatio;
    document.getElementById('ratioProvisionedDsp').innerText = `${readRatio}/${writeRatio}`;
    updateChart();
});

document.getElementById('storage').addEventListener('input', (event) => {
    const storageGB = parseInt(event.target.value);
    document.getElementById('storageDsp').innerText = storageGB >= 1024 ? (storageGB / 1024).toFixed(2) + ' TB' : storageGB + ' GB';
    updateChart();
});

document.getElementById('storageDsp').innerText = document.getElementById('storage').value;

function toggleSection(linkId, sectionId, expandedText, collapsedText) {
    document.getElementById(linkId).addEventListener('click', function (event) {
        event.preventDefault();
        const section = document.getElementById(sectionId);
        if (section.style.display === 'none') {
            section.style.display = 'block';
            this.textContent = expandedText;
        } else {
            section.style.display = 'none';
            this.textContent = collapsedText;
        }
    });
}

toggleSection('storageLink', 'storageParams', '▲ Storage', '▼ Storage');
toggleSection('consistencyLink', 'consistencyParams', '▲ Consistency', '▼ Consistency');

document.getElementById('itemSize').addEventListener('input', function (event) {
    const slider = event.target;
    const value = parseInt(slider.value);

    if (value <= 1024) {
        slider.step = 64;
    } else {
        slider.step = 1024;
    }

    let displayValue;
    if (value < 1024) {
        displayValue = `${value} B`;
    } else {
        displayValue = `${Math.floor(value / 1024)} KB`;
    }
    document.getElementById('itemSizeDsp').innerText = displayValue;
    updateChart();
});

document.getElementById('writeTrans').addEventListener('input', (event) => {
    const transactional = parseInt(event.target.value);
    document.getElementById('writeConsistencyDsp').innerText = transactional === 0 ? 'Non Transactional' : transactional === 100 ? 'Transactional' : `${transactional}% Transactional (${100 - transactional}% Non Transactional)`;
    updateChart();
});

const readConst = document.getElementById('readConst');
const readTrans = document.getElementById('readTrans');
const display = document.getElementById('readConstDsp');

function uppdateReadConsistency() {
    const strongConsistent = parseInt(readConst.value);
    let transactional = parseInt(readTrans.value);
    let eventuallyConsistent = 100 - strongConsistent - transactional;

    if (strongConsistent === 100) {
        display.innerText = `Strongly Consistent`;
    } else if (eventuallyConsistent === 100) {
        display.innerText = `Eventually Consistent`;
    } else {
        display.innerText = `Strongly Consistent: ${strongConsistent}%, Eventually Consistent: ${eventuallyConsistent}%, Transactional: ${transactional}%`;
    }
    updateChart();
}

readConst.addEventListener('input', () => {
    if (parseInt(readConst.value) > 100 - parseInt(readTrans.value)) {
        readTrans.value = 100 - readConst.value;
    }
    uppdateReadConsistency();
});

readTrans.addEventListener('input', () => {
    if (100 - parseInt(readTrans.value) < parseInt(readConst.value)) {
        readConst.value = 100 - readTrans.value;
    }
    uppdateReadConsistency();
});

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

function calculateScyllaCosts(storageGB, totalOpsSec) {
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

function updateCosts() {
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
    const peakHours = peakWidth * 30;
    const baselineHours = totalHoursPerMonth - peakHours;
    const baselineXCUHours = baseline * baselineHours;
    const peakXCUHours = peak * peakHours;
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
    const numberReads = onDemand * readRatioDemand * 3600 * totalHoursPerMonth;
    const readRequestUnits = (numberReads * readEventuallyConsistent * 0.5 * readRequestUnitsPerItem) + (numberReads * readStronglyConsistent * readRequestUnitsPerItem) + (numberReads * readTransactional * 2 * readRequestUnitsPerItem);
    const dynamoReadCostDemand = readRequestUnits * 0.000000125;
    const writeRatioDemand = 1 - readRatioProvisioned;
    const numberWrites = onDemand * writeRatioDemand * 3600 * totalHoursPerMonth;
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
    const readsOpsSec = selectedPricingModel === 'onDemand' ? onDemand * readRatioDemand : baseline * readRatioProvisioned;
    const writesOpsSec = selectedPricingModel === 'onDemand' ? onDemand * writeRatioDemand : baseline * writeRatioProvisioned;
    const totalOpsSec = readsOpsSec + writesOpsSec;
    const scyllaResult = calculateScyllaCosts(storageGB, totalOpsSec);

// comparison
    const savings = dynamoCostTotal / 2;
    const costRatio = (dynamoCostTotal / scyllaResult.scyllaCost).toFixed(1);

    document.getElementById('costDiff').textContent = `$${formatNumber(savings)}`;

    let logs = ["DEBUG:", `itemSizeKB: ${itemSizeKB}`, `storageGB: ${storageGB}`, `readsOpsSec: ${readsOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`, `writesOpsSec: ${writesOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`, `totalOpsSec: ${totalOpsSec.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
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

updateCosts();
