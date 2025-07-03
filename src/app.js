import {cfg} from './config.js';
import {formatBytes, formatNumber, getQueryParams, toggleService, updateAll} from "./utils.js";
import {chart, encodeSeriesData} from "./chart.js";

export function setupSliderInteraction(displayId, inputId, sliderId, formatFunction) {
    const display = document.getElementById(displayId);
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    // Set override when the slider is manually changed by hand
    slider.addEventListener('mousedown', function () {
        cfg.override = true;
    });

    input.addEventListener('mouseover', function () {
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

    input.addEventListener('keydown', function () {
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
            display.innerText = formatFunction(parseInt(this.value));
            setTimeout(() => {
                slider.dispatchEvent(new Event('input', {bubbles: true}));
            }, 0);
            input.blur();
            cfg.override = true;
            updateAll();
        }
    });

    slider.addEventListener('input', function () {
        display.innerText = formatFunction(parseInt(this.value));
        updateAll();
    });
}

['demand', 'provisioned', 'flex', 'reserved'].forEach(type => {
    document.querySelector(`input[name="pricing"][value="${type}"]`).addEventListener('change', (event) => {
        if (event.target.checked) {
            cfg.pricing = type;
            updateAll();
        }
    });
});

document.getElementById("workload").addEventListener('change', (event) => {
    cfg.workload = event.target.value;
    updateAll();
});

document.getElementById('tableClass').addEventListener('change', (event) => {
    cfg.tableClass = event.target.value;
    document.getElementById('reservedReads').disabled = cfg.tableClass === 'infrequentAccess';
    document.getElementById('reservedWrites').disabled = cfg.tableClass === 'infrequentAccess';
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

document.getElementById('totalReads').addEventListener('input', (event) => {
    const newTotal = parseInt(event.target.value);
    cfg.workload = 'custom';
    document.getElementById('workload').value = cfg.workload;
    if (!isNaN(newTotal) && cfg.seriesReads.length > 0) {
        const currentTotal = cfg.seriesReads.reduce((sum, point) => sum + point.y, 0);
        if (currentTotal === 0) return;

        const scaleFactor = newTotal / currentTotal;
        cfg.seriesReads.forEach((point, index) => {
            point.y *= scaleFactor;
            point.y /= 3600;
            point.y = Math.max(0, point.y);
            chart.data.datasets[0].data[index] = point;
        });

        cfg.totalReads = newTotal;
        encodeSeriesData();
        document.getElementById('totalReadsDsp').innerText = formatNumber(cfg.totalReads);
        updateAll();
    }
});

document.getElementById('totalWrites').addEventListener('input', (event) => {
    const newTotal = parseInt(event.target.value);
    cfg.workload = 'custom';
    document.getElementById('workload').value = cfg.workload;
    if (!isNaN(newTotal) && cfg.seriesWrites.length > 0) {
        const currentTotal = cfg.seriesWrites.reduce((sum, point) => sum + point.y, 0);
        if (currentTotal === 0) return;

        const scaleFactor = newTotal / currentTotal;
        cfg.seriesWrites.forEach((point, index) => {
            point.y *= scaleFactor;
            point.y /= 3600;
            point.y = Math.max(0, point.y);
            chart.data.datasets[1].data[index] = point;
        });

        cfg.totalWrites = newTotal;
        encodeSeriesData();
        document.getElementById('totalWritesDsp').innerText = formatNumber(cfg.totalWrites);
        updateAll();
    }
});

document.getElementById('reservedReads').addEventListener('input', (event) => {
    cfg.reservedReads = parseInt(event.target.value);
    document.getElementById('reservedReadsDsp').innerText = `${formatNumber(cfg.reservedReads)}%`;
    updateAll();
});

document.getElementById('reservedWrites').addEventListener('input', (event) => {
    cfg.reservedWrites = parseInt(event.target.value);
    document.getElementById('reservedWritesDsp').innerText = `${formatNumber(cfg.reservedWrites)}%`;
    updateAll();
});

document.getElementById('overprovisioned').addEventListener('input', (event) => {
    cfg.overprovisioned = parseInt(event.target.value);
    document.getElementById('overprovisionedDsp').innerText = `${formatNumber(cfg.overprovisioned)}%`;
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

    let displayValue;
    if (value < 1024) {
        displayValue = `${value} B`;
    } else {
        displayValue = `${Math.round(value / 1024)} KB`;
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
setupSliderInteraction('totalReadsDsp', 'totalReadsInp', 'totalReads', formatNumber);
setupSliderInteraction('totalWritesDsp', 'totalWritesInp', 'totalWrites', formatNumber);
setupSliderInteraction('reservedReadsDsp', 'reservedReadsInp', 'reservedReads', value => `${value}%`);
setupSliderInteraction('reservedWritesDsp', 'reservedWritesInp', 'reservedWrites', value => `${value}%`);
setupSliderInteraction('overprovisionedDsp', 'overprovisionedInp', 'overprovisioned', value => `${value}%`);
setupSliderInteraction('itemSizeDsp', 'itemSizeInp', 'itemSizeB', value => value < 1024 ? `${value} B` : `${Math.round(value / 1024)} KB`);
setupSliderInteraction('storageDsp', 'storageInp', 'storageGB', value => formatBytes(value * 1024 * 1024 * 1024));
setupSliderInteraction('regionsDsp', 'regionsInp', 'regions', value => value);
setupSliderInteraction('daxNodesDsp', 'daxNodesInp', 'daxNodes', value => value);

if (cfg.pricing === 'demand') {
    document.querySelector('input[name="pricing"][value="demand"]').checked = true;
    document.getElementById('provisionedParams').style.display = 'none';
} else if (cfg.pricing === 'provisioned') {
    document.querySelector('input[name="pricing"][value="provisioned"]').checked = true;
    document.getElementById('provisionedParams').style.display = 'block';
}

getQueryParams();

document.getElementById('workload').value = cfg.workload;
document.getElementById('baselineReads').value = cfg.baselineReads;
document.getElementById('baselineReads').value = cfg.baselineReads;
document.getElementById('baselineWrites').value = cfg.baselineWrites;
document.getElementById('peakReads').value = cfg.peakReads;
document.getElementById('peakWrites').value = cfg.peakWrites;
document.getElementById('peakDurationReads').value = cfg.peakDurationReads;
document.getElementById('peakDurationWrites').value = cfg.peakDurationWrites;
document.getElementById('totalReads').value = cfg.totalReads;
document.getElementById('totalWrites').value = cfg.totalWrites;
document.getElementById('itemSizeB').value = cfg.itemSizeB;
document.getElementById('storageGB').value = cfg.storageGB;
document.getElementById('regions').value = cfg.regions;
document.getElementById('cacheSize').value = cfg.cacheSizeGB;
document.getElementById('cacheRatio').value = cfg.cacheRatio;
document.getElementById('reservedReads').value = cfg.reservedReads;
document.getElementById('reservedWrites').value = cfg.reservedWrites;
document.getElementById('overprovisioned').value = cfg.overprovisioned;
document.getElementById('readConst').value = cfg.readConst;
document.getElementById('daxNodes').value = cfg.daxNodes;
document.getElementById('daxInstanceClass').value = cfg.daxInstanceClass;

document.getElementById('baselineReadsDsp').innerText = formatNumber(cfg.baselineReads);
document.getElementById('baselineWritesDsp').innerText = formatNumber(cfg.baselineWrites);
document.getElementById('peakReadsDsp').innerText = formatNumber(cfg.peakReads);
document.getElementById('peakWritesDsp').innerText = formatNumber(cfg.peakWrites);
document.getElementById('peakDurationReadsDsp').innerText = cfg.peakDurationReads.toString();
document.getElementById('peakDurationWritesDsp').innerText = cfg.peakDurationWrites.toString();
document.getElementById('totalReadsDsp').innerText = formatNumber(cfg.totalReads);
document.getElementById('totalWritesDsp').innerText = formatNumber(cfg.totalWrites);
document.getElementById('itemSizeDsp').innerText = cfg.itemSizeB < 1024 ? `${cfg.itemSizeB} B` : `${Math.round(cfg.itemSizeB / 1024)} KB`;
document.getElementById('storageDsp').innerText = cfg.storageGB >= 1024 ? (cfg.storageGB / 1024).toFixed(2) + ' TB' : cfg.storageGB + ' GB';
document.getElementById('regionsDsp').innerText = cfg.regions.toString();
document.getElementById('cacheSizeDsp').innerText = cfg.cacheSizeGB >= 1024 ? (cfg.cacheSizeGB / 1024).toFixed(2) + ' TB' : cfg.cacheSizeGB + ' GB';
document.getElementById('cacheRatioDsp').innerText = `${cfg.cacheRatio}/${100 - cfg.cacheRatio}`;
document.getElementById('reservedReadsDsp').innerText = `${cfg.reservedReads}%`;
document.getElementById('reservedWritesDsp').innerText = `${cfg.reservedWrites}%`;
document.getElementById('overprovisionedDsp').innerText = `${cfg.overprovisioned}%`;
document.getElementById('readConstDsp').innerText = cfg.readConst === 0 ? 'Eventually Consistent' : cfg.readConst === 100 ? 'Strongly Consistent' : `Strongly Consistent: ${cfg.readConst}%, Eventually Consistent: ${100 - cfg.readConst}%`;
document.getElementById('daxNodesDsp').innerText = `${cfg.daxNodes}`;

document.addEventListener('DOMContentLoaded', function () {
    const logos = document.querySelectorAll('.logo');
    logos.forEach(logo => {
        logo.addEventListener('click', toggleService);
    });

    const tabLabels = document.querySelectorAll('.tab-label');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLabels.forEach(tabLabel => {
        tabLabel.addEventListener('click', function (e) {
            e.preventDefault();

            tabLabels.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            this.classList.add('active');

            const tabContentId = this.getAttribute('href');
            document.getElementById(tabContentId).classList.add('active');
        });
    });

    document.getElementById("saveCsvBtn").addEventListener("click", function () {
        if (!chart?.data?.datasets?.length) {
            console.warn("Chart or datasets not available");
            return;
        }

        let csv = "Hour,Reads ops/sec,Writes ops/sec\n";
        const datasets = chart.data.datasets;

        for (let i = 0; i < datasets[0].data.length; i++) {
            const hour = datasets[0].data[i].x;
            const reads = datasets[0].data[i].y.toFixed(0);
            const writes = datasets[1].data[i].y.toFixed(0);
            csv += `${hour},${reads},${writes}\n`;
        }

        const blob = new Blob([csv], {type: "text/csv"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cfg.workload || "workload"}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    updateAll();
});
