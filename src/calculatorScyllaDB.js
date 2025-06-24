/**
 * Calculate ScyllaDB instance requirements and pricing based on workload.
 * @param {object} cfg - Configuration object (same as DDB calculator)
 * @returns {object} - ScyllaDB sizing and pricing breakdown
 */
export function calculateScyllaPricing(cfg) {
    // Constants
    const OPS_PER_VCPU = 15000;
    const DEFAULT_COMPRESSION_RATIO = 0.5;
    const DEFAULT_STORAGE_UTILIZATION = 0.9;
    const DEFAULT_RF = 3;

    // TODO: Add more instance types as needed
    // https://aws.amazon.com/ec2/instance-types/i7i/
    const INSTANCE_TYPES = {
        'i7ie.large':      { vcpu: 2,  storage: 1250, price: 1.911 },
        'i7ie.xlarge':     { vcpu: 4,  storage: 2500, price: 4.582 },
        'i7ie.2xlarge':    { vcpu: 8,  storage: 5000, price: 9.164 },
        'i7ie.3xlarge':    { vcpu: 12, storage: 7500, price: 13.746 },
        'i7ie.6xlarge':    { vcpu: 24, storage: 15000, price: 27.491 },
        'i7ie.12xlarge':   { vcpu: 48, storage: 30000, price: 54.983 },
        'i7ie.18xlarge':   { vcpu: 72, storage: 45000, price: 82.474 },
        'i7ie.24xlarge':   { vcpu: 96, storage: 60000, price: 109.966 },
        'i7ie.48xlarge':   { vcpu: 192, storage: 120000, price: 219.931 },
    };

    // Replication factor
    const replication = cfg.scyllaReplication || DEFAULT_RF;

    // Total ops/sec (RCU + WCU) * replication
    // For ScyllaDB, we consider peak reads and writes
    const totalOps = (cfg.peakReads + cfg.peakWrites) * replication;

    // Required vCPUs
    const requiredVCPUs = Math.ceil(totalOps / OPS_PER_VCPU);

    // Storage (apply compression, then replication)
    const rawStorage = cfg.storageGB;
    const compressedStorage = rawStorage / (cfg.scyllaCompressionRatio || DEFAULT_COMPRESSION_RATIO);
    const requiredStorage = Math.ceil(compressedStorage * replication);

    // Calculate node counts for each family
    const nodeOptions = Object.entries(INSTANCE_TYPES).map(([type, spec]) => {
        const nodesForVCPU = Math.ceil(requiredVCPUs / spec.vcpu);
        const usableStoragePerNode = spec.storage * DEFAULT_STORAGE_UTILIZATION;
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
