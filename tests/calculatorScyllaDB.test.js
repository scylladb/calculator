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
        expect(result.bestInstanceType).toBe('i7ie.large'); // cheapest for this config
        expect(result.bestNodeCount).toBe(16); // max(ceil(6/2), ceil(18000/(1250*0.9))) = max(3, 16) = 16
        expect(result.bestMonthlyCost).toBe(61.152); // 16*1.911*2 = 61.152
    });

    it('should handle RF=2 and RF=3 correctly', () => {
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
        // i7ie.large: max(ceil(2/2), ceil(4000/(1250*0.9))) = max(1, 4) = 4
        const i7ieLarge = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(i7ieLarge.nodes).toBe(4);

        // RF=3
        cfg = {
            peakReads: 10000,
            peakWrites: 5000,
            storageGB: 1000,
            scyllaReplication: 3,
            scyllaCompressionRatio: 0.5,
            regions: 1
        };
        result = calculateScyllaPricing(cfg);
        expect(result.replication).toBe(3); // input
        expect(result.requiredVCPUs).toBe(3); // ((10000+5000)*3)/15000 = 3
        expect(result.requiredStorage).toBe(6000); // (1000/0.5)*3 = 6000
        // i7ie.large: max(ceil(3/2), ceil(6000/(1250*0.9))) = max(2, 6) = 6
        const i7ieLarge3 = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(i7ieLarge3.nodes).toBe(6);
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
        // i7ie.12xlarge: max(ceil(40/48), ceil(300000/(30000*0.9))) = max(1, 12) = 12
        const i7ie12xlarge = result.nodeOptions.find(n => n.type === 'i7ie.12xlarge');
        expect(i7ie12xlarge.nodes).toBe(12);
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
        // i7ie.large: max(ceil(1/2), ceil(40/(1250*0.9))) = max(1, 1) = 1
        const i7ieLarge = result.nodeOptions.find(n => n.type === 'i7ie.large');
        expect(i7ieLarge.nodes).toBe(1);
    });
});
