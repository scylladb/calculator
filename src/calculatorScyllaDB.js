import {updateDisplayedCosts} from "./utils.js";
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
                    vcpu: inst.cpuCount,
                    storage: inst.totalStorage,
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
                    vcpu: inst.cpuCount,
                    storage: inst.totalStorage,
                    instanceCostHourly: Number(inst.instanceCostHourly),
                    subscriptionCostHourly: Number(inst.subscriptionCostHourly),
                    price: Number(inst.instanceCostHourly) + Number(inst.subscriptionCostHourly),
                }
            ])
    );
}

cfg.scyllaPrice = buildScyllaPrice(scyllaInstances);

function calculateRequiredStorage() {
    // Apply storageCompression, then replication
    const ratioCompression = 1 - cfg.storageCompression / 100.0;
    const ratioUtilization = 1 - cfg.storageUtilization / 100.0;
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

    // Calculate per-hour best node config and cost
    cfg._costs.autoscale = [];
    let daily = 0;
    const hours = Math.max(cfg.seriesReads.length, cfg.seriesWrites.length, 24);

    for (let hour = 0; hour < hours; hour++) {
        const reads = cfg.seriesReads[hour] ? cfg.seriesReads[hour].y : 0;
        const writes = cfg.seriesWrites[hour] ? cfg.seriesWrites[hour].y : 0;
        const totalOpsPerSec = (reads + writes) * cfg.replication;

        // For each node option, calculate requiredVCPUs using the correct opsPerVCPU for the family
        const nodeOptions = Object.entries(cfg.scyllaPrice).map(([type, spec]) => {
            const family = type.split('.')[0];
            // TODO: make sure the family specs are correct
            const opsPerVCPU = cfg.scyllaOpsPerVCPU[family] || 15_000;
            const requiredVCPUs = Math.ceil(totalOpsPerSec / opsPerVCPU);
            const nodesForVCPU = Math.ceil(requiredVCPUs / spec.vcpu);
            const usableStoragePerNode = spec.storage / cfg._costs.storage.ratioUtilization;
            const nodesForStorage = Math.ceil(cfg._costs.storage.sizeReplicatedGB / usableStoragePerNode);
            let nodes = Math.max(nodesForVCPU, nodesForStorage);
            if (nodes % cfg.replication !== 0) {
                nodes = nodes + (cfg.replication - (nodes % cfg.replication));
            }
            const cost = nodes * spec.price * (cfg.regions || 1); // per hour
            return {type, nodes, cost, requiredVCPUs, opsPerVCPU};
        });
        const best = getBestNodeConfig(nodeOptions);

        cfg._costs.autoscale.push({
            options: nodeOptions,
            type: best.type,
            nodes: best.nodes,
            cost: best.cost.toFixed(2),
            hour: hour,
            reads: reads.toFixed(0),
            writes: writes.toFixed(0),
            totalOpsPerSec: totalOpsPerSec.toFixed(0),
            requiredVCPUs: best.requiredVCPUs,
            opsPerVCPU: best.opsPerVCPU,
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

    cfg._costs.network = {
        ratioCompression: ratioCompression,
        totalReadsGB: totalReadsGB,
        totalWritesGB: totalWritesGB,
        totalWritesPerZoneGB: totalWritesPerZoneGB,
        totalReadsPerZoneGB: totalReadsPerZoneGB,
        monthly: (totalReadsPerZoneGB + totalWritesPerZoneGB) * cfg.networkZonePerGB,
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
}
