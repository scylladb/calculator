export const cfg = {
    pricing:            'demand',
    demand:             10000,
    baseline:           10000,
    peak:               100000,
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
    pricePerWRU_IA:     0.00000078,
    // Provisioned
    pricePerRCU:        0.00065,
    pricePerWCU:        0.00013,
    pricePerRCU_IA:     0.00016,
    pricePerWCU_IA:     0.00081,
    // Replicated
    regions:  0,
    pricePerRWRU:       0.000000625,
    pricePerRWRU_IA:    0.000000780,
    // Data Transfer
    priceIntraRegPerGB: 0.02,
    // DAX Node Costs
    daxNodes:           0,
    daxInstanceClassCosts: {
    r5Large:            0.25500000,
    r5XLarge:           0.50900000,
    r52XLarge:          1.01700000,
    r54XLarge:          2.03400000,
    r58XLarge:          4.06900000,
    r512XLarge:         6.11700000,
    r516XLarge:         8.13700000,
    r524XLarge:        12.23400000,
    },
    scyllaPrices: [
        {
            family: "i4i", instance: "i4i.xlarge", baseline: 78000, peak: 120000, storage: 937, price: 3.325
        }, {
            family: "i3en", instance: "i3en.xlarge", baseline: 39000, peak: 60000, storage: 2.44 * 1024, price: 4.378
        }
    ]
};
