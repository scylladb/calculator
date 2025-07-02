/**
 * Calculate ScyllaDB instance requirements and pricing based on workload.
 * @param {object} cfg - Configuration object (same as DDB calculator)
 * @returns {object} - ScyllaDB sizing and pricing breakdown
 */
export function calculateScyllaPricing(cfg) {
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

    // Form the recommendation
    return {
        replication,
        requiredVCPUs,
        requiredStorage,
        nodeOptions,
        bestInstanceType: best.type,
        bestNodeCount: best.nodes,
        bestMonthlyCost: best.cost
    };
}
