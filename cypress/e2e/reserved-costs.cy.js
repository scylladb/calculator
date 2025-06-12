// https://calculator.aws/#/estimate?id=f8044ce2809a3ee222b869f62513e93f2c1720f2
describe('Workload Calculator Reserved Costs', () => {
  it('calculates reserved costs correctly for given parameters', () => {
    cy.visit('http://localhost:5173/?pricing=provisioned&storageGB=2048&itemSizeB=1024&tableClass=standard&baselineReads=80000&baselineWrites=20000&peakReads=160000&peakWrites=40000&peakDurationReads=3&peakDurationWrites=3&totalReads=22068000000&totalWrites=15447600000&reserved=100&overprovisioned=0&readConst=100&seriesReads=150.130.110.100.100.110.170.300.450.550.400.350.330.310.300.320.350.370.330.250.200.170.150.130&seriesWrites=105.91.77.70.70.77.119.210.315.385.280.245.231.217.210.224.245.259.231.175.140.119.105.91&workload=baselinePeak');

    // You may need to update these selectors/assertions based on your actual UI
    cy.contains('Total monthly cost').parent().should('contain', '5,977');
    cy.contains('Total upfront cost').parent().should('contain', '54,000');
    cy.contains('Total annual + upfront cost').parent().should('contain', '125,726');
  });
});
