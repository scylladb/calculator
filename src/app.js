import {cfg} from './config.js';
import {chart} from "./chart.js";
import {formatNumber, getQueryParams, updateAll} from "./utils.js";

export function setupSliderInteraction(displayId, inputId, sliderId, formatFunction) {
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
            updateAll();
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
        updateAll();
    });
}

export function ourClickHandler(event) {
    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
    const xValue = chart.scales.x.getValueForPixel(canvasPosition.x);
    const yValue = chart.scales.y.getValueForPixel(canvasPosition.y);

    const datasetIndex = 0;
    const dataset = chart.data.datasets[datasetIndex];

    if (event.shiftKey) {
        // Remove the last point from the dataset
        if (dataset.data.length > 0) {
            dataset.data.pop();
            updateAll();
        }
    } else {
        if (xValue > chart.scales.x.min && xValue < chart.scales.x.max && yValue > chart.scales.y.min && yValue < chart.scales.y.max) {
            dataset.data.push({ x: xValue, y: yValue });
            updateAll();
        }
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Shift') {
        document.getElementById('chart').style.cursor = 'not-allowed';
    }
});

document.addEventListener('keyup', function(event) {
    if (event.key === 'Shift') {
        document.getElementById('chart').style.cursor = 'default';
    }
});

export function toggleSection(linkId, sectionId, expandedText, collapsedText) {
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

setupSliderInteraction('demandDsp', 'demandInp', 'demand', formatNumber);
setupSliderInteraction('baselineDsp', 'baselineInp', 'baseline', formatNumber);
setupSliderInteraction('peakDsp', 'peakInp', 'peak', formatNumber);
setupSliderInteraction('peakWidthDsp', 'peakWidthInp', 'peakWidth', value => value);
setupSliderInteraction('itemSizeDsp', 'itemSizeInp', 'itemSize', value => value < 1024 ? `${value} B` : `${Math.floor(value / 1024)} KB`);
setupSliderInteraction('storageDsp', 'storageInp', 'storage', value => value >= 1024 ? (value / 1024).toFixed(2) + ' TB' : value + ' GB');
setupSliderInteraction('replicatedRegionsDsp', 'replicatedRegionsInp', 'replicatedRegions', value => value);
setupSliderInteraction('daxNodesDsp', 'daxNodesInp', 'daxNodes', value => value);

document.getElementById('chart').onclick = function (event) {
    ourClickHandler(event);
};

document.getElementById('chart').onclick = function (event) {
    ourClickHandler(event);
};

document.querySelector('input[name="pricingModel"][value="demand"]').addEventListener('change', (event) => {
    const demandParams = document.getElementById('demandParams');
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        demandParams.style.display = 'block';
        provisionedParams.style.display = 'none';
        chart.data.datasets[1].hidden = false;
        chart.data.datasets[2].hidden = true;
        updateAll();
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
        updateAll();
    }
});

document.getElementById('tableClass').addEventListener('change', (event) => {
    cfg.tableClass = event.target.value;
    updateAll();
});

document.getElementById('demand').addEventListener('input', (event) => {
    cfg.demand = parseInt(event.target.value);
    document.getElementById('demandDsp').innerText = formatNumber(cfg.demand);
    updateAll();
});

document.getElementById('ratioDemand').addEventListener('input', (event) => {
    const readRatio = parseInt(event.target.value);
    const writeRatio = 100 - readRatio;
    document.getElementById('ratioDemandDsp').innerText = `${readRatio}/${writeRatio}`;
    updateAll();
});

document.getElementById('baseline').addEventListener('input', (event) => {
    cfg.baseline = parseInt(event.target.value);
    document.getElementById('baselineDsp').innerText = formatNumber(cfg.baseline);
    updateAll();
});

document.getElementById('peakWidth').addEventListener('input', (event) => {
    cfg.peakWidth = Math.max(1, parseInt(event.target.value));
    document.getElementById('peakWidthDsp').innerText = cfg.peakWidth;
    updateAll();
});

document.getElementById('peak').addEventListener('input', (event) => {
    cfg.peak = parseInt(event.target.value);
    document.getElementById('peakDsp').innerText = formatNumber(cfg.peak);
    updateAll();
});

document.getElementById('ratioProvisioned').addEventListener('input', (event) => {
    const readRatio = parseInt(event.target.value);
    const writeRatio = 100 - readRatio;
    document.getElementById('ratioProvisionedDsp').innerText = `${readRatio}/${writeRatio}`;
    updateAll();
});

document.getElementById('reservedCapacity').addEventListener('input', (event) => {
    cfg.reservedCapacity = parseInt(event.target.value);
    document.getElementById('reservedCapacityDsp').innerText = `${formatNumber(cfg.reservedCapacity)}%`;
    updateAll();
});

document.getElementById('storage').addEventListener('input', (event) => {
    const storageGB = parseInt(event.target.value);
    document.getElementById('storageDsp').innerText = storageGB >= 1024 ? (storageGB / 1024).toFixed(2) + ' TB' : storageGB + ' GB';
    updateAll();
});

document.getElementById('storageDsp').innerText = document.getElementById('storage').value;

toggleSection('tableLink', 'tableParams', '▲ Tables', '▼ Tables');
toggleSection('storageLink', 'storageParams', '▲ Storage', '▼ Storage');
toggleSection('consistencyLink', 'consistencyParams', '▲ Consistency', '▼ Consistency');
toggleSection('daxLink', 'daxParams', '▲ Accelerator (DAX)', '▼ Accelerator (DAX)');

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
    updateAll();
});

document.getElementById('writeTrans').addEventListener('input', (event) => {
    const transactional = parseInt(event.target.value);
    document.getElementById('writeConsistencyDsp').innerText = transactional === 0 ? 'Non Transactional' : transactional === 100 ? 'Transactional' : `${transactional}% Transactional (${100 - transactional}% Non Transactional)`;
    updateAll();
});

export const readConst = document.getElementById('readConst');
export const readTrans = document.getElementById('readTrans');
const display = document.getElementById('readConstDsp');

export function updateReadConsistency() {
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
    updateAll();
}

readConst.addEventListener('input', () => {
    if (parseInt(readConst.value) > 100 - parseInt(readTrans.value)) {
        readTrans.value = 100 - readConst.value;
    }
    updateReadConsistency();
});

readTrans.addEventListener('input', () => {
    if (100 - parseInt(readTrans.value) < parseInt(readConst.value)) {
        readConst.value = 100 - readTrans.value;
    }
    updateReadConsistency();
});

document.getElementById('daxInstanceClass').addEventListener('change', (event) => {
    cfg.daxInstanceClass = event.target.value;
    updateAll();
});

getQueryParams();

document.getElementById('demand').value = cfg.demand;
document.getElementById('baseline').value = cfg.baseline;
document.getElementById('peak').value = cfg.peak;
document.getElementById('peakWidth').value = cfg.peakWidth;
document.getElementById('itemSize').value = cfg.itemSize;
document.getElementById('storage').value = cfg.storage;
document.getElementById('replicatedRegions').value = cfg.replicatedRegions;
document.getElementById('daxNodes').value = cfg.daxNodes;

document.getElementById('demandDsp').innerText = formatNumber(cfg.demand);
document.getElementById('baselineDsp').innerText = formatNumber(cfg.baseline);
document.getElementById('peakDsp').innerText = formatNumber(cfg.peak);
document.getElementById('peakWidthDsp').innerText = cfg.peakWidth;
document.getElementById('itemSizeDsp').innerText = cfg.itemSize < 1024 ? `${cfg.itemSize} B` : `${Math.floor(cfg.itemSize / 1024)} KB`;
document.getElementById('storageDsp').innerText = cfg.storage >= 1024 ? (cfg.storage / 1024).toFixed(2) + ' TB' : cfg.storage + ' GB';
document.getElementById('replicatedRegionsDsp').innerText = cfg.replicatedRegions;
document.getElementById('daxNodesDsp').innerText = cfg.daxNodes;

updateAll();
