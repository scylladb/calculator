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

function calculateRequiredStorage(storageGB, storageCompression, replication) {
    // Apply storageCompression, then replication
    const compressedStorage = storageGB * (1 - (storageCompression / 100.0));
    return Math.ceil(compressedStorage * replication);
}

function getBestNodeConfig(nodeOptions) {
    // Find the minimum cost
    const minCost = Math.min(...nodeOptions.map(opt => opt.cost));
    // Define a tolerance (e.g., 25%)
    // TODO: it's actually cheaper to use lots of smaller nodes than a few big ones
    //  but it's more practical to use less nodes in general, so we use a tolerance
    //  make this configurable in the future
    const tolerance = 0.25;
    // Filter options within tolerance of min cost
    const candidates = nodeOptions.filter(opt => opt.cost <= minCost * (1 + tolerance));
    // Return the candidate with the fewest nodes
    return candidates.reduce((a, b) => (a.nodes <= b.nodes ? a : b));
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
    cfg.hourlyConfig = [];
    let totalDailyCost = 0;
    const hours = Math.max(cfg.seriesReads.length, cfg.seriesWrites.length, 24);

    for (let hour = 0; hour < hours; hour++) {
        const reads = cfg.seriesReads[hour] ? cfg.seriesReads[hour].y : 0;
        const writes = cfg.seriesWrites[hour] ? cfg.seriesWrites[hour].y : 0;
        const totalOpsPerSec = (reads + writes) * replication;

        // For each node option, calculate requiredVCPUs using the correct opsPerVCPU for the family
        const nodeOptions = Object.entries(cfg.scyllaPrice).map(([type, spec]) => {
            const family = type.split('.')[0];
            // TODO: make sure the family specs are correct
            const opsPerVCPU = cfg.scyllaOpsPerVCPU[family] || 15_000;
            const requiredVCPUs = Math.ceil(totalOpsPerSec / opsPerVCPU);
            const nodesForVCPU = Math.ceil(requiredVCPUs / spec.vcpu);
            const usableStoragePerNode = spec.storage / (1 - (cfg.storageUtilization / 100.0));
            const nodesForStorage = Math.ceil(requiredStorage / usableStoragePerNode);
            let nodes = Math.max(nodesForVCPU, nodesForStorage);
            if (nodes % replication !== 0) {
                nodes = nodes + (replication - (nodes % replication));
            }
            const cost = nodes * spec.price * (cfg.regions || 1); // per hour
            return {type, nodes, cost, requiredVCPUs, opsPerVCPU};
        });
        const best = getBestNodeConfig(nodeOptions);

        cfg.hourlyConfig.push({
            type: best.type,
            nodes: best.nodes,
            cost: best.cost.toFixed(2),
            hour: hour,
            reads: reads.toFixed(0),
            writes: writes.toFixed(0),
            totalOpsPerSec: totalOpsPerSec.toFixed(0),
            requiredVCPUs: best.requiredVCPUs,
            opsPerVCPU: best.opsPerVCPU
        });
        totalDailyCost += best.cost;
    }

    // Calculate monthly cost
    const monthlyCost = totalDailyCost * (cfg.daysPerMonth || 30);

    cfg._baseCost = {
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
        logs.push(`Monthly on-demand cost: ${Math.floor(cfg.costMonthly).toLocaleString()}`);
    } else if (cfg.pricing === 'annual') {
        logs.push(`Annualized monthly cost: ${Math.floor(cfg.costMonthly).toLocaleString()}`);
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

    cfg.costMonthly = cfg.pricing === 'demand' ? cfg._baseCost.monthlyCost :
        cfg._baseCost.monthlyCost * (1 - cfg.scyllaAnnualDiscount);

    cfg.costTotalMonthly = cfg.costMonthly + (cfg.costNetwork || 0);

    logCosts();
}
