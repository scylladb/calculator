export const cfg = {
    // Charting
    seriesReads: [],
    seriesWrites: [],
    seriesReadsEncoded: '',
    seriesWritesEncoded: '',
    maxReads: 0,
    maxWrites: 0,
    pricing: 'demand',

    // Model
    service: 'dynamodb',
    workload: 'baselinePeak',
    baselineReads: 100000,
    baselineWrites: 200000,
    peakReads: 250000,
    peakWrites: 500000,
    peakDurationReads: 2,
    peakDurationWrites: 4,
    totalReads: 0, // per day
    totalWrites: 0, // per day
    totalReservedRCU: 0,
    totalReservedWCU: 0,
    hoursPerMonth: 730,
    daysPerMonth: 365 / 12,
    itemSizeB: 1024,
    itemSizeKB: 1,
    storageGB: 512,
    itemRCU: 1,
    itemWCU: 1,
    tableClass: 'standard',
    readConst: 100,
    replication: 3,
    storageCompression: 50,
    storageUtilization: 90,
    networkCompression: 50,

    // Demand
    pricePerRRU: 0.000000125,
    pricePerWRU: 0.000000625,
    pricePerRRU_IA: 0.000000155,
    pricePerWRU_IA: 0.000000780,

    // Provisioned
    pricePerRCU: 0.00013,
    pricePerReservedRCU: 0.000025,
    pricePerWCU: 0.00065,
    pricePerReservedWCU: 0.000128,
    pricePerRCU_IA: 0.00016,
    pricePerWCU_IA: 0.00081,
    reserved: 0,
    reservedReads: 0,
    reservedWrites: 0,
    overprovisioned: 20,

    // Reserved
    pricePerReservedRCUUpfront: 0.30,
    pricePerReservedWCUUpfront: 1.50,

    // Replicated
    regions: 1,

    // Data Transfer
    networkRegionPerGB: 0.02,
    networkZonePerGB: 0.01,

    // DAX Node Costs
    cacheSizeGB: 0,
    cacheRatio: 0,
    daxNodes: 0,
    daxInstanceClass: 'dax.r5.large',
    daxInstanceClassCosts: [
        {instance: "dax.r5.large", memory: 16, nps: 75000, price: 0.25500000},
        {instance: "dax.r5.xlarge", memory: 32, nps: 150000, price: 0.50900000},
        {instance: "dax.r5.2xlarge", memory: 64, nps: 300000, price: 1.01700000},
        {instance: "dax.r5.4xlarge", memory: 128, nps: 600000, price: 2.03400000},
        {instance: "dax.r5.8xlarge", memory: 256, nps: 1000000, price: 4.06900000},
        {instance: "dax.r5.12xlarge", memory: 384, nps: 1000000, price: 6.12000000},
        {instance: "dax.r5.16xlarge", memory: 512, nps: 1000000, price: 8.13700000},
        {instance: "dax.r5.24xlarge", memory: 768, nps: 1000000, price: 12.24000000},
    ],

    daxOverride: false,

    hourlyConfig: [],
    scyllaNodes: 3,
    scyllaNodesMax: 24, // Maximum number of ScyllaDB nodes preferred for a cluster
    scyllaInstanceClass: 'i7ie.large',
    scyllaOverride: false,

    // ScyllaDB Constants
    scyllaPrice: {},

    scyllaOpsPerVCPU: {
        i3en: 10000,
        i7ie: 15000
    },

    scyllaDiscountTiers: {
        demand: 0.0,
        flex: 0.12,
        subscription: 0.28,
    },
    scyllaReserved: 100,
};
