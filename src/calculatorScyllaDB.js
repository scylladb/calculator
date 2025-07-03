import {cfg} from './config.js';
import {updateDisplayedCosts} from "./utils.js";
import {getPricing, getReadConsistency, getRegions, getStorage} from "./calculatorCommon.js";

function getReservedValues() {
    cfg.reservedReads = parseInt(document.getElementById('reservedReads').value);
    cfg.reservedWrites = parseInt(document.getElementById('reservedWrites').value);
}

function getOverprovisionedValues() {
    cfg.overprovisioned = parseInt(document.getElementById('overprovisioned').value);
    cfg.overprovisionedPercentage = 1 + (cfg.overprovisioned / 100.0);
}

function getMaxOpsPerSec() {
    cfg.maxReads = Math.max(...cfg.seriesReads.map(point => point.y));
    cfg.maxWrites = Math.max(...cfg.seriesWrites.map(point => point.y));
}

export function calculateScyllaCosts() {
    // Replication factor
    const replication = cfg.scyllaReplication;

    // Max ops/sec * replication
    // For ScyllaDB, we consider max reads and writes
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
        monthlyCost: best.cost
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
        console.log('Minimum required vCPUs: ' + cfg._demandCosts.requiredVCPUs);
        console.log('Required storage (GB): ' + cfg._demandCosts.requiredStorage);
        console.log('Best instance type: ' + cfg._demandCosts.bestInstanceType);
        console.log('Best node count: ' + cfg._demandCosts.bestNodeCount);
        logs.push(`Monthly on-demand cost: ${Math.floor(cfg._demandCosts.monthlyCost).toLocaleString()}`);
    } else {
        logs.push(`Monthly reserved cost: ${Math.floor(cfg._demandCosts.monthlyCost).toLocaleString()}`);
    }

    if (cfg.costNetwork !== 0) {
        logs.push(`Monthly network cost: ${Math.floor(cfg.costNetwork).toLocaleString()}`);
    }

    logs.push(`---: ---`);

    logs.push(`Total monthly cost: ${Math.floor(cfg.costTotalMonthly).toLocaleString()}`);
    logs.push(`Total annual cost: ${Math.floor(cfg.costTotalMonthly * 12).toLocaleString()}`);

    updateDisplayedCosts(logs);
}

export function updateScyllaCosts() {
    getPricing();
    getRegions()
    getStorage();
    getReadConsistency();

    getReservedValues();
    getOverprovisionedValues()
    getMaxOpsPerSec();

    calculateScyllaCosts();
    calculateTotalOpsSec();
    calculateNetworkCosts();

    cfg.costTotalMonthly = cfg.pricing === 'demand' ?
        cfg._demandCosts.monthlyCost + cfg.costNetwork :
        cfg._demandCosts.monthlyCost + cfg.costNetwork; //TODO: Add reserved costs

    logCosts();
}
