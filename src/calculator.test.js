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
        cfg.dynamoCostStorage = 0;
    });

    it('should calculate the correct storage cost for given storageGB', () => {
        cfg.storageGB = 100;
        calculateStorageCost();
        expect(cfg.dynamoCostStorage).toBe(25);
    });

    it('should calculate the correct storage cost for zero storageGB', () => {
        cfg.storageGB = 0;
        calculateStorageCost();
        expect(cfg.dynamoCostStorage).toBe(0);
    });

    it('should calculate the correct storage cost for fractional storageGB', () => {
        cfg.storageGB = 50.5;
        calculateStorageCost();
        expect(cfg.dynamoCostStorage).toBe(12.625);
    });
});

describe('calculateDemandCosts', () => {
    beforeEach(() => {
        cfg.pricing = 'demand';
        cfg.storageGB = 2048;
        cfg.tableClass = 'standard';
        cfg.itemSizeB = 1024;
        cfg.baseline = 100_000;
        cfg.peak = 100_000;
        cfg.peakWidth = 0;
        cfg.peakHours = cfg.peakWidth * 30;
        cfg.hoursPerMonth = 730;
        cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
        cfg.readRatio = 0.80;
        cfg.writeRatio = 0.20;
        cfg.itemSizeKB = cfg.itemSizeB * (1 / 1024);
        cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
        cfg.readStronglyConsistent = 1;
        cfg.readEventuallyConsistent = 0;
        cfg.readTransactional = 0;
        cfg.readNonTransactional = 1;
        cfg.writeTransactional = 0;
        cfg.writeNonTransactional = 1;
        cfg.dynamoCostStorage = 0;
        cfg.dynamoCostDemandReads = 0;
        cfg.dynamoCostDemandWrites = 0;
        cfg.dynamoCostTotal = 0;
    });

    it('should calculate the correct demand costs', () => {
        // https://calculator.aws/#/estimate?id=9b4e4e2001b6ca5814d06f76346b4285ab3e6b4b
        calculateDemandCosts();
        calculateStorageCost();

        expect(cfg.dynamoCostStorage.toFixed(2)).toBe("512.00");
        expect(cfg.dynamoCostDemandReads.toFixed(2)).toBe( "26280.00");
        expect(cfg.dynamoCostDemandWrites.toFixed(2)).toBe("32850.00");
        cfg.dynamoCostTotal = cfg.dynamoCostStorage + cfg.dynamoCostDemandReads + cfg.dynamoCostDemandWrites;
        expect(cfg.dynamoCostTotal.toFixed(2)).toBe("59642.00");
    });
});

describe('calculateProvisionedCosts', () => {
    beforeEach(() => {
        cfg.pricing = 'provisioned';
        cfg.storageGB = 2048;
        cfg.tableClass = 'standard';
        cfg.itemSizeB = 1024;
        cfg.baseline = 100_000;
        cfg.peak = 200_000;
        cfg.peakWidth = 3;
        cfg.peakHours = cfg.peakWidth * 30;
        cfg.hoursPerMonth = 730;
        cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
        cfg.readRatio = 0.80;
        cfg.writeRatio = 0.20;
        cfg.itemSizeKB = cfg.itemSizeB * (1 / 1024);
        cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
        cfg.readStronglyConsistent = 1;
        cfg.readEventuallyConsistent = 0;
        cfg.readTransactional = 0;
        cfg.readNonTransactional = 1;
        cfg.writeTransactional = 0;
        cfg.writeNonTransactional = 1;
        cfg.reserved = 0;
        cfg.dynamoCostProvisionedRCU = 0;
        cfg.dynamoCostProvisionedWCU = 0;
        cfg.dynamoCostStorage = 0;
        cfg.dynamoCostTotal = 0;
    });

    it('should calculate the correct provisioned costs', () => {
        // https://calculator.aws/#/estimate?id=af7692f740cb3805a1604855478a753ccce36a91
        calculateProvisionedCosts();
        calculateStorageCost();

        expect(cfg.dynamoCostStorage.toFixed(2)).toBe("512.00");
        expect(cfg.dynamoCostProvisionedRCU.toFixed(2)).toBe( "8528.00");
        expect(cfg.dynamoCostProvisionedWCU.toFixed(2)).toBe( "10660.00");
        cfg.dynamoCostTotal = cfg.dynamoCostStorage + cfg.dynamoCostProvisionedRCU + cfg.dynamoCostProvisionedWCU;
        expect(cfg.dynamoCostTotal.toFixed(2)).toBe("19700.00");
    });
});

describe('calculateReservedCosts', () => {
    beforeEach(() => {
        cfg.pricing = 'provisioned';
        cfg.storageGB = 2048;
        cfg.tableClass = 'standard';
        cfg.itemSizeB = 1024;
        cfg.baseline = 100_000;
        cfg.peak = 200_000;
        cfg.peakWidth = 3;
        cfg.peakHours = cfg.peakWidth * 30;
        cfg.hoursPerMonth = 730;
        cfg.baselineHours = cfg.hoursPerMonth - cfg.peakHours;
        cfg.readRatio = 0.80;
        cfg.writeRatio = 0.20;
        cfg.itemSizeKB = cfg.itemSizeB * (1 / 1024);
        cfg.itemSizeKB = cfg.itemSizeKB > 1 ? Math.floor(cfg.itemSizeKB) : cfg.itemSizeKB;
        cfg.readStronglyConsistent = 1;
        cfg.readEventuallyConsistent = 0;
        cfg.readTransactional = 0;
        cfg.readNonTransactional = 1;
        cfg.writeTransactional = 0;
        cfg.writeNonTransactional = 1;
        cfg.reserved = 100;
        cfg.dynamoCostMonthlyRCU = 0;
        cfg.dynamoCostUpfrontRCU = 0;
        cfg.dynamoCostMonthlyWCU = 0;
        cfg.dynamoCostUpfrontWCU = 0;
        cfg.dynamoCostStorage = 0;
        cfg.dynamoCostProvisionedMonthly = 0;
        cfg.dynamoCostTotalMonthly = 0;
        cfg.dynamoCostProvisionedUpfront = 0;
    });

    it('should calculate the correct reserved costs', () => {
        // https://calculator.aws/#/estimate?id=edc2264f3f8d69b642ef73e44225a2a130fdf9a3
        calculateProvisionedCosts();
        calculateStorageCost();

        cfg.dynamoCostTotalMonthly = cfg.dynamoCostProvisionedMonthly + cfg.dynamoCostStorage;
        cfg.dynamoCostTotalUpfront = cfg.dynamoCostProvisionedUpfront;

        expect(cfg.dynamoCostStorage.toFixed(2)).toBe("512.00");
        expect(cfg.dynamoCostMonthlyRCU.toFixed(2)).toBe( "2396.00");
        expect(cfg.dynamoCostUpfrontRCU.toFixed(2)).toBe( "24000.00");
        expect(cfg.dynamoCostMonthlyWCU.toFixed(2)).toBe( "3038.80");
        expect(cfg.dynamoCostUpfrontWCU.toFixed(2)).toBe( "30000.00");
        expect(cfg.dynamoCostTotalMonthly.toFixed(2)).toBe("5946.80");
        expect(cfg.dynamoCostTotalUpfront.toFixed(2)).toBe("54000.00");
    });
});