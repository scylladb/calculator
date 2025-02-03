import {cfg} from './config.js';
import {updateCosts, updateOps} from "./calculator.js";
import {formatNumber, queryParams} from "./utils.js";

const ctx = document.getElementById('chart').getContext('2d');

export function generateProvisionedData(baseline, peak, peakWidth) {
    const data = [];
    const peakStart = Math.floor((24 - peakWidth) / 2);
    const peakEnd = peakStart + peakWidth;

    for (let hour = 0; hour <= 24; hour++) {
        if (hour >= peakStart && hour < peakEnd) {
            data.push({x: hour, y: peak});
        } else {
            data.push({x: hour, y: baseline});
        }
    }
    return data;
}

export function generateOnDemandData() {
    return Array.from({length: 25}, (_, i) => ({x: i, y: cfg.onDemand}));
}

export function generateWorkloadData(workload) {
    switch (workload) {
        case 'twiceDaily':
            return [{x: 0, y: 5000}, {x: 6, y: 10000}, {x: 8, y: 100000}, {x: 10, y: 10000}, {x: 12, y: 5000}, {
                x: 16,
                y: 10000
            }, {x: 18, y: 100000}, {x: 20, y: 10000}, {x: 24, y: 5000}];
        case 'constant':
            return Array.from({length: 25}, (_, i) => ({x: i, y: 50000}));
        case 'morningPeak':
        default:
            return [{x: 0, y: 5000}, {x: 8, y: 10000}, {x: 9, y: 100000}, {x: 10, y: 10000}, {x: 24, y: 5000}];
    }
}

export let onDemandData = generateOnDemandData();
export let provisionedData = generateProvisionedData(cfg.baseline, cfg.peak, cfg.peakWidth);
export let workloadData = generateWorkloadData(queryParams.workload);

export const chart = new Chart(ctx, {
    type: 'scatter', data: {
        datasets: [{
            label: "Workload",
            borderColor: '#0F1040',
            backgroundColor: 'rgba(170,170,170,0.5)',
            data: workloadData,
            fill: true,
            showLine: true,
            borderDash: [4, 4],
            tension: 0.3
        }, {
            label: 'On Demand',
            data: onDemandData,
            borderColor: '#0F1040',
            backgroundColor: 'rgba(15,16,64,0.8)',
            showLine: true,
            pointRadius: 0,
            fill: true,
            tension: 0.1,
        }, {
            label: 'Provisioned',
            data: provisionedData,
            borderColor: '#0F1040',
            backgroundColor: 'rgba(15,16,64,0.8)',
            fill: true,
            tension: 0.1,
            showLine: true,
            pointRadius: 0,
            hidden: true
        }]
    }, options: {
        plugins: {
            legend: {
                display: false
            }, title: {
                display: true, text: "Total Ops"
            }, tooltip: {
                callbacks: {
                    label: function (context) {
                        return 'Workload: ' + formatNumber(context.raw.y) + ' ops/sec';
                    }
                }
            }, dragData: {
                round: 1, showTooltip: true, onDrag: function (e, datasetIndex, index, value) {
                    value.x = Math.round(value.x);
                    value.y = Math.round(value.y / 1000) * 1000;
                }, onDragEnd: function (e, datasetIndex, index, value) {
                    updateOps();
                    chart.update();
                }, dragX: true, dragY: true
            }
        }, scales: {
            x: {
                min: 0, max: 24, title: {
                    display: false,
                }, ticks: {
                    stepSize: 1, callback: function (value) {
                        return value.toString().padStart(2, '0') + ':00';
                    }
                }
            }, y: {
                type: 'logarithmic', title: {
                    display: true, text: 'op/sec'
                }, min: 1000, max: 10000000, ticks: {
                    callback: function (value) {
                        if (value === 1000) return '1K';
                        if (value === 10000) return '10K';
                        if (value === 100000) return '100K';
                        if (value === 1000000) return '1M';
                        if (value === 10000000) return '10M';
                        return null;
                    }
                }
            }
        }
    }
});

export function updateChart() {
    chart.data.datasets[1].data = Array.from({length: 25}, (_, i) => ({x: i, y: cfg.onDemand}));
    chart.data.datasets[2].data = generateProvisionedData(cfg.baseline, cfg.peak, cfg.peakWidth);
    chart.update();
    updateOps();
    updateCosts();
}