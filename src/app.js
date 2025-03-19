import {cfg} from './config.js';
import {formatBytes, formatNumber, getQueryParams, updateAll} from "./utils.js";

export function setupSliderInteraction(displayId, inputId, sliderId, formatFunction) {
    const display = document.getElementById(displayId);
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    display.addEventListener('click', function (event) {
        event.stopPropagation();
        input.value = parseInt(slider.value.toString());
        display.style.display = 'none';
        input.style.display = 'inline';
        setTimeout(() => input.focus(), 0);
    });

    input.addEventListener('blur', function () {
        const newValue = parseInt(input.value.toString());
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
            display.innerText = formatFunction(parseInt(event.target.value));
            setTimeout(() => {
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }, 0);
            input.blur();
            updateAll();
        }
    });

    slider.addEventListener('input', function (event) {
        display.innerText = formatFunction(parseInt(event.target.value));
        updateAll();
    });
}

export function toggleSection(linkId, sectionId) {
    document.getElementById(linkId).classList.add('foldable', 'collapsed');
    document.getElementById(linkId).addEventListener('click', function (event) {
        event.preventDefault();
        const section = document.getElementById(sectionId);
        if (section.style.display === 'none') {
            section.style.display = 'block';
            this.classList.remove('collapsed');
            this.classList.add('expanded');
        } else {
            section.style.display = 'none';
            this.classList.remove('expanded');
            this.classList.add('collapsed');
        }
    });
}

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
        updateAll();
    }
});

document.getElementById('tableClass').addEventListener('change', (event) => {
    cfg.tableClass = event.target.value;
    document.getElementById('reserved').disabled = cfg.tableClass === 'infrequentAccess';
    updateAll();
});

document.getElementById('ratio').addEventListener('input', (event) => {
    cfg.ratio = parseInt(event.target.value);
    const writeRatio = cfg.ratio;
    const readRatio = 100 - writeRatio;
    document.getElementById('ratioDsp').innerText = `${readRatio}/${writeRatio}`;
    updateAll();
});

document.getElementById('baseline').addEventListener('input', (event) => {
    cfg.baseline = parseInt(event.target.value);
    document.getElementById('baselineDsp').innerText = formatNumber(cfg.baseline);

    if (cfg.peak < cfg.baseline) {
        cfg.peak = cfg.baseline;
        document.getElementById('peak').value = cfg.peak;
        document.getElementById('peakDsp').innerText = formatNumber(cfg.peak);
    }

    updateAll();
});

document.getElementById('peakWidth').addEventListener('input', (event) => {
    cfg.peakWidth = Math.max(1, parseInt(event.target.value));
    document.getElementById('peakWidthDsp').innerText = cfg.peakWidth.toString();
    updateAll();
});

document.getElementById('peak').addEventListener('input', (event) => {
    let newPeak = parseInt(event.target.value);
    if (newPeak < cfg.baseline) {
        cfg.baseline = newPeak;
        document.getElementById('baseline').value = cfg.baseline;
        document.getElementById('baselineDsp').innerText = formatNumber(cfg.baseline);
    }
    cfg.peak = newPeak;
    document.getElementById('peakDsp').innerText = formatNumber(cfg.peak);
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
    updateAll();
});

document.getElementById('cacheRatio').addEventListener('input', (event) => {
    const cacheHitRatio = parseInt(event.target.value);
    const cacheMissRatio = 100 - cacheHitRatio;
    document.getElementById('cacheRatioDsp').innerText = `${cacheHitRatio}/${cacheMissRatio}`;
    cfg.cacheRatio = cacheHitRatio;
    updateAll();
});

setupSliderInteraction('baselineDsp', 'baselineInp', 'baseline', formatNumber);
setupSliderInteraction('peakDsp', 'peakInp', 'peak', formatNumber);
setupSliderInteraction('peakWidthDsp', 'peakWidthInp', 'peakWidth', value => value);
setupSliderInteraction('itemSizeDsp', 'itemSizeInp', 'itemSizeB', value => value < 1024 ? `${value} B` : `${Math.floor(value / 1024)} KB`);
setupSliderInteraction('storageDsp', 'storageInp', 'storageGB', formatBytes);
setupSliderInteraction('regionsDsp', 'regionsInp', 'regions', value => value);

toggleSection('costLink', 'costParams');
toggleSection('opsLink', 'opsParams');
toggleSection('tableLink', 'tableParams');
toggleSection('storageLink', 'storageParams');
toggleSection('consistencyLink', 'consistencyParams');
toggleSection('daxLink', 'daxParams');

getQueryParams();

if (cfg.pricing === 'demand') {
    document.querySelector('input[name="pricing"][value="demand"]').checked = true;
    document.getElementById('provisionedParams').style.display = 'none';
} else if (cfg.pricing === 'provisioned') {
    document.querySelector('input[name="pricing"][value="provisioned"]').checked = true;
    document.getElementById('provisionedParams').style.display = 'block';
}

document.getElementById('baseline').value = cfg.baseline;
document.getElementById('peak').value = cfg.peak;
document.getElementById('peakWidth').value = cfg.peakWidth;
document.getElementById('itemSizeB').value = cfg.itemSizeB;
document.getElementById('storageGB').value = cfg.storageGB;
document.getElementById('ratio').value = cfg.ratio;
document.getElementById('regions').value = cfg.regions;
document.getElementById('cacheSize').value = cfg.cacheSizeGB;
document.getElementById('cacheRatio').value = cfg.cacheRatio;
document.getElementById('reserved').value = cfg.reserved;
document.getElementById('readConst').value = cfg.readConst;

document.getElementById('baselineDsp').innerText = formatNumber(cfg.baseline);
document.getElementById('peakDsp').innerText = formatNumber(cfg.peak);
document.getElementById('peakWidthDsp').innerText = cfg.peakWidth.toString();
document.getElementById('itemSizeDsp').innerText = cfg.itemSizeB < 1024 ? `${cfg.itemSizeB} B` : `${Math.floor(cfg.itemSizeB / 1024)} KB`;
document.getElementById('storageDsp').innerText = cfg.storageGB >= 1024 ? (cfg.storageGB / 1024).toFixed(2) + ' TB' : cfg.storageGB + ' GB';
document.getElementById('ratioDsp').innerText = `${100 - cfg.ratio}/${cfg.ratio}`;
document.getElementById('regionsDsp').innerText = cfg.regions.toString();
document.getElementById('cacheSizeDsp').innerText = cfg.cacheSizeGB >= 1024 ? (cfg.cacheSizeGB / 1024).toFixed(2) + ' TB' : cfg.cacheSizeGB + ' GB';
document.getElementById('cacheRatioDsp').innerText = `${cfg.cacheRatio}/${100 - cfg.cacheRatio}`;
document.getElementById('reservedDsp').innerText = `${cfg.reserved}%`;
document.getElementById('readConstDsp').innerText = cfg.readConst === 0 ? 'Eventually Consistent' : cfg.readConst === 100 ? 'Strongly Consistent' : `Strongly Consistent: ${cfg.readConst}%, Eventually Consistent: ${100 - cfg.readConst}%`;

updateAll();
