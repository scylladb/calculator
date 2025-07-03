import {cfg} from './config.js';
import {updateDisplayedCosts} from "./utils.js";

function getPricing() {
    cfg.pricing = document.querySelector('input[name="pricing"]:checked').value;
}

function getReplicatedRegions() {
    cfg.regions = parseInt(document.getElementById('regions').value);
}

function getStorageValues() {
    cfg.storageGB = parseInt(document.getElementById('storageGB').value);
    cfg.itemSizeKB = parseInt(document.getElementById('itemSizeB').value) * (1 / 1024);
    cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.round(cfg.itemSizeKB) : cfg.itemSizeKB;
}

function getConsistencyValues() {
    cfg.readConst = parseInt(document.getElementById('readConst').value);
    cfg.readStronglyConsistent = cfg.readConst / 100;
    cfg.readEventuallyConsistent = 1 - cfg.readStronglyConsistent;
}

function getReservedValues() {
    cfg.reservedReads = parseInt(document.getElementById('reservedReads').value);
    cfg.reservedWrites = parseInt(document.getElementById('reservedWrites').value);
}

function getOverprovisionedValues() {
    cfg.overprovisioned = parseInt(document.getElementById('overprovisioned').value);
    cfg.overprovisionedPercentage = 1 + (cfg.overprovisioned / 100.0);
}

function getTotalOps() {
    cfg.totalReads = 0;
    cfg.totalWrites = 0;

    for (const point of cfg.seriesReads) {
        cfg.totalReads += (point.y * 3600);
    }
    for (const point of cfg.seriesWrites) {
        cfg.totalWrites += (point.y * 3600);
    }
}

export function calculateScyllaCosts() {
    // Replication factor
    const replication = cfg.scyllaReplication;

    // Total ops/sec (RCU + WCU) * replication
    // For ScyllaDB, we consider peak reads and writes
    const totalOps = (cfg.peakReads + cfg.peakWrites) * replication;

    // Required vCPUs
    const requiredVCPUs = Math.ceil(totalOps / cfg.scyllaOpsPerVCPU);

    // Storage (apply compression, then replication)
    const rawStorage = cfg.storageGB;
    const compressedStorage = rawStorage * (cfg.scyllaCompressionRatio);
    const requiredStorage = Math.ceil(compressedStorage * replication);

    // Calculate node counts for each family
    const nodeOptions = Object.entries(cfg.priceScylla).map(([type, spec]) => {
        const nodesForVCPU = Math.ceil(requiredVCPUs / spec.vcpu);
        const usableStoragePerNode = spec.storage / cfg.scyllaStorageUtilization;
        const nodesForStorage = Math.ceil(requiredStorage / usableStoragePerNode);
        let nodes = Math.max(nodesForVCPU, nodesForStorage);
        // Ensure nodes is a multiple of replication factor (3 for ScyllaDB)
        if (nodes % replication !== 0) {
            nodes = nodes + (replication - (nodes % replication));
        }
        const cost = nodes * spec.price * (cfg.regions || 1);
        return { type, nodes, cost };
    });

    // Choose the option with the least nodes, then lowest cost if tie
    const minNodes = Math.min(...nodeOptions.map(opt => opt.nodes));
    const bestCandidates = nodeOptions.filter(opt => opt.nodes === minNodes);
    const best = bestCandidates.reduce((a, b) => (a.cost < b.cost ? a : b));

    cfg._demandCosts = {
        replication,
        requiredVCPUs,
        requiredStorage,
        nodeOptions,
        bestInstanceType: best.type,
        bestNodeCount: best.nodes,
        bestMonthlyCost: best.cost
    };
}

function calculateNetworkCosts() {
    cfg.totalReadsKB = cfg.totalReadOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalWritesKB = cfg.totalWriteOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalReplicatedWritesGB =((cfg.regions - 1) * cfg.totalWritesKB) / 1024 / 1024;
    cfg.costNetwork = cfg.totalReplicatedWritesGB * cfg.priceIntraRegPerGB;
}

function calculateTotalOpsSec() {
    cfg.totalReadOpsSec = cfg.baselineReads;
    cfg.totalWriteOpsSec = cfg.baselineWrites;
    cfg.totalOpsSec = cfg.totalReadOpsSec + cfg.totalWriteOpsSec;
}

function logCosts() {
    let logs = [];

    if (cfg.pricing === 'demand') {
        logs.push(`Monthly on-demand cost: ${Math.floor(cfg._demandCost.monthlyCost).toLocaleString()}`);
    } else {
        logs.push(`Monthly reserved cost: ${Math.floor(cfg._reservedCost.monthlyCost).toLocaleString()}`);
    }

    if (cfg.costNetwork !== 0) {
        logs.push(`Monthly network cost: ${Math.floor(cfg.costNetwork).toLocaleString()}`);
    }

    logs.push(`---: ---`);

    logs.push(`Total monthly cost: ${Math.floor(cfg.costTotalMonthly).toLocaleString()}`);
    logs.push(`Total annual cost: ${Math.floor(cfg.costTotalMonthly * 12).toLocaleString()}`);

    updateDisplayedCosts(logs);
}

export function updateCosts() {
    getPricing();
    getReplicatedRegions()
    getStorageValues();
    getConsistencyValues();
    getReservedValues();
    getOverprovisionedValues()
    getTotalOps();

    calculateScyllaCosts();
    calculateTotalOpsSec();
    calculateNetworkCosts();

    cfg.costTotalMonthly = cfg.pricing === 'demand' ?
        cfg._demandCosts + cfg.costNetwork :
        cfg._demandCosts + cfg.costNetwork; //TODO: Add reserved costs

    logCosts();
}
