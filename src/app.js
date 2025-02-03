import {cfg} from './config.js';
import {chart, updateChart} from "./chart.js";
import {updateCosts, updateOps} from "./calculator.js";
import {formatNumber} from "./utils.js";

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

export function ourClickHandler(event) {
    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
    const xValue = chart.scales.x.getValueForPixel(canvasPosition.x);
    const yValue = chart.scales.y.getValueForPixel(canvasPosition.y);

    if (xValue > chart.scales.x.min && xValue < chart.scales.x.max && yValue > chart.scales.y.min && yValue < chart.scales.y.max) {
        const datasetIndex = 0;
        const dataset = chart.data.datasets[datasetIndex];
        dataset.data.push({
            x: xValue, y: yValue
        });
        updateOps();
        chart.update();
    }
}

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

document.getElementById('chart').onclick = function (event) {
    ourClickHandler(event);
};

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
        updateOps();
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
        updateOps();
        updateCosts();
    }
});

document.getElementById('demand').addEventListener('input', (event) => {
    cfg.onDemand = parseInt(event.target.value);
    document.getElementById('demandDsp').innerText = formatNumber(cfg.onDemand);
    updateChart();
});

document.getElementById('ratioDemand').addEventListener('input', (event) => {
    const readRatio = parseInt(event.target.value);
    const writeRatio = 100 - readRatio;
    document.getElementById('ratioDemandDsp').innerText = `${readRatio}/${writeRatio}`;
    updateChart();
});

document.getElementById('baseline').addEventListener('input', (event) => {
    cfg.baseline = parseInt(event.target.value);
    document.getElementById('baselineDsp').innerText = formatNumber(cfg.baseline);
    updateChart();
});

document.getElementById('peakWidth').addEventListener('input', (event) => {
    cfg.peakWidth = Math.max(1, parseInt(event.target.value));
    document.getElementById('peakWidthDsp').innerText = cfg.peakWidth;
    updateChart();
});

document.getElementById('peak').addEventListener('input', (event) => {
    cfg.peak = parseInt(event.target.value);
    document.getElementById('peakDsp').innerText = formatNumber(cfg.peak);
    updateChart();
});

document.getElementById('ratioProvisioned').addEventListener('input', (event) => {
    const readRatio = parseInt(event.target.value);
    const writeRatio = 100 - readRatio;
    document.getElementById('ratioProvisionedDsp').innerText = `${readRatio}/${writeRatio}`;
    updateChart();
});

document.getElementById('reservedCapacity').addEventListener('input', (event) => {
    cfg.reservedCapacity = parseInt(event.target.value);
    document.getElementById('reservedCapacityDsp').innerText = `${formatNumber(cfg.reservedCapacity)}%`;
    updateChart();
});

document.getElementById('storage').addEventListener('input', (event) => {
    const storageGB = parseInt(event.target.value);
    document.getElementById('storageDsp').innerText = storageGB >= 1024 ? (storageGB / 1024).toFixed(2) + ' TB' : storageGB + ' GB';
    updateChart();
});

document.getElementById('storageDsp').innerText = document.getElementById('storage').value;

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
    updateChart();
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

updateOps();
updateCosts();
