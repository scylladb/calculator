import { calculateScyllaPricing } from '../src/calculatorScyllaDB.js';

describe('calculateScyllaPricing', () => {
    it('should calculate correct node count and cost for i7ie.large', () => {
        const cfg = {
            peakReads: 20_000,
            peakWrites: 10_000,
            storageGB: 3_000,
            scyllaReplication: 3,
            scyllaCompressionRatio: 0.5,
            regions: 2,
            expectedTypes: ['i7i.large', 'i7ie.large', 'i7ie.xlarge', 'i7ie.2xlarge', 'i7ie.3xlarge',
                'i7ie.6xlarge', 'i7ie.12xlarge', 'i7ie.18xlarge', 'i7ie.24xlarge', 'i7ie.48xlarge']
        };
        const result = calculateScyllaPricing(cfg);

        // Check structure
        expect(result).toHaveProperty('replication', 3);
        expect(result).toHaveProperty('requiredVCPUs');
        expect(result).toHaveProperty('requiredStorage');
        expect(result).toHaveProperty('nodeOptions');
        expect(result).toHaveProperty('bestInstanceType');
        expect(result).toHaveProperty('bestNodeCount');
        expect(result).toHaveProperty('bestMonthlyCost');

        // Check bestInstanceType is one of the types
        expect(cfg.expectedTypes).toContain(result.bestInstanceType);
        // Check node count and cost are positive
        expect(result.bestNodeCount).toBeGreaterThan(0);
        expect(result.bestMonthlyCost).toBeGreaterThan(0);
    });

    it('should handle RF=2 and RF=3 correctly', () => {
        [2, 3].forEach(rf => {
            const cfg = {
                peakReads: 10_000,
                peakWrites: 5_000,
                storageGB: 1_000,
                scyllaReplication: rf,
                scyllaCompressionRatio: 0.5,
                regions: 1
            };
            const result = calculateScyllaPricing(cfg);
            expect(result.replication).toBe(rf);
            expect(result.bestNodeCount).toBeGreaterThan(0);
            expect(result.bestMonthlyCost).toBeGreaterThan(0);
        });
    });

    it('should handle high ops/sec and large storage', () => {
        const cfg = {
            peakReads: 100_000,
            peakWrites: 100_000,
            storageGB: 50_000,
            scyllaReplication: 3,
            scyllaCompressionRatio: 0.5,
            regions: 1
        };
        const result = calculateScyllaPricing(cfg);
        expect(result.requiredVCPUs).toBeGreaterThan(0);
        expect(result.requiredStorage).toBeGreaterThan(0);
        expect(result.bestNodeCount).toBeGreaterThan(0);
        expect(result.bestMonthlyCost).toBeGreaterThan(0);
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
        expect(result.requiredVCPUs).toBeGreaterThan(0);
        expect(result.requiredStorage).toBeGreaterThan(0);
        expect(result.bestNodeCount).toBeGreaterThan(0);
        expect(result.bestMonthlyCost).toBeGreaterThan(0);
    });
});
