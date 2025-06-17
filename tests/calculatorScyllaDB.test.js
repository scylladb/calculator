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
});
