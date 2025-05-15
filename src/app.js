import {cfg} from './config.js';
import {formatBytes, formatNumber, getQueryParams, updateAll} from "./utils.js";

export function setupSliderInteraction(displayId, inputId, sliderId, formatFunction) {
    const display = document.getElementById(displayId);
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    slider.addEventListener('mousedown', function () {
        cfg.override = true;
    });

    input.addEventListener('mouseover', function (event) {
        input.value = parseInt(slider.value.toString());
    });

    input.addEventListener('blur', function () {
        const newValue = parseInt(input.value.toString());
        if (!isNaN(newValue) && newValue >= slider.min && newValue <= slider.max) {
            slider.value = newValue;
            display.innerText = formatFunction(newValue);
            updateAll();
        }
    });

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
            display.innerText = formatFunction(parseInt(event.target.value));
            setTimeout(() => {
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }, 0);
            input.blur();
            cfg.override = true;
            updateAll();
        }
    });

    slider.addEventListener('input', function (event) {
        display.innerText = formatFunction(parseInt(event.target.value));
        updateAll();
    });
}

export function updateUtilization() {
    // get current pricing
    const pricing = document.querySelector('input[name="pricing"]:checked').value;

    // Get the input elements
    const utilization = document.getElementById('utilization')

    // Get the current value of the utilization
    const targetUtilization = parseInt(utilization.value);

    // If utilization is 70% or less, multiplier is 1
    // If utilization is greater than 70%, apply the increase formula
    cfg.multiplier = targetUtilization > 70 ? 1 + ((targetUtilization - 70) / 100) : 1;

    // Always adjust relative to the original values
    cfg.baselineReadsTotal = Math.floor(cfg.baselineReads * cfg.multiplier);
    cfg.baselineWritesTotal = Math.floor(cfg.baselineWrites * cfg.multiplier);
    cfg.peakReadsTotal = Math.floor(cfg.peakReads * cfg.multiplier);
    cfg.peakWritesTotal = Math.floor(cfg.peakWrites * cfg.multiplier);

    // Update the display elements
    if (cfg.multiplier > 1 && pricing === 'provisioned') {
        document.getElementById('baselineReadsDspUtilization').innerText = '+' + formatNumber(cfg.baselineReadsTotal - cfg.baselineReads);
        document.getElementById('baselineWritesDspUtilization').innerText = '+' + formatNumber(cfg.baselineWritesTotal - cfg.baselineWrites);
        document.getElementById('peakReadsDspUtilization').innerText = '+' + formatNumber(cfg.peakReadsTotal - cfg.peakReads);
        document.getElementById('peakWritesDspUtilization').innerText = '+' + formatNumber(cfg.peakWritesTotal - cfg.peakWrites);
        document.getElementById('targetUtilization').classList.add('utilization');
    } else {
        document.getElementById('baselineReadsDspUtilization').innerText = '';
        document.getElementById('baselineWritesDspUtilization').innerText = '';
        document.getElementById('peakReadsDspUtilization').innerText = '';
        document.getElementById('peakWritesDspUtilization').innerText = '';
        document.getElementById('targetUtilization').classList.remove('utilization');
    }
}

export function setupSliderInteractionUtilization() {
    const display = document.getElementById('utilizationDsp');
    const slider = document.getElementById('utilization');
    const input = document.getElementById('utilizationInp');

    input.addEventListener('mouseover', function (event) {
        input.value = parseInt(slider.value.toString());
    });

    input.addEventListener('blur', function () {
        const newValue = parseInt(input.value.toString());
        if (!isNaN(newValue) && newValue >= slider.min && newValue <= slider.max) {
            slider.value = newValue;
            display.innerText = `${newValue}%`;
            updateAll();
        }
    });

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
            display.innerText = formatFunction(parseInt(event.target.value));
            setTimeout(() => {
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }, 0);
            input.blur();
            updateAll();
        }
    });

    slider.addEventListener('input', function (event) {
        const currentValue = parseInt(event.target.value);
        display.innerText = `${currentValue}%`;

        updateAll();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const tabLabels = document.querySelectorAll('.tab-label');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLabels.forEach(tabLabel => {
        tabLabel.addEventListener('click', function(e) {
        e.preventDefault();

        tabLabels.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        this.classList.add('active');

        const tabContentId = this.getAttribute('href');
        document.getElementById(tabContentId).classList.add('active');
        });
    });
});

document.querySelector('input[name="pricing"][value="demand"]').addEventListener('change', (event) => {
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        provisionedParams.style.display = 'none';
        updateAll();
    }
});

document.querySelector('input[name="pricing"][value="provisioned"]').addEventListener('change', (event) => {
    const provisionedParams = document.getElementById('provisionedParams');
    if (event.target.checked) {
        provisionedParams.style.display = 'block';
        document.querySelectorAll('.utilization').forEach(element => {
            element.style.display = 'block';
        });
        updateAll();
    }
});

document.getElementById('tableClass').addEventListener('change', (event) => {
    cfg.tableClass = event.target.value;
    document.getElementById('reserved').disabled = cfg.tableClass === 'infrequentAccess';
    updateAll();
});

document.getElementById('baselineReads').addEventListener('input', (event) => {
    cfg.baselineReads = parseInt(event.target.value);
    document.getElementById('baselineReadsDsp').innerText = formatNumber(cfg.baselineReads);

    if (cfg.peakReads < cfg.baselineReads) {
        cfg.peakReads = cfg.baselineReads;
        document.getElementById('peakReads').value = cfg.peakReads;
        document.getElementById('peakReadsDsp').innerText = formatNumber(cfg.peakReads);
    }

    updateAll();
});

document.getElementById('baselineWrites').addEventListener('input', (event) => {
    cfg.baselineWrites = parseInt(event.target.value);
    document.getElementById('baselineWritesDsp').innerText = formatNumber(cfg.baselineWrites);

    if (cfg.peakWrites < cfg.baselineWrites) {
        cfg.peakWrites = cfg.baselineWrites;
        document.getElementById('peakWrites').value = cfg.peakWrites;
        document.getElementById('peakWritesDsp').innerText = formatNumber(cfg.peakWrites);
    }

    updateAll();
});

document.getElementById('peakReads').addEventListener('input', (event) => {
    let newPeak = parseInt(event.target.value);
    if (newPeak < cfg.baselineReads) {
        cfg.baselineReads = newPeak;
        document.getElementById('baselineReads').value = cfg.baselineReads;
        document.getElementById('baselineReadsDsp').innerText = formatNumber(cfg.baselineReads);
    }
    cfg.peakReads = newPeak;
    document.getElementById('peakReadsDsp').innerText = formatNumber(cfg.peakReads);

    updateAll();
});

document.getElementById('peakWrites').addEventListener('input', (event) => {
    let newPeak = parseInt(event.target.value);
    if (newPeak < cfg.baselineWrites) {
        cfg.baselineWrites = newPeak;
        document.getElementById('baselineWrites').value = cfg.baselineWrites;
        document.getElementById('baselineWritesDsp').innerText = formatNumber(cfg.baselineWrites);
    }
    cfg.peakWrites = newPeak;
    document.getElementById('peakWritesDsp').innerText = formatNumber(cfg.peakWrites);

    updateAll();
});

document.getElementById('peakDurationReads').addEventListener('input', (event) => {
    cfg.peakDurationReads = Math.max(0, parseFloat(event.target.value));
    document.getElementById('peakDurationReadsDsp').innerText = cfg.peakDurationReads.toString();
    updateAll();
});

document.getElementById('peakDurationWrites').addEventListener('input', (event) => {
    cfg.peakDurationWrites = Math.max(0, parseFloat(event.target.value));
    document.getElementById('peakDurationWritesDsp').innerText = cfg.peakDurationReads.toString();
    updateAll();
});

document.getElementById('utilization').addEventListener('input', (event) => {
    cfg.utilization = parseInt(event.target.value);
    document.getElementById('utilizationDsp').innerText = `${formatNumber(cfg.utilization)}%`;
    updateAll();
});

document.getElementById('reserved').addEventListener('input', (event) => {
    cfg.reserved = parseInt(event.target.value);
    document.getElementById('reservedDsp').innerText = `${formatNumber(cfg.reserved)}%`;
    updateAll();
});

document.getElementById('storageGB').addEventListener('input', (event) => {
    const storageGB = parseInt(event.target.value);
    document.getElementById('storageDsp').innerText = formatBytes(storageGB * 1024 * 1024 * 1024);
    updateAll();
});

document.getElementById('storageDsp').innerText = document.getElementById('storageGB').value;

document.getElementById('itemSizeB').addEventListener('input', function (event) {
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
    cfg.itemSizeB = value;
    document.getElementById('itemSizeDsp').innerText = displayValue;
    updateAll();
});

document.getElementById('readConst').addEventListener('input', (event) => {
    cfg.readConst = parseInt(event.target.value);
    const strongConsistent = cfg.readConst;
    const eventuallyConsistent = 100 - strongConsistent;

    let readConstDsp = document.getElementById('readConstDsp');
    if (strongConsistent === 100) {
        readConstDsp.innerText = `Strongly Consistent`;
    } else if (eventuallyConsistent === 100) {
        readConstDsp.innerText = `Eventually Consistent`;
    } else {
        readConstDsp.innerText = `Strongly Consistent: ${strongConsistent}%, Eventually Consistent: ${eventuallyConsistent}%`;
    }

    updateAll();
});

document.getElementById('cacheSize').addEventListener('input', (event) => {
    const cacheSizeGB = parseInt(event.target.value);
    document.getElementById('cacheSizeDsp').innerText = cacheSizeGB >= 1024 ? (cacheSizeGB / 1024).toFixed(2) + ' TB' : cacheSizeGB + ' GB';
    cfg.cacheSizeGB = cacheSizeGB;
    cfg.override = false;
    updateAll();
});

document.getElementById('cacheRatio').addEventListener('input', (event) => {
    const cacheHitRatio = parseInt(event.target.value);
    const cacheMissRatio = 100 - cacheHitRatio;
    document.getElementById('cacheRatioDsp').innerText = `${cacheHitRatio}/${cacheMissRatio}`;
    cfg.cacheRatio = cacheHitRatio;
    cfg.override = false;
    updateAll();
});

document.getElementById('daxNodes').addEventListener('input', (event) => {
    cfg.daxNodes = parseInt(event.target.value);
    document.getElementById('daxNodesDsp').innerText = `${formatNumber(cfg.daxNodes)}`;
    updateAll();
});

document.getElementById('daxInstanceClass').addEventListener('change', (event) => {
    cfg.daxInstanceClass = event.target.value;
    updateAll();
});

setupSliderInteraction('baselineReadsDsp', 'baselineReadsInp', 'baselineReads', formatNumber);
setupSliderInteraction('baselineWritesDsp', 'baselineWritesInp', 'baselineWrites', formatNumber);
setupSliderInteraction('peakReadsDsp', 'peakReadsInp', 'peakReads', formatNumber);
setupSliderInteraction('peakWritesDsp', 'peakWritesInp', 'peakWrites', formatNumber);
setupSliderInteraction('peakDurationReadsDsp', 'peakDurationReadsInp', 'peakDurationReads', value => value);
setupSliderInteraction('peakDurationWritesDsp', 'peakDurationWritesInp', 'peakDurationWrites', value => value);
setupSliderInteraction('reservedDsp', 'reservedInp', 'reserved', value => `${value}%`);
setupSliderInteraction('itemSizeDsp', 'itemSizeInp', 'itemSizeB', value => value < 1024 ? `${value} B` : `${Math.floor(value / 1024)} KB`);
setupSliderInteraction('storageDsp', 'storageInp', 'storageGB', value => formatBytes(value * 1024 * 1024 * 1024));
setupSliderInteraction('regionsDsp', 'regionsInp', 'regions', value => value);
setupSliderInteraction('daxNodesDsp', 'daxNodesInp', 'daxNodes', value => value);

setupSliderInteractionUtilization();

getQueryParams();

if (cfg.pricing === 'demand') {
    document.querySelector('input[name="pricing"][value="demand"]').checked = true;
    document.getElementById('provisionedParams').style.display = 'none';
} else if (cfg.pricing === 'provisioned') {
    document.querySelector('input[name="pricing"][value="provisioned"]').checked = true;
    document.getElementById('provisionedParams').style.display = 'block';
}

document.getElementById('baselineReads').value = cfg.baselineReads;
document.getElementById('baselineWrites').value = cfg.baselineWrites;
document.getElementById('peakReads').value = cfg.peakReads;
document.getElementById('peakWrites').value = cfg.peakWrites;
document.getElementById('peakDurationReads').value = cfg.peakDurationReads;
document.getElementById('peakDurationWrites').value = cfg.peakDurationWrites;
document.getElementById('itemSizeB').value = cfg.itemSizeB;
document.getElementById('storageGB').value = cfg.storageGB;
document.getElementById('regions').value = cfg.regions;
document.getElementById('cacheSize').value = cfg.cacheSizeGB;
document.getElementById('cacheRatio').value = cfg.cacheRatio;
document.getElementById('utilization').value = cfg.utilization;
document.getElementById('reserved').value = cfg.reserved;
document.getElementById('readConst').value = cfg.readConst;

document.getElementById('baselineReadsDsp').innerText = formatNumber(cfg.baselineReads);
document.getElementById('baselineWritesDsp').innerText = formatNumber(cfg.baselineWrites);
document.getElementById('peakReadsDsp').innerText = formatNumber(cfg.peakReads);
document.getElementById('peakWritesDsp').innerText = formatNumber(cfg.peakWrites);
document.getElementById('peakDurationReadsDsp').innerText = cfg.peakDurationReads.toString();
document.getElementById('peakDurationWritesDsp').innerText = cfg.peakDurationWrites.toString();
document.getElementById('itemSizeDsp').innerText = cfg.itemSizeB < 1024 ? `${cfg.itemSizeB} B` : `${Math.floor(cfg.itemSizeB / 1024)} KB`;
document.getElementById('storageDsp').innerText = cfg.storageGB >= 1024 ? (cfg.storageGB / 1024).toFixed(2) + ' TB' : cfg.storageGB + ' GB';
document.getElementById('regionsDsp').innerText = cfg.regions.toString();
document.getElementById('cacheSizeDsp').innerText = cfg.cacheSizeGB >= 1024 ? (cfg.cacheSizeGB / 1024).toFixed(2) + ' TB' : cfg.cacheSizeGB + ' GB';
document.getElementById('cacheRatioDsp').innerText = `${cfg.cacheRatio}/${100 - cfg.cacheRatio}`;
document.getElementById('reservedDsp').innerText = `${cfg.reserved}%`;
document.getElementById('utilizationDsp').innerText = `${cfg.utilization}%`;
document.getElementById('readConstDsp').innerText = cfg.readConst === 0 ? 'Eventually Consistent' : cfg.readConst === 100 ? 'Strongly Consistent' : `Strongly Consistent: ${cfg.readConst}%, Eventually Consistent: ${100 - cfg.readConst}%`;

updateAll();