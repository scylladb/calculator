import {cfg} from './config.js';
import {updateCosts} from "./calculator.js";
import {updateChart} from "./chart.js";

export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(0) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    if (num >= 1) return num.toFixed(0);
    if (num === 0) return "";
    return num.toString();
}

export function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

export function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('workload')) cfg.workload = params.get('workload');
    if (params.get('baselineReads')) cfg.baselineReads = parseInt(params.get('baselineReads'));
    if (params.get('baselineWrites')) cfg.baselineWrites = parseInt(params.get('baselineWrites'));
    if (params.get('peakReads')) cfg.peakReads = parseInt(params.get('peakReads'));
    if (params.get('peakWrites')) cfg.peakWrites = parseInt(params.get('peakWrites'));
    if (params.get('peakDurationReads')) cfg.peakDurationReads = parseFloat(params.get('peakDurationReads'));
    if (params.get('peakDurationWrites')) cfg.peakDurationWrites = parseFloat(params.get('peakDurationWrites'));
    if (params.get('storageGB')) cfg.storageGB = parseInt(params.get('storageGB'));
    if (params.get('itemSizeB')) cfg.itemSizeB = parseInt(params.get('itemSizeB'));
    if (params.get('pricing')) cfg.pricing = params.get('pricing');
    if (params.get('regions')) cfg.regions = parseInt(params.get('regions'));
    if (params.get('cacheSizeGB')) cfg.cacheSizeGB = parseInt(params.get('cacheSizeGB'));
    if (params.get('cacheRatio')) cfg.cacheRatio = parseInt(params.get('cacheRatio'));
    if (params.get('reserved')) cfg.reserved = parseInt(params.get('reserved'));
    if (params.get('readConst')) cfg.readConst = parseInt(params.get('readConst'));

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

export function updateQueryParams() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);

        params.set('pricing', cfg.pricing);
        params.set('storageGB', cfg.storageGB.toString());
        params.set('itemSizeB', cfg.itemSizeB.toString());
        params.set('tableClass', cfg.tableClass);
        params.set('baselineReads', cfg.baselineReads.toString());
        params.set('baselineWrites', cfg.baselineWrites.toString());
        params.set('peakReads', cfg.peakReads.toString());
        params.set('peakWrites', cfg.peakWrites.toString());
        params.set('peakDurationReads', cfg.peakDurationReads.toString());
        params.set('peakDurationWrites', cfg.peakDurationWrites.toString());
        params.set('reserved', cfg.reserved.toString());
        params.set('readConst', cfg.readConst.toString());

        if (cfg.cacheSizeGB === 0) {
            params.delete('cacheSizeGB');
            params.delete('cacheRatio');
        } else {
            params.set('cacheSizeGB', cfg.cacheSizeGB.toString());
            params.set('cacheRatio', cfg.cacheRatio.toString());
        }

        if (cfg.daxNodes === 0) {
            params.delete('daxNodes');
            params.delete('daxInstanceClass');
        } else {
            params.set('daxNodes', cfg.daxNodes.toString());
            params.set('daxInstanceClass', cfg.daxInstanceClass);
        }

        if (cfg.regions === 1) {
            params.delete('regions');
        } else {
            params.set('regions', cfg.regions.toString());
        }

        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }, 1000);
}

export function updateAll() {
    updateQueryParams();
    updateChart();
    updateCosts();
}

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

// Share button selector
const shareButton = document.getElementById('shareBtn');
const copyLinkButton = document.getElementById('copyLinkBtn');
const resultPara = document.querySelector('.result');

// Function to build the shareable URL with query parameters
function buildShareableURL() {
    const currentURL = new URL(window.location.href);
    const params = new URLSearchParams(window.location.search);
    currentURL.search = params.toString();
    return currentURL.toString();
}

// Data to share
const shareData = {
    title: 'ScyllaDB | DynamoDB Workload Calculator',
    text: 'Check out this DynamoDB workload calculator powered by ScyllaDB!',
    url: buildShareableURL(),
};

// Share button event listener
shareButton.addEventListener('click', async () => {
    try {
        if (navigator.share) {
            // Web Share API is supported
            await navigator.share(shareData);
            resultPara.textContent = 'Calculator shared successfully';
        } else {
            resultPara.textContent = 'Web Share API is not supported in your browser.';
        }
    } catch (err) {
        console.log('Error sharing: ' + err.message);
    }
});

// Copy link event listener
copyLinkButton.addEventListener('click', () => {
    const url = buildShareableURL();
    navigator.clipboard.writeText(url)
        .then(() => {
            // Get the icon element
            const icon = copyLinkButton.querySelector('i');
            // Store the original classes
            const originalClasses = [...icon.classList];

            // Temporarily switch icon while keeping existing classes
            icon.classList.remove('icon-copy');
            icon.classList.add('icon-check-circle-outline');

            // Revert icon after 2 seconds
            setTimeout(() => {
                icon.classList.remove('icon-check-circle-outline');
                icon.classList.add(...originalClasses);
            }, 2000);
        })
        .catch((err) => {
            resultPara.textContent = 'Failed to copy: ' + err.message;
        });
});