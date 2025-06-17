import { calculateScyllaPricing } from '../src/calculatorScyllaDB.js';

describe('calculateScyllaPricing', () => {
    it('should calculate correct node count and cost for i7ie.large', () => {
        const cfg = {
            peakReads: 20000,
            peakWrites: 10000,
            storageGB: 3000,
            scyllaReplication: 3,
            scyllaCompressionRatio: 0.5,
            regions: 2,
            expectedTypes: ['i7i.large', 'i7ie.large', 'i7ie.xlarge', 'i7ie.2xlarge', 'i7ie.3xlarge',
                'i7ie.6xlarge', 'i7ie.12xlarge', 'i7ie.18xlarge', 'i7ie.24xlarge', 'i7ie.48xlarge']
        };
        const result = calculateScyllaPricing(cfg);

        // Check structure
        expect(result.replication).toBe(3); // input
        expect(result.requiredVCPUs).toBe(6); // ((20000+10000)*3)/15000 = 6
        expect(result.requiredStorage).toBe(18000); // (3000/0.5)*3 = 18000
        expect(result.nodeOptions.length).toBe(9); // 10 instance types
        expect(result.bestInstanceType).toBe('i7ie.3xlarge'); // least nodes for this config
        expect(result.bestNodeCount % 3).toBe(0); // nodes should be a multiple of 3
        expect(result.bestNodeCount).toBe(3); // max(ceil(6/12), ceil(18000/(7500*0.9))) = max(1, 3) = 3 (rounded up to next multiple of 3)
        expect(result.bestMonthlyCost).toBeCloseTo(82.476, 3); // 3*13.746*2 = 82.476
        // console.log('ScyllaDB Pricing Result:', result);
    });

    it('should handle RF=2 correctly', () => {
        // RF=2
        let cfg = {
            peakReads: 10000,
            peakWrites: 5000,
            storageGB: 1000,
            scyllaReplication: 2,
            scyllaCompressionRatio: 0.5,
            regions: 1
        };
        let result = calculateScyllaPricing(cfg);
        expect(result.replication).toBe(2); // input
        expect(result.requiredVCPUs).toBe(2); // ((10000+5000)*2)/15000 = 2
        expect(result.requiredStorage).toBe(4000); // (1000/0.5)*2 = 4000
        // i7ie.large: max(ceil(2/2), ceil(4000/(1250*0.9))) = max(1, 4) = 4, rounded up to 6
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(recommendation.nodes).toBe(6);
    });

    it('should handle RF=3 correctly', () => {
        // RF=3
        let cfg = {
            peakReads: 10000,
            peakWrites: 5000,
            storageGB: 1000,
            scyllaReplication: 3,
            scyllaCompressionRatio: 0.5,
            regions: 1
        };
        let result = calculateScyllaPricing(cfg);
        expect(result.replication).toBe(3); // input
        expect(result.requiredVCPUs).toBe(3); // ((10000+5000)*3)/15000 = 3
        expect(result.requiredStorage).toBe(6000); // (1000/0.5)*3 = 6000
        // i7ie.large: max(ceil(3/2), ceil(6000/(1250*0.9))) = max(2, 6) = 6
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(recommendation.nodes).toBe(6);
        expect(result.bestInstanceType).toBe('i7ie.xlarge'); // least nodes for this config
        expect(result.bestNodeCount).toBe(3); // max(ceil(3/4), ceil(6000/(2500*0.9))) = max(1, 3) = 3
        expect(result.bestMonthlyCost).toBeCloseTo(13.746, 3); // 3*4.582*1 = 13.746
    });

    it('should handle high ops/sec and large storage', () => {
        const cfg = {
            peakReads: 100000,
            peakWrites: 100000,
            storageGB: 50000,
            scyllaReplication: 3,
            scyllaCompressionRatio: 0.5,
            regions: 1
        };
        const result = calculateScyllaPricing(cfg);
        expect(result.requiredVCPUs).toBe(40); // ((100000+100000)*3)/15000 = 40
        expect(result.requiredStorage).toBe(300000); // (50000/0.5)*3 = 300000
        // i7ie.48xlarge: max(ceil(40/192), ceil(300000/(120000*0.9))) = max(1, 3) = 3 (rounded up to next multiple of 3)
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.48xlarge');
        expect(recommendation.nodes).toBe(3);
        expect(result.bestInstanceType).toBe('i7ie.48xlarge');
        // The cost: 3 * 219.931 * 1 = 659.793
        expect(result.bestMonthlyCost).toBeCloseTo(659.793, 3);
    });

    it('should handle small storage and low ops/sec', () => {
        const cfg = {
            peakReads: 100,
            peakWrites: 100,
            storageGB: 10,
            scyllaReplication: 2,
            scyllaCompressionRatio: 0.5,
            regions: 1
        };
        const result = calculateScyllaPricing(cfg);
        expect(result.requiredVCPUs).toBe(1); // ((100+100)*2)/15000 = 1
        expect(result.requiredStorage).toBe(40); // (10/0.5)*2 = 40
        // i7ie.large: max(ceil(1/2), ceil(40/(1250*0.9))) = max(1, 1) = 1, rounded up to 3
        let recommendation = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(recommendation.nodes).toBe(3);
        expect(result.bestInstanceType).toBe('i7ie.large');
    });
});
