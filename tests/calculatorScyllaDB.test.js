import {calculateScyllaDBCosts} from '../src/calculatorScyllaDB.js';
import {cfg} from '../src/config.js';

// Mock updateDisplayedCosts to avoid DOM manipulation during tests
jest.mock('../src/utils.js', () => ({
    updateDisplayedCosts: jest.fn()
}));

describe('calculateScyllaDBCosts', () => {
    it('should calculate correct node count and cost for i7ie.large', () => {
        cfg.maxReads = 20000;
        cfg.maxWrites = 10000;
        cfg.storageGB = 3000;
        cfg.scyllaReplication = 3;
        cfg.scyllaCompressionRatio = 0.5;
        cfg.regions = 2;

        calculateScyllaDBCosts();

        const result = cfg._baseCost;

        expect(cfg.scyllaReplication).toBe(3);

        expect(result.requiredVCPUs).toBe(6);
        expect(result.requiredStorage).toBe(4500);
        expect(result.nodeOptions.length).toBeGreaterThan(0);
        expect(result.bestInstanceType).toBe('i7ie.xlarge');
        expect(result.bestNodeCount % cfg.scyllaReplication).toBe(0);
        expect(result.bestNodeCount).toBe(3);
        expect(result.monthlyCost).toBeCloseTo(20069.16, 3); // 3*4.582*2*730 = 20,069.16
    });

    it('should handle RF=2 correctly', () => {
        cfg.maxReads = 10000;
        cfg.maxWrites = 5000;
        cfg.storageGB = 1000;
        cfg.scyllaReplication = 2;
        cfg.scyllaCompressionRatio = 0.5;
        cfg.regions = 1;

        calculateScyllaDBCosts();

        const result = cfg._baseCost;

        expect(result.replication).toBe(2); // input
        expect(result.requiredVCPUs).toBe(2); // ((10000+5000)*2)/15000 = 2
        expect(result.requiredStorage).toBe(1000); // 1000*0.5*2 = 1000
        // i7ie.large: max(ceil(2/2), ceil(4000/(1250*0.9))) = max(1, 4) = 4, rounded up to 6
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(recommendation.nodes).toBe(2);
    });

    it('should handle RF=3 correctly', () => {
        cfg.maxReads = 10000;
        cfg.maxWrites = 5000;
        cfg.storageGB = 1000;
        cfg.scyllaReplication = 3;
        cfg.scyllaCompressionRatio = 0.5;
        cfg.regions = 1;

        calculateScyllaDBCosts();

        const result = cfg._baseCost;

        expect(result.replication).toBe(3); // input
        expect(result.requiredVCPUs).toBe(3); // ((10000+5000)*3)/15000 = 3
        expect(result.requiredStorage).toBe(1500); // 1000*0.5*3 = 1500
        // i7ie.large: max(ceil(3/2), ceil(6000/(1250*0.9))) = max(2, 6) = 6
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(recommendation.nodes).toBe(3);
        expect(result.bestInstanceType).toBe('i7ie.large');
        expect(result.bestNodeCount).toBe(3); // max(ceil(3/4), ceil(6000/(2500*0.9))) = max(1, 3) = 3
        expect(result.monthlyCost).toBeCloseTo(4185.09, 3); // 3*1.911*1*730 = 4,185.09
    });

    it('should handle high ops/sec and large storage', () => {
        cfg.maxReads = 100000;
        cfg.maxWrites = 100000;
        cfg.storageGB = 50000;
        cfg.scyllaReplication = 3;
        cfg.scyllaCompressionRatio = 0.5;
        cfg.regions = 1;

        calculateScyllaDBCosts();

        const result = cfg._baseCost;

        expect(result.requiredVCPUs).toBe(40); // ((100000+100000)*3)/15000 = 40
        expect(result.requiredStorage).toBe(75000); // 50000*0.5*3 = 75000
        // i7ie.12xlarge: max(ceil(40/192), ceil(300000/(120000*0.9))) = max(1, 3) = 3
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.48xlarge');
        expect(recommendation.nodes).toBe(3);
        expect(result.bestInstanceType).toBe('i7ie.12xlarge');
        expect(result.monthlyCost).toBeCloseTo(120412.77, 3); // 3*54.983*1*730 = 120,412.77
    });

    it('should handle small storage and low ops/sec', () => {
        cfg.maxReads = 100;
        cfg.maxWrites = 100;
        cfg.storageGB = 10;
        cfg.scyllaReplication = 2;
        cfg.scyllaCompressionRatio = 0.5;
        cfg.regions = 1;

        calculateScyllaDBCosts();

        const result = cfg._baseCost;

        expect(result.requiredVCPUs).toBe(1); // ((100+100)*2)/15000 = 1
        expect(result.requiredStorage).toBe(10); // 10*0.5*2 = 10
        // i7ie.large: max(ceil(1/2), ceil(40/(1250*0.9))) = max(1, 1) = 1
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(recommendation.nodes).toBe(2);
        expect(result.bestInstanceType).toBe('i7ie.large');
    });
});
