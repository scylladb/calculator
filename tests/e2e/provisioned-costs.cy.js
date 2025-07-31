// https://calculator.aws/#/estimate?id=69ac052fb4ce86ace1a0617c42fbc69b3d725b92
describe('Workload Calculator Provisioned Costs', () => {
  it('calculates provisioned costs correctly for given parameters', () => {
    cy.visit('http://localhost:5173/?pricing=provisioned&storageGB=2048&itemSizeB=1024&tableClass=standard&baselineReads=80000&baselineWrites=20000&peakReads=160000&peakWrites=40000&peakDurationReads=3&peakDurationWrites=3&totalReads=22068000000&totalWrites=15447600000&reserved=0&overprovisioned=0&readConst=100&seriesReads=150.130.110.100.100.110.170.300.450.550.400.350.330.310.300.320.350.370.330.250.200.170.150.130&seriesWrites=105.91.77.70.70.77.119.210.315.385.280.245.231.217.210.224.245.259.231.175.140.119.105.91&workload=baselinePeak');

    cy.contains('Total monthly cost').parent().should('contain', '19,730');
    cy.contains('Total annual cost').parent().should('contain', '236,764');
  });
});
