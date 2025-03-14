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
        cfg.demand = 100_000;
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
        cfg.reservedCapacity = 0;
        cfg.dynamoCostProvisionedRCU = 0;
        cfg.dynamoCostProvisionedWCU = 0;
        cfg.dynamoCostStorage = 0;
        cfg.dynamoCostTotal = 0;
    });

    it('should calculate the correct provisioned costs', () => {
        calculateProvisionedCosts();
        calculateStorageCost();

        expect(cfg.dynamoCostStorage.toFixed(2)).toBe("512.00");
        expect(cfg.dynamoCostProvisionedRCU.toFixed(2)).toBe( "8528.00");
        expect(cfg.dynamoCostProvisionedWCU.toFixed(2)).toBe( "10660.00");
        cfg.dynamoCostTotal = cfg.dynamoCostStorage + cfg.dynamoCostProvisionedRCU + cfg.dynamoCostProvisionedWCU;
        expect(cfg.dynamoCostTotal.toFixed(2)).toBe("19700.00");
    });
});