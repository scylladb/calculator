export const cfg = {
    pricing:            'demand',
    baseline:           50000,
    peak:               500000,
    peakWidth:          1,
    hoursPerMonth:      730,
    itemSizeB:          1024,
    storageGB:          512,
    ratio:              50,
    tableClass:         'standard',
    // Demand
    pricePerRRU:        0.000000125,
    pricePerWRU:        0.000000625,
    pricePerRRU_IA:     0.000000155,
    pricePerWRU_IA:     0.000000780,
    // Provisioned
    pricePerRCU:        0.00013,
    pricePerRRCU:       0.000025,
    pricePerWCU:        0.00065,
    pricePerRWCU:       0.000128,
    pricePerRCU_IA:     0.00016,
    pricePerWCU_IA:     0.00081,
    // Reserved capacity
    reserved:           0,
    // Replicated
    regions:  1,
    pricePerRWRU:       0.000000625,
    pricePerRWRU_IA:    0.000000780,
    // Data Transfer
    priceIntraRegPerGB: 0.02,
    // DAX Node Costs
    cacheSizeGB:        0,
    cacheRatio:         0,
    daxNodes:           0,
    daxInstanceClassCosts: [
        { instance: "dax.r5.large", memory: 16, nps: 75000, price: 0.25500000 },
        { instance: "dax.r5.xlarge", memory: 32, nps: 150000, price: 0.50900000 },
        { instance: "dax.r5.2xlarge", memory: 64, nps: 300000, price: 1.01700000 },
        { instance: "dax.r5.4xlarge", memory: 128, nps: 600000, price: 2.03400000 },
        { instance: "dax.r5.8xlarge", memory: 256, nps: 1000000, price: 4.06900000 },
        { instance: "dax.r5.12xlarge", memory: 384, nps: 1000000, price: 6.12000000 },
        { instance: "dax.r5.16xlarge", memory: 512, nps: 1000000, price: 8.13700000 },
        { instance: "dax.r5.24xlarge", memory: 768, nps: 1000000, price: 12.24000000 },
    ],
    scyllaPrices: [
        {
            family: "i4i", instance: "i4i.xlarge", baseline: 78000, peak: 120000, storage: 937, price: 3.325
        }, {
            family: "i3en", instance: "i3en.xlarge", baseline: 39000, peak: 60000, storage: 2.44 * 1024, price: 4.378
        }
    ]
};
