import {cfg} from './config.js';
import {formatNumber} from "./utils.js";

const ctx = document.getElementById('chart').getContext('2d');

function generateData(baseline, peak, peakWidth) {
    const data = [];
    const peakStart = Math.floor((24 - peakWidth) / 2);
    const peakEnd = peakStart + peakWidth;

    for (let hour = 0; hour <= 24; hour++) {
        if (peakWidth > 0 && hour >= peakStart && hour < peakEnd) {
            data.push({x: hour, y: peak});
        } else {
            data.push({x: hour, y: baseline});
        }
    }

    return data;
}

export function updateChart() {
    let baseline = cfg.baselineReads + cfg.baselineWrites;
    let peak = cfg.peakReads + cfg.peakWrites;
    chart.data.datasets[0].data = generateData(baseline, peak, cfg.peakWidth);
    // Check if peak is close to the current y-axis max value
    if (peak >= chart.options.scales.y.max * 0.98) {
        chart.options.scales.y.max = peak * 1.2;
    }
    chart.update();
}

export const chart = new Chart(ctx, {
    type: 'scatter', data: {
        datasets: [{
            label: 'operations',
            data: generateData(),
            borderColor: '#383D57',
            backgroundColor: 'rgba(56,61,87,0.50)',
            fill: true,
            tension: 0.1,
            showLine: true,
            pointRadius: 0,
            hidden: false
        }]
    }, options: {
        plugins: {
            legend: {
                display: false
            }, title: {
                display: false
            }, tooltip: {
                callbacks: {
                    label: function (context) {
                        return 'Workload: ' + formatNumber(context.raw.y) + ' ops/sec';
                    }
                }
            }
        }, scales: {
            x: {
                min: 0, max: 24, title: {
                    display: false,
                }, ticks: {
                    stepSize: 1, callback: function (value) {
                        return value.toString().padStart(2, '0') + ':00';
                    },
                    display: false
                }
            },
            y: {
                type: 'linear',
                title: {
                    display: true,
                    text: 'op/sec'
                },
                min: 1000,
                max: (cfg.peakReads + cfg.peakWrites) * 2,
                ticks: {
                    callback: function (value, index, values) {
                        if (value === values[values.length - 1].value) {
                            return null; // Hide the max tick
                        }
                        if (value >= 1000 && value < 10000) return (value / 1000) + 'K';
                        if (value >= 10000 && value < 1000000) return (value / 1000) + 'K';
                        if (value >= 1000000) return (value / 1000000) + 'M';
                        return value;
                    }
                }
            }
        }
    }
});
