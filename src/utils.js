import {cfg} from './config.js';
import {updateCosts} from "./calculator.js";
import {updateSeries} from "./chart.js";
import {updateScyllaCosts} from "./calculatorScyllaDB.js";

// Format a number with suffixes (K, M, B)
export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    if (num >= 1) return num.toFixed(0);
    if (num === 0) return "";
    return num.toString();
}

// Format bytes with appropriate units
export function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// Helper to parse and assign a param if present
function assignParam(param, parser = v => v) {
    const params = new URLSearchParams(window.location.search);
    if (params.get(param) !== null) {
        cfg[param] = parser(params.get(param));
        // Update the input field if it exists
        const input = document.getElementById(param);
        if (input) {
            input.value = cfg[param];
        }
    }
}

// Parse query params and update cfg accordingly
export function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    assignParam('service');
    assignParam('workload');
    assignParam('baselineReads', parseInt);
    assignParam('baselineWrites', parseInt);
    assignParam('peakReads', parseInt);
    assignParam('peakWrites', parseInt);
    assignParam('peakDurationReads', parseFloat);
    assignParam('peakDurationWrites', parseFloat);
    assignParam('totalReads', parseInt);
    assignParam('totalWrites', parseInt);
    assignParam('storageGB', parseInt);
    assignParam('itemSizeB', parseInt);
    assignParam('pricing');
    assignParam('regions', parseInt);
    assignParam('cacheSizeGB', parseInt);
    assignParam('cacheRatio', parseInt);
    assignParam('reserved', parseInt);
    assignParam('reservedReads', parseInt);
    assignParam('reservedWrites', parseInt);
    assignParam('overprovisioned', parseInt);
    assignParam('readConst', parseInt);

    if (cfg.pricing === 'provisioned' || cfg.pricing === 'demand') {
        const radio = document.querySelector(`input[name="pricing"][value="${cfg.pricing}"]`);
        if (radio) radio.checked = true;
    }

    if (cfg.reserved > 0) {
        cfg.reservedReads = cfg.reserved;
        cfg.reservedWrites = cfg.reserved;
    }

    if (cfg.workload === 'custom') {
        cfg.seriesReadsEncoded = params.get('seriesReads') || '';
        cfg.seriesWritesEncoded = params.get('seriesWrites') || '';
    }

    if (cfg.service === 'scylladb') {
        document.querySelector('.dynamo-logo').style.display = 'none';
        document.querySelector('.scylla-logo').style.display = '';
        document.getElementById('mainTitle').textContent = 'ScyllaDB Cost Calculator';
    } else {
        document.querySelector('.dynamo-logo').style.display = '';
        document.querySelector('.scylla-logo').style.display = 'none';
        document.getElementById('mainTitle').textContent = 'DynamoDB Cost Calculator';
    }

    if(params.get('daxNodes')) {
        cfg.daxNodes = parseInt(params.get('daxNodes'));
        cfg.daxInstanceClass = params.get('daxInstanceClass');
        cfg.override = true;
    }

    if (params.get('standalone') === 'false') {
        document.body.classList.remove('standalone');
    }

    if (params.get('format') === 'json') {
        updateAll();
        const jsonResponse = JSON.stringify(cfg, null, 2);
        const response = new Response(jsonResponse, {
            headers: { 'Content-Type': 'application/json' }
        });
        response.text().then(text => {
            const blob = new Blob([text], { type: 'application/json' });
            window.location.href = URL.createObjectURL(blob);
        });
    }
}

let debounceTimeout;

// Update the URL query params to reflect current cfg
export function updateQueryParams() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);

        const setOrDelete = (key, value, defaultValue = undefined) => {
            if (defaultValue !== undefined && value === defaultValue) {
                params.delete(key);
            } else {
                params.set(key, value.toString());
            }
        };

        setOrDelete('service', cfg.service);
        setOrDelete('pricing', cfg.pricing);
        setOrDelete('storageGB', cfg.storageGB);
        setOrDelete('itemSizeB', cfg.itemSizeB);
        setOrDelete('tableClass', cfg.tableClass);
        setOrDelete('baselineReads', cfg.baselineReads);
        setOrDelete('baselineWrites', cfg.baselineWrites);
        setOrDelete('peakReads', cfg.peakReads);
        setOrDelete('peakWrites', cfg.peakWrites);
        setOrDelete('peakDurationReads', cfg.peakDurationReads);
        setOrDelete('peakDurationWrites', cfg.peakDurationWrites);
        setOrDelete('totalReads', cfg.totalReads);
        setOrDelete('totalWrites', cfg.totalWrites);
        setOrDelete('reservedReads', cfg.reservedReads);
        setOrDelete('reservedWrites', cfg.reservedWrites);
        setOrDelete('overprovisioned', cfg.overprovisioned);
        setOrDelete('readConst', cfg.readConst);
        setOrDelete('seriesReads', cfg.seriesReadsEncoded);
        setOrDelete('seriesWrites', cfg.seriesWritesEncoded);
        setOrDelete('workload', cfg.workload);

        if (cfg.cacheSizeGB === 0) {
            params.delete('cacheSizeGB');
            params.delete('cacheRatio');
        } else {
            setOrDelete('cacheSizeGB', cfg.cacheSizeGB);
            setOrDelete('cacheRatio', cfg.cacheRatio);
        }

        if (cfg.daxNodes === 0) {
            params.delete('daxNodes');
            params.delete('daxInstanceClass');
        } else {
            setOrDelete('daxNodes', cfg.daxNodes);
            setOrDelete('daxInstanceClass', cfg.daxInstanceClass);
        }

        if (cfg.regions === 1) {
            params.delete('regions');
        } else {
            setOrDelete('regions', cfg.regions);
        }

        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        console.log('Updated with cfg:', cfg);
    }, 1000);
}

// Helper to update display and input fields
export function updateOpsDisplays() {
    document.getElementById('totalReadsDsp').innerText = formatNumber(cfg.totalReads);
    document.getElementById('totalWritesDsp').innerText = formatNumber(cfg.totalWrites);
    document.getElementById('totalReadsInp').value = cfg.totalReads;
    document.getElementById('totalWritesInp').value = cfg.totalWrites;
    document.getElementById('totalReads').innerText = formatNumber(cfg.totalReads);
    document.getElementById('totalWrites').innerText = formatNumber(cfg.totalWrites);
}

// Toggle between ops params and total ops params
export function toggleOpsParams() {
    const opsParams = document.getElementById('opsParams');
    const totalOpsParams = document.getElementById('totalOpsParams');
    if (cfg.workload === "baselinePeak") {
        opsParams.style.display = 'block';
        totalOpsParams.style.display = 'none';
    } else {
        opsParams.style.display = 'none';
        totalOpsParams.style.display = 'block';
    }
}

// Toggle between provisioned and demand params
export function toggleProvisionedParams() {
    const provisionedParams = document.getElementById('provisionedParams');
    if (cfg.pricing === 'provisioned') {
        provisionedParams.style.display = 'block';
    } else {
        provisionedParams.style.display = 'none';
    }
}

// Update all UI and calculations
export function updateAll() {
    toggleProvisionedParams();
    toggleOpsParams();
    updateSeries(); // we have to update series before costs
    if (cfg.service === 'dynamodb') {
        updateCosts();
    } else if (cfg.service === 'scylladb') {
        updateScyllaCosts();
    }
    updateSeries(); // update series after costs to ensure correct values
    updateOpsDisplays();
    updateQueryParams();
}

// Update the displayed costs in the DOM
export function updateDisplayedCosts(logs) {
    const costs = document.getElementById('costs');
    costs.innerHTML = logs.map(log => {
        const [key, value] = log.split(': ');
        if (key === '---' && value === '---') {
            return `<hr>`;
        }
        return `
    <div class="cost-entry ${/Total.+?cost/.test(key) ? ' total lead' : ''}">
      <span class="cost-key">${key}</span>
      <span class="cost-value">
        <span class="dollar-sign">$</span>
        <span class="number">${value}</span>
      </span>
    </div>
  `;
    }).join('');
}

// --- Share and Copy Link Logic ---

const shareButton = document.getElementById('shareBtn');
const copyLinkButton = document.getElementById('copyLinkBtn');
const resultPara = document.querySelector('.result');

function buildShareableURL() {
    const currentURL = new URL(window.location.href);
    const params = new URLSearchParams(window.location.search);
    currentURL.search = params.toString();
    return currentURL.toString();
}

const shareData = {
    title: 'ScyllaDB | DynamoDB Workload Calculator',
    text: 'Check out this DynamoDB workload calculator powered by ScyllaDB!',
    url: buildShareableURL(),
};

shareButton.addEventListener('click', async () => {
    if (!navigator.share) {
        resultPara.textContent = 'Web Share API is not supported in your browser.';
        return;
    }
    try {
        await navigator.share(shareData);
        resultPara.textContent = 'Calculator shared successfully';
    } catch (err) {
        console.log('Error sharing: ' + err.message);
    }
});

copyLinkButton.addEventListener('click', () => {
    const url = buildShareableURL();
    navigator.clipboard.writeText(url)
        .then(() => {
            const icon = copyLinkButton.querySelector('i');
            const originalClasses = [...icon.classList];
            icon.classList.remove('icon-copy');
            icon.classList.add('icon-check-circle-outline');
            setTimeout(() => {
                icon.classList.remove('icon-check-circle-outline');
                icon.classList.add(...originalClasses);
            }, 2000);
        })
        .catch((err) => {
            resultPara.textContent = 'Failed to copy: ' + err.message;
        });
});
