// https://calculator.aws/#/estimate?id=9b4e4e2001b6ca5814d06f76346b4285ab3e6b4b
describe('Workload Calculator Demand Costs', () => {
  it('calculates demand costs correctly for given parameters', () => {
    cy.visit('http://localhost:5173/?pricing=demand&storageGB=2048&itemSizeB=1024&tableClass=standard&baselineReads=80000&baselineWrites=20000&peakReads=80000&peakWrites=20000&peakDurationReads=0&peakDurationWrites=0&totalReads=22068000000&totalWrites=15447600000&reserved=0&overprovisioned=0&readConst=100&seriesReads=150.130.110.100.100.110.170.300.450.550.400.350.330.310.300.320.350.370.330.250.200.170.150.130&seriesWrites=105.91.77.70.70.77.119.210.315.385.280.245.231.217.210.224.245.259.231.175.140.119.105.91&workload=baselinePeak');

    // You may need to update these selectors/assertions based on your actual UI
    cy.contains('Total monthly cost').parent().should('contain', '59,642');
    cy.contains('Total annual cost').parent().should('contain', '715,704');
  });
});
