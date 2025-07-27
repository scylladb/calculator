import {cfg} from './config.js';
import {updateDisplayedCosts} from "./utils.js";
import {
    getItemSize,
    getMaxOpsPerSec,
    getPricing,
    getReadConsistency,
    getRegions,
    getReserved,
    getStorage,
    getTotalOpsPerDay
} from "./calculatorCommon.js";

function calculateRequiredStorage(storageGB, storageCompression, replication) {
    // Apply storageCompression, then replication
    const compressedStorage = storageGB * (1 - (storageCompression / 100.0));
    return Math.ceil(compressedStorage * replication);
}

function getBestNodeConfig(nodeOptions) {
    // Find best (cheapest) option for this hour AND least amount of nodes
    return nodeOptions.reduce((a, b) => {
        if (a.cost < b.cost) return a;
        if (b.cost < a.cost) return b;
        // If costs are equal, prefer the one with fewer nodes
        // TODO: maybe prefer fewer nodes within a given cost range?
        return a.nodes <= b.nodes ? a : b;
    });
}

function getNodeOptions(requiredVCPUs, requiredStorage, replication) {
    return Object.entries(cfg.scyllaPrice).map(([type, spec]) => {
        const nodesForVCPU = Math.ceil(requiredVCPUs / spec.vcpu);
        const usableStoragePerNode = spec.storage / (1 - (cfg.storageUtilization / 100.0));
        const nodesForStorage = Math.ceil(requiredStorage / usableStoragePerNode);
        let nodes = Math.max(nodesForVCPU, nodesForStorage);
        if (nodes % replication !== 0) {
            nodes = nodes + (replication - (nodes % replication));
        }
        const cost = nodes * spec.price * (cfg.regions || 1); // per hour
        return {type, nodes, cost};
    });
}

export function calculateScyllaDBCosts() {
    if (cfg.scyllaOverride) {
        cfg._baseCost = {
            bestInstanceType: cfg.scyllaInstanceClass,
            bestNodeCount: cfg.scyllaNodes,
            monthlyCost: cfg.scyllaPrice[cfg.scyllaInstanceClass].price * cfg.scyllaNodes * (cfg.regions || 1) * cfg.hoursPerMonth
        }
        return;
    }

    // Replication factor
    const replication = cfg.replication;

    // Storage
    const requiredStorage = calculateRequiredStorage(cfg.storageGB, cfg.storageCompression, replication);

    // Calculate per-hour best node config and cost
    const hourlyConfigs = [];
    let totalDailyCost = 0;
    const hours = Math.max(cfg.seriesReads.length, cfg.seriesWrites.length, 24);

    for (let h = 0; h < hours; h++) {
        const reads = cfg.seriesReads[h] ? cfg.seriesReads[h].y : 0;
        const writes = cfg.seriesWrites[h] ? cfg.seriesWrites[h].y : 0;
        const maxOpsPerSec = (reads + writes) * replication;
        const requiredVCPUs = Math.ceil(maxOpsPerSec / cfg.scyllaOpsPerVCPU);

        // Calculate node counts for each family

        const nodeOptions = getNodeOptions(requiredVCPUs, requiredStorage, replication);
        const best = getBestNodeConfig(nodeOptions);
        console.log(`Hour: ${h}, Cost: ${best.cost.toFixed(2)}, Type: ${best.type}, Nodes: ${best.nodes},  Reads:${reads}, Writes: ${writes}, MaxOpsPerSec: ${maxOpsPerSec}, RequiredVCPUs:${requiredVCPUs}`);

        hourlyConfigs.push({...best, hour: h});
        totalDailyCost += best.cost;
    }

    // Calculate monthly cost
    const monthlyCost = totalDailyCost * (cfg.daysPerMonth || 30);

    cfg._baseCost = {
        hourlyConfigs,
        dailyCost: totalDailyCost,
        monthlyCost: monthlyCost
    };
}

function calculateScyllaDBNetworkCosts() {
    const compressionFactor = 1 - (cfg.networkCompression / 100.0);

    const totalReadsGB = cfg.totalReads * cfg.daysPerMonth * cfg.itemSizeKB / (1024 * 1024);
    const totalWritesGB = cfg.totalWrites * cfg.daysPerMonth * cfg.itemSizeKB / (1024 * 1024);

    // Each write generates 2 cross-zone operations, which is compressed
    const writesPerZoneGB = totalWritesGB * compressionFactor * 2 * cfg.regions;
    // Reads are zone aware, so we only consider cross-region reads
    const readsPerZoneGB = totalReadsGB * compressionFactor * (cfg.regions - 1);

    cfg.costNetwork = ((readsPerZoneGB + writesPerZoneGB) * cfg.networkZonePerGB);
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
    getTotalOpsPerDay();
    getMaxOpsPerSec();

    calculateScyllaDBCosts();
    calculateScyllaDBNetworkCosts();

    cfg.costTotalMonthly = cfg.pricing === 'demand' ? cfg._baseCost.monthlyCost + cfg.costNetwork : cfg._baseCost.monthlyCost + cfg.costNetwork;

    logCosts();
}
