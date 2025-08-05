import {formatBytes, formatNumber, updateDisplayedCosts, updateExplainedCosts} from "./utils.js";
import {cfg} from './config.js';
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
import scyllaInstances from './scyllaInstances.json';

function buildScyllaPrice(instances) {
    return Object.fromEntries(
        instances
            .filter(inst => inst.instanceFamily === 'i3en' || inst.instanceFamily === 'i7ie')
            .map(inst => [
                inst.externalId,
                {
                    cpuCount: inst.cpuCount,
                    totalStorage: inst.totalStorage,
                    instanceCostHourly: Number(inst.instanceCostHourly),
                    subscriptionCostHourly: Number(inst.subscriptionCostHourly),
                    price: Number(inst.instanceCostHourly) + Number(inst.subscriptionCostHourly),
                }
            ])
    );
}

// TODO: blocked until CORS allows calculator domain
async function fetchAndSetScyllaPrice() {
    const url = "https://api.cloud.scylladb.com/deployment/cloud-provider/1/region/1?target=NEW_CLUSTER";
    const response = await fetch(url);
    const json = await response.json();
    const instances = json.data.instances;
    return Object.fromEntries(
        instances
            .filter(inst => inst.instanceFamily === 'i3en' || inst.instanceFamily === 'i7ie')
            .map(inst => [
                inst.externalId,
                {
                    cpuCount: inst.cpuCount,
                    totalStorage: inst.totalStorage,
                    instanceCostHourly: Number(inst.instanceCostHourly),
                    subscriptionCostHourly: Number(inst.subscriptionCostHourly),
                    price: Number(inst.instanceCostHourly) + Number(inst.subscriptionCostHourly),
                }
            ])
    );
}

cfg.scyllaPrice = buildScyllaPrice(scyllaInstances);

function calculateRequiredStorage() {
    const ratioCompression = cfg.storageCompression / 100.0;
    const ratioUtilization = cfg.storageUtilization / 100.0;
    const sizeCompressedGB = cfg.storageGB * ratioCompression;

    cfg._costs.storage = {
        replication: cfg.replication,
        ratioUtilization: ratioUtilization,
        ratioCompression: ratioCompression,
        sizeUncompressed: cfg.storageGB,
        sizeCompressedGB: sizeCompressedGB,
        sizeReplicatedGB: Math.ceil(sizeCompressedGB * cfg.replication)
    }
}

function getBestNodeConfig(nodeOptions) {
    // Try to find any option that does not exceed scyllaNodesMax
    const underMax = nodeOptions.filter(opt => opt.nodes <= cfg.scyllaNodesMax);

    if (underMax.length > 0) {
        // If we have options under the max node count, pick the cheapest among them
        return underMax.reduce((a, b) => (a.cost <= b.cost ? a : b));
    } else {
        // If all options exceed the max node count, pick the one with the fewest nodes
        return nodeOptions.reduce((a, b) => (a.nodes <= b.nodes ? a : b));
    }
}

export function calculateScyllaDBCosts() {
    if (cfg.scyllaOverride) {
        cfg._costs.base = {
            bestInstanceType: cfg.scyllaInstanceClass,
            bestNodeCount: cfg.scyllaNodes,
            monthly: cfg.scyllaPrice[cfg.scyllaInstanceClass].price * cfg.scyllaNodes * (cfg.regions || 1) * cfg.hoursPerMonth
        }
        return;
    }

    // Calculate the best node configuration for autoscaling on an hourly basis
    cfg._costs.autoscale = [];
    let daily = 0;
    const hours = Math.max(cfg.seriesReads.length, cfg.seriesWrites.length, 24);

    for (let hour = 0; hour < hours; hour++) {
        const readOpsPerSec = cfg.seriesReads[hour] ? cfg.seriesReads[hour].y : 0;
        const writeOpsPerSec = cfg.seriesWrites[hour] ? cfg.seriesWrites[hour].y : 0;
        const totalOpsPerSec = readOpsPerSec + writeOpsPerSec;

        // For each node option, calculate requiredVCPU using the correct opsPerVCPU for the family
        const nodeOptions = Object.entries(cfg.scyllaPrice).map(([type, spec]) => {
            const family = type.split('.')[0];
            const opsPerVCPU = cfg.scyllaOpsPerVCPU[family] || 15_000;

            const requiredVCPU = Math.ceil(totalOpsPerSec / opsPerVCPU);
            const requiredNodesPerZoneCompute = Math.ceil(requiredVCPU / spec.cpuCount); // per zone

            const storageAvailablePerNode = spec.totalStorage * cfg._costs.storage.ratioUtilization;
            const requiredNodesPerZoneStorage = Math.ceil(cfg._costs.storage.sizeCompressedGB / storageAvailablePerNode);

            let nodes = Math.max(requiredNodesPerZoneCompute, requiredNodesPerZoneStorage) * cfg.replication; // per cluster

            if (nodes % cfg.replication !== 0) {
                nodes = nodes + (cfg.replication - (nodes % cfg.replication));
            }
            const cost = nodes * spec.price * (cfg.regions || 1); // per hour
            const availOpsPerSec = nodes * spec.cpuCount * opsPerVCPU / cfg.replication; // per zone
            const availStorageGB = nodes * spec.totalStorage / cfg.replication; // per zone

            return {
                family,
                type,
                nodes,
                cost,
                requiredVCPU,
                opsPerVCPU,
                readOpsPerSec,
                writeOpsPerSec,
                totalOpsPerSec,
                availOpsPerSec,
                availStorageGB
            };
        });

        const best = getBestNodeConfig(nodeOptions);

        cfg._costs.autoscale.push({
            options: nodeOptions,
            type: best.type,
            nodes: best.nodes,
            cost: best.cost.toFixed(2),
            hour: hour,
            reads: readOpsPerSec.toFixed(0),
            writes: writeOpsPerSec.toFixed(0),
            opsPerVCPU: best.opsPerVCPU,
            readOpsPerSec: best.readOpsPerSec.toFixed(0),
            writeOpsPerSec: best.writeOpsPerSec.toFixed(0),
            totalOpsPerSec: totalOpsPerSec.toFixed(0),
            availOpsPerSec: best.availOpsPerSec.toFixed(0),
            requiredVCPU: best.requiredVCPU,
            availableVCPUs: best.nodes * cfg.scyllaPrice[best.type].vcpu,
            availStorageGB: best.availStorageGB.toFixed(0),
        });
        daily += best.cost;
    }

    // Calculate monthly cost
    const monthly = daily * (cfg.daysPerMonth || 30);
    const yearly = monthly * 12;

    cfg._costs.base = {
        daily: daily,
        monthly: monthly,
        yearly: yearly,
    };
}

function calculateScyllaDBNetworkCosts() {
    const ratioCompression = 1 - cfg.networkCompression / 100.0;

    const totalReadsGB = cfg.totalReads * cfg.daysPerMonth * cfg.itemSizeKB / (1024 ** 2);
    const totalWritesGB = cfg.totalWrites * cfg.daysPerMonth * cfg.itemSizeKB / (1024 ** 2);

    // Each write generates 2 cross-zone operations, which is compressed
    const totalWritesPerZoneGB = totalWritesGB * ratioCompression * 2 * cfg.regions;
    // Reads are zone aware, so we only consider cross-region reads
    const totalReadsPerZoneGB = totalReadsGB * ratioCompression * (cfg.regions - 1);
    const totalPerZoneGB = totalReadsPerZoneGB + totalWritesPerZoneGB;

    cfg._costs.network = {
        ratioCompression: ratioCompression,
        totalReadsGB: totalReadsGB,
        totalWritesGB: totalWritesGB,
        totalWritesPerZoneGB: totalWritesPerZoneGB,
        totalReadsPerZoneGB: totalReadsPerZoneGB,
        totalPerZoneGB: totalPerZoneGB,
        monthly: totalPerZoneGB * cfg.networkZonePerGB,
    }
}

function logCosts() {
    let logs = [];

    if (cfg._costs.network.monthly !== 0) {
        logs.push(`Monthly network cost: ${Math.floor(cfg._costs.network.monthly).toLocaleString()}`);
    }

    if (cfg.pricing === 'demand') {
        logs.push(`Monthly on-demand cost: ${Math.floor(cfg._costs.demand.monthly).toLocaleString()}`);
        logs.push(`Total monthly cost: ${Math.floor(cfg._costs.demand.total.monthly).toLocaleString()}`);
        logs.push(`Total annual cost: ${Math.floor(cfg._costs.demand.total.annual).toLocaleString()}`);
    } else if (cfg.pricing === 'flex') {
        logs.push(`Monthly pro flex cost: ${Math.floor(cfg._costs.flex.monthly).toLocaleString()}`);
        logs.push(`Total monthly cost: ${Math.floor(cfg._costs.flex.total.monthly).toLocaleString()}`);
        logs.push(`Total annual cost: ${Math.floor(cfg._costs.flex.total.annual).toLocaleString()}`);
    } else if (cfg.pricing === 'subscription') {
        logs.push(`Monthly pro subscription cost: ${Math.floor(cfg._costs.subscription.monthly).toLocaleString()}`);
        logs.push(`Total monthly cost: ${Math.floor(cfg._costs.subscription.total.monthly).toLocaleString()}`);
        logs.push(`Total annual cost: ${Math.floor(cfg._costs.subscription.total.annual).toLocaleString()}`);
    }

    logs.push(`---: ---`);

    updateDisplayedCosts(logs);
}

function explainCosts() {
    let explanations = [];

    const autoscale = cfg._costs.autoscale;

    const ops = autoscale.map(c => Number(c.totalOpsPerSec) || 0);

    const minOpsIdx = ops.indexOf(Math.min(...ops));
    const maxOpsIdx = ops.indexOf(Math.max(...ops));
    const minCluster = autoscale[minOpsIdx] || {};
    const maxCluster = autoscale[maxOpsIdx] || {};

    const minOpsUsed = minCluster.totalOpsPerSec ? minCluster.totalOpsPerSec : 0;
    const maxOpsUsed = maxCluster.totalOpsPerSec ? maxCluster.totalOpsPerSec : 0;
    const minReadsOpsSec = minCluster.readOpsPerSec ? minCluster.readOpsPerSec : 0;
    const maxReadsOpsSec = maxCluster.readOpsPerSec ? maxCluster.readOpsPerSec : 0;
    const minWritesOpsSec = minCluster.writeOpsPerSec ? minCluster.writeOpsPerSec : 0;
    const maxWritesOpsSec = maxCluster.writeOpsPerSec ? maxCluster.writeOpsPerSec : 0;
    const minOpsAvail = minCluster.availOpsPerSec ? minCluster.availOpsPerSec : 0;
    const maxOpsAvail = maxCluster.availOpsPerSec ? maxCluster.availOpsPerSec : 0;
    const minVCPU = minCluster.requiredVCPU || 0;
    const maxVCPU = maxCluster.requiredVCPU || 0;
    const minStorageGB = minCluster.availStorageGB || 0;

    let minClusterStr = '';
    let maxClusterStr = '';
    const instanceType = maxCluster.type || '';
    if (instanceType.startsWith('i7ie')) {
        minClusterStr = `Smallest Cluster: ${minCluster.nodes || 0} × ${minCluster.type || 0} nodes across ${cfg.replication} zones (compute bound)`;
        maxClusterStr = `Largest Cluster: ${maxCluster.nodes || 0} × ${maxCluster.type || 0} nodes across ${cfg.replication} zones (compute bound)`;
    } else if (instanceType.startsWith('i3en')) {
        minClusterStr = `Smallest Cluster: ${minCluster.nodes || 0} × ${minCluster.type || 0} nodes across ${cfg.replication} zones (storage bound)`;
        maxClusterStr = `Largest Cluster: ${maxCluster.nodes || 0} × ${maxCluster.type || 0} nodes across ${cfg.replication} zones (storage bound)`;
    }

    explanations.push(minClusterStr);
    explanations.push(`: A total of ${formatNumber(minOpsUsed)} ops/sec requested (${formatNumber(minReadsOpsSec)} reads/sec, ${formatNumber(minWritesOpsSec)} writes/sec)`);
    explanations.push(`: ${minVCPU} vCPU per zone required`);
    explanations.push(`: up to ${formatNumber(minOpsAvail)} ops/sec available`);
    explanations.push(maxClusterStr);
    explanations.push(`: A total of ${formatNumber(maxOpsUsed)} ops/sec requested (${formatNumber(maxReadsOpsSec)} reads/sec, ${formatNumber(maxWritesOpsSec)} writes/sec)`);
    explanations.push(`: ${maxVCPU} vCPU per zone required`);
    explanations.push(`: up to ${formatNumber(maxOpsAvail)} ops/sec available`);

    const sizeUncompressed = formatBytes(cfg._costs.storage.sizeUncompressed * (1024 ** 3), 1);
    const sizeCompressedGB = formatBytes(cfg._costs.storage.sizeCompressedGB * (1024 ** 3), 1);
    const sizeReplicatedGB = formatBytes(cfg._costs.storage.sizeReplicatedGB * (1024 ** 3), 1);
    const storageAvailable = formatBytes(minStorageGB * (1024 ** 3), 1);
    explanations.push(`Storage Capacity: ${sizeUncompressed} raw storage requested`);
    explanations.push(`: ${sizeCompressedGB} compressed, unreplicated storage expected`);
    explanations.push(`: ${sizeReplicatedGB} compressed, replicated storage required`);
    explanations.push(`: ${storageAvailable} hardware volume available`);
    explanations.push(`: ${cfg.storageUtilization}% max utilization, ${Number(cfg._costs.storage.sizeCompressedGB / minStorageGB * 100).toFixed(0)}% current utilization`);

    updateExplainedCosts(explanations);
}

export function updateScyllaDBCosts() {
    cfg._costs = {};
    getPricing();
    getRegions()
    getStorage();
    getItemSize();
    getReadConsistency();

    getReserved();
    getTotalOpsPerDay();
    getMaxOpsPerSec();

    calculateRequiredStorage()
    calculateScyllaDBCosts();
    calculateScyllaDBNetworkCosts();

    const discount = cfg.scyllaDiscountTiers[cfg.pricing];
    const reserved = cfg.scyllaReserved / 100.0;
    const baseCostMonthly = cfg._costs.base.monthly;
    const networkCostMonthly = cfg._costs.network.monthly || 0;

    // On-demand costs
    cfg._costs.demand = {
        discount: discount,
        reserved: reserved,
        monthly: baseCostMonthly,
        total: {
            monthly: baseCostMonthly + networkCostMonthly,
            annual: (baseCostMonthly + networkCostMonthly) * 12
        }
    }

    // Flex costs
    const flexCostMonthlyUnreserved = baseCostMonthly * (1 - reserved);
    const flexCostMonthlyReserved = baseCostMonthly * reserved * (1 - discount);
    const flexCostMonthly = flexCostMonthlyUnreserved + flexCostMonthlyReserved;
    cfg._costs.flex = {
        discount: discount,
        monthly: flexCostMonthly,
        total: {
            monthly: flexCostMonthly + networkCostMonthly,
            annual: (flexCostMonthly + networkCostMonthly) * 12,
        }
    }

    // Subscription costs
    const subCostMonthlyUnreserved = baseCostMonthly * (1 - reserved);
    const subCostMonthlyReserved = baseCostMonthly * reserved * (1 - discount);
    const subCostMonthly = subCostMonthlyUnreserved + subCostMonthlyReserved;
    cfg._costs.subscription = {
        discount: discount,
        monthly: subCostMonthly,
        total: {
            monthly: subCostMonthly + networkCostMonthly,
            annual: (subCostMonthly + networkCostMonthly) * 12,
        }
    }

    logCosts();
    explainCosts();
}
