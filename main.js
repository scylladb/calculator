const ctx = document.getElementById('chart').getContext('2d');

let onDemand = 10000;
let baseline = 10000;
let peak = 100000;
let peakWidth = 1;

const scyllaPrices = [{
    family: "i4i", instance: "i4i.xlarge", baseline: 78000, peak: 120000, storage: 937, price: 3.325
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
            data.push({x: hour, y: peak});
        } else {
            data.push({x: hour, y: baseline});
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

let onDemandData = Array.from({length: 25}, (_, i) => ({x: i, y: onDemand}));
let provisionedData = generateProvisionedData(baseline, peak, peakWidth);

const chart = new Chart(ctx, {
    type: 'scatter', data: {
        datasets: [{
            label: "Workload",
            borderColor: '#0F1040',
            backgroundColor: 'rgba(170,170,170,0.5)',
            data: [{x: 0, y: 5000}, {x: 8, y: 10000}, {x: 9, y: 100000}, {x: 10, y: 10000}, {x: 24, y: 5000}],
            fill: true,
            showLine: true,
            borderDash: [4, 4],
            tension: 0.2
        }, {
            label: 'On Demand',
            data: onDemandData,
            borderColor: '#0F1040',
            backgroundColor: 'rgba(15,16,64,0.8)',
            showLine: true,
            pointRadius: 0,
            fill: true,
            tension: 0.1,
        }, {
            label: 'Provisioned',
            data: provisionedData,
            borderColor: '#0F1040',
            backgroundColor: 'rgba(15,16,64,0.8)',
            fill: true,
            tension: 0.1,
            showLine: true,
            pointRadius: 0,
            hidden: true
        }]
    }, options: {
        plugins: {
            legend: {
                display: false
            }, title: {
                display: true, text: "Total Ops"
            }, tooltip: {
                callbacks: {
                    label: function(context) {
                        return formatNumber(context.raw.y) + ' ops/sec';
                    }
                }
            }, dragData: {
                round: 1, showTooltip: true, onDrag: function (e, datasetIndex, index, value) {
                    value.x = Math.round(value.x);
                    value.y = Math.round(value.y / 1000) * 1000;
                }, onDragEnd: function (e, datasetIndex, index, value) {
                    updateTotalOps();
                    chart.update();
                }, dragX: true, dragY: true
            }
        }, scales: {
            x: {
                min: 0, max: 24, title: {
                    display: false,
                }, ticks: {
                    stepSize: 1, callback: function (value) {
                        return value.toString().padStart(2, '0') + ':00';
                    }
                }
            }, y: {
                type: 'logarithmic', title: {
                    display: true, text: 'op/sec'
                }, min: 1000, max: 10000000, ticks: {
                    callback: function (value) {
                        if (value === 1000) return '1K';
                        if (value === 10000) return '10K';
                        if (value === 100000) return '100K';
                        if (value === 1000000) return '1M';
                        if (value === 10000000) return '10M';
                        return null;
                    }
                }
            }
        }
    }
});

function updateChart() {
    chart.data.datasets[1].data = Array.from({length: 25}, (_, i) => ({x: i, y: onDemand}));
    chart.data.datasets[2].data = generateProvisionedData(baseline, peak, peakWidth);
    chart.update();
    updateTotalOps();
    updateCosts();
}

function ourClickHandler(event) {
    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
    const xValue = chart.scales.x.getValueForPixel(canvasPosition.x);
    const yValue = chart.scales.y.getValueForPixel(canvasPosition.y);

    if (xValue > chart.scales.x.min && xValue < chart.scales.x.max && yValue > chart.scales.y.min && yValue < chart.scales.y.max) {
        const datasetIndex = 0;
        const dataset = chart.data.datasets[datasetIndex];
        dataset.data.push({
            x: xValue,
            y: yValue
        });
        updateTotalOps();
        chart.update();
    }
}

document.getElementById('chart').onclick = function (event) {
    ourClickHandler(event);
};

function updateTotalOps() {
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
    const totalOpsInMillionsVisibleSeries = totalOpsVisibleSeries / 1000000;
    const coveragePercentage = (totalOpsVisibleSeries / totalOpsSeries0) * 100;

    const titleColor = coveragePercentage < 100 ? 'red' : 'black';

    chart.options.plugins.title.text = `Total Ops: ${totalOpsInMillionsSeries0.toFixed(2)}M, Coverage: ${coveragePercentage.toFixed(2)}%`;
    chart.options.plugins.title.color = titleColor;
    chart.update();
}

document.getElementById('chart').onclick = function (event) {
    ourClickHandler(event);
};

document.querySelector('input[name="pricingModel"][value="onDemand"]').addEventListener('change', (event) => {
    const demandParams = document.getElementById('demandParams');
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        demandParams.style.display = 'block';
        provisionedParams.style.display = 'none';
        chart.data.datasets[1].hidden = false;
        chart.data.datasets[2].hidden = true;
        chart.update();
        updateTotalOps();
        updateCosts();
    }
});

document.querySelector('input[name="pricingModel"][value="provisioned"]').addEventListener('change', (event) => {
    const demandParams = document.getElementById('demandParams');
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        demandParams.style.display = 'none';
        provisionedParams.style.display = 'block';
        chart.data.datasets[1].hidden = true;
        chart.data.datasets[2].hidden = false;
        chart.update();
        updateTotalOps();
        updateCosts();
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
    peakWidth = Math.max(1, parseInt(event.target.value));
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

updateTotalOps();
updateCosts();
