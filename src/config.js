export const cfg = {
    workload: 'baselinePeak',
    seriesReads: [],
    seriesWrites: [],
    seriesReservedRCU: [],
    seriesReservedWCU: [],
    seriesReadsEncoded: '',
    seriesWritesEncoded: '',
    pricing: 'demand',
    baselineReads: 100000,
    baselineWrites: 200000,
    peakReads: 250000,
    peakWrites: 500000,
    peakDurationReads: 2,
    peakDurationWrites: 4,
    totalReads: 0,
    totalWrites: 0,
    hoursPerMonth: 730,
    itemSizeB: 1024,
    storageGB: 512,
    tableClass: 'standard',
    readConst: 100,

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
    overprovisioned: 0,

    // Reserved
    pricePerReservedRCUUpfront: 0.30,
    pricePerReservedWCUUpfront: 1.50,

    // Replicated
    regions: 1,

    // Data Transfer
    priceIntraRegPerGB: 0.02,

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

    // Other
    override: false
};
