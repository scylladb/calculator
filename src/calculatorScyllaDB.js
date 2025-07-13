import {cfg} from './config.js';
import {updateDisplayedCosts} from "./utils.js";
import {
    getItemSize,
    getMaxOpsPerSec,
    getPricing,
    getReadConsistency,
    getRegions,
    getReserved,
    getStorage
} from "./calculatorCommon.js";

export function calculateScyllaDBCosts() {
    // Replication factor
    const replication = cfg.scyllaReplication;

    // Max ops/sec * replication
    const maxOpsPerSec = (cfg.maxReads + cfg.maxWrites) * replication;

    // Required vCPUs
    const requiredVCPUs = Math.ceil(maxOpsPerSec / cfg.scyllaOpsPerVCPU);

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
        const cost = nodes * spec.price * (cfg.regions || 1) * cfg.hoursPerMonth;
        return {type, nodes, cost};
    });

    // Choose the option with the least nodes, then lowest cost if tie
    const minNodes = Math.min(...nodeOptions.map(opt => opt.nodes));
    const bestCandidates = nodeOptions.filter(opt => opt.nodes === minNodes);
    const best = bestCandidates.reduce((a, b) => (a.cost < b.cost ? a : b));

    cfg._baseCost = {
        replication,
        requiredVCPUs,
        requiredStorage,
        nodeOptions,
        bestInstanceType: best.type,
        bestNodeCount: best.nodes,
        monthlyCost: best.cost
    };
}

function calculateNetworkCosts() {
    cfg.totalReadsKB = cfg.totalReadOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalWritesKB = cfg.totalWriteOpsSec * 3600 * cfg.hoursPerMonth * cfg.itemSizeKB;
    cfg.totalReplicatedWritesGB = ((cfg.regions - 1) * cfg.totalWritesKB) / 1024 / 1024;
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
        logs.push(`Monthly on-demand cost: ${Math.floor(cfg._baseCost.monthlyCost).toLocaleString()}`);
    } else if (cfg.pricing === 'reserved') {
        logs.push(`Monthly reserved cost: ${Math.floor(cfg._baseCost.monthlyCost * (1 - cfg.scyllaReservedDiscount)).toLocaleString()}`);
    } else if (cfg.pricing === 'flex') {
        logs.push(`Monthly flex cost: ${Math.floor(cfg._baseCost.monthlyCost * (1 - cfg.scyllaFlexDiscount)).toLocaleString()}`);
    }

    if (cfg.costNetwork !== 0) {
        logs.push(`Monthly network cost: ${Math.floor(cfg.costNetwork).toLocaleString()}`);
    }

    logs.push(`---: ---`);

    logs.push(`Total monthly cost: ${Math.floor(cfg.costTotalMonthly).toLocaleString()}`);
    logs.push(`Total annual cost: ${Math.floor(cfg.costTotalMonthly * 12).toLocaleString()}`);

    updateDisplayedCosts(logs);
}

export function updateScyllaDBCosts() {
    getPricing();
    getRegions()
    getStorage();
    getItemSize();
    getReadConsistency();

    getReserved();
    getMaxOpsPerSec();

    calculateScyllaDBCosts();
    calculateTotalOpsSec();
    calculateNetworkCosts();

    cfg.costTotalMonthly = cfg.pricing === 'demand' ? cfg._baseCost.monthlyCost + cfg.costNetwork : cfg._baseCost.monthlyCost + cfg.costNetwork;

    logCosts();
}
