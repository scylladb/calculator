import {calculateStorageCost, calculateDemandCosts, calculateProvisionedCosts} from './calculator.js';
import { cfg } from './config.js';

jest.mock('./chart.js', () => ({
    chart: {
        update: jest.fn()
    }
}));

jest.mock('./utils.js', () => ({
    formatNumber: jest.fn(),
    updateSavedCosts: jest.fn()
}));

describe('calculateStorageCost', () => {
    beforeEach(() => {
        cfg.storageGB = 0;
        cfg.costStorage = 0;
    });

    it('should calculate the correct storage cost for given storageGB', () => {
        cfg.storageGB = 100;
        calculateStorageCost();
        expect(cfg.costStorage).toBe(25);
    });

    it('should calculate the correct storage cost for zero storageGB', () => {
        cfg.storageGB = 0;
        calculateStorageCost();
        expect(cfg.costStorage).toBe(0);
    });

    it('should calculate the correct storage cost for fractional storageGB', () => {
        cfg.storageGB = 50.5;
        calculateStorageCost();
        expect(cfg.costStorage).toBe(12.625);
    });
});

describe('calculateDemandCosts', () => {
    beforeEach(() => {
        cfg.pricing = 'demand';
        cfg.storageGB = 2048;
        cfg.tableClass = 'standard';
        cfg.itemSizeB = 1024;
        cfg.baselineReads = 80_000;
        cfg.baselineWrites = 20_000;
        cfg.peakReads = 80_000;
        cfg.peakWrites = 20_000;
        cfg.peakHoursReads = 0;
        cfg.peakHoursWrites = 0;
        cfg.hoursPerMonth = 730;
        cfg.baselineHoursReads = cfg.hoursPerMonth - cfg.peakHoursReads;
        cfg.baselineHoursWrites = cfg.hoursPerMonth - cfg.peakHoursWrites;
        cfg.itemSizeKB = cfg.itemSizeB * (1 / 1024);
        cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
        cfg.readStronglyConsistent = 1;
        cfg.readEventuallyConsistent = 0;
        cfg.readTransactional = 0;
        cfg.readNonTransactional = 1;
        cfg.writeTransactional = 0;
        cfg.writeNonTransactional = 1;
        cfg.costStorage = 0;
        cfg.costDemandMonthlyReads = 0;
        cfg.costDemandMonthlyWrites = 0;
        cfg.costTotal = 0;
    });

    it('should calculate the correct demand costs', () => {
        // https://calculator.aws/#/estimate?id=9b4e4e2001b6ca5814d06f76346b4285ab3e6b4b
        calculateDemandCosts();
        calculateStorageCost();

        expect(cfg.costStorage.toFixed(2)).toBe("512.00");
        expect(cfg.costDemandMonthlyReads.toFixed(2)).toBe( "26280.00");
        expect(cfg.costDemandMonthlyWrites.toFixed(2)).toBe("32850.00");
        cfg.costTotal = cfg.costStorage + cfg.costDemandMonthlyReads + cfg.costDemandMonthlyWrites;
        expect(cfg.costTotal.toFixed(2)).toBe("59642.00");
    });
});

describe('calculateProvisionedCosts', () => {
    beforeEach(() => {
        cfg.pricing = 'provisioned';
        cfg.storageGB = 2048;
        cfg.tableClass = 'standard';
        cfg.itemSizeB = 1024;
        cfg.baselineReads = 80_000;
        cfg.baselineWrites = 20_000;
        cfg.peakReads = 160_000;
        cfg.peakWrites = 40_000;
        cfg.peakHoursReads = 90;
        cfg.peakHoursWrites = 90;
        cfg.hoursPerMonth = 730;
        cfg.baselineHoursReads = cfg.hoursPerMonth - cfg.peakHoursReads;
        cfg.baselineHoursWrites = cfg.hoursPerMonth - cfg.peakHoursWrites;
        cfg.itemSizeKB = cfg.itemSizeB * (1 / 1024);
        cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
        cfg.readStronglyConsistent = 1;
        cfg.readEventuallyConsistent = 0;
        cfg.readTransactional = 0;
        cfg.readNonTransactional = 1;
        cfg.writeTransactional = 0;
        cfg.writeNonTransactional = 1;
        cfg.reserved = 0;
        cfg.costProvisionedRCU = 0;
        cfg.costProvisionedWCU = 0;
        cfg.costStorage = 0;
        cfg.costTotal = 0;
    });

    it('should calculate the correct provisioned costs', () => {
        // https://calculator.aws/#/estimate?id=af7692f740cb3805a1604855478a753ccce36a91
        calculateProvisionedCosts();
        calculateStorageCost();

        expect(cfg.costStorage.toFixed(2)).toBe("512.00");
        expect(cfg.costProvisionedRCU.toFixed(2)).toBe( "8528.00");
        expect(cfg.costProvisionedWCU.toFixed(2)).toBe( "10660.00");
        cfg.costTotal = cfg.costStorage + cfg.costProvisionedRCU + cfg.costProvisionedWCU;
        expect(cfg.costTotal.toFixed(2)).toBe("19700.00");
    });
});

describe('calculateReservedCosts', () => {
    beforeEach(() => {
        cfg.pricing = 'provisioned';
        cfg.storageGB = 2048;
        cfg.tableClass = 'standard';
        cfg.itemSizeB = 1024;
        cfg.baselineReads = 80_000;
        cfg.baselineWrites = 20_000;
        cfg.peakReads = 160_000;
        cfg.peakWrites = 40_000;
        cfg.peakHoursReads = 90;
        cfg.peakHoursWrites = 90;
        cfg.hoursPerMonth = 730;
        cfg.baselineHoursReads = cfg.hoursPerMonth - cfg.peakHoursReads;
        cfg.baselineHoursWrites = cfg.hoursPerMonth - cfg.peakHoursWrites;
        cfg.itemSizeKB = cfg.itemSizeB * (1 / 1024);
        cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
        cfg.readStronglyConsistent = 1;
        cfg.readEventuallyConsistent = 0;
        cfg.readTransactional = 0;
        cfg.readNonTransactional = 1;
        cfg.writeTransactional = 0;
        cfg.writeNonTransactional = 1;
        cfg.reserved = 100;
        cfg.costMonthlyRCU = 0;
        cfg.costUpfrontRCU = 0;
        cfg.costMonthlyWCU = 0;
        cfg.costUpfrontWCU = 0;
        cfg.costStorage = 0;
        cfg.costProvisionedMonthly = 0;
        cfg.costTotalMonthly = 0;
        cfg.costReservedUpfront = 0;
    });

    it('should calculate the correct reserved costs', () => {
        // https://calculator.aws/#/estimate?id=edc2264f3f8d69b642ef73e44225a2a130fdf9a3
        calculateProvisionedCosts();
        calculateStorageCost();

        cfg.costTotalMonthly = cfg.costProvisionedMonthly + cfg.costStorage;
        cfg.costTotalUpfront = cfg.costReservedUpfront;

        expect(cfg.costStorage.toFixed(2)).toBe("512.00");
        expect(cfg.costMonthlyRCU.toFixed(2)).toBe( "2396.00");
        expect(cfg.costUpfrontRCU.toFixed(2)).toBe( "24000.00");
        expect(cfg.costMonthlyWCU.toFixed(2)).toBe( "3038.80");
        expect(cfg.costUpfrontWCU.toFixed(2)).toBe( "30000.00");
        expect(cfg.costTotalMonthly.toFixed(2)).toBe("5946.80");
        expect(cfg.costTotalUpfront.toFixed(2)).toBe("54000.00");
    });
});