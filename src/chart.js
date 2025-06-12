import {cfg} from './config.js';
import {formatNumber, updateAll} from "./utils.js";

const ctx = document.getElementById('chart').getContext('2d');

const bluePattern = pattern.draw('disc', '#326DE600', '#326DE699', 6);
const orangePattern = pattern.draw('line', '#ff550000', '#FF550099', 6);

function generateData(baseline, peak, peakDuration) {
    const data = [];
    const peakStart = Math.floor((24 - peakDuration) / 2);
    const peakEnd = peakStart + peakDuration;

    for (let hour = 0; hour < 24; hour++) {
        if (peakDuration > 0 && hour >= peakStart && hour < peakEnd) {
            data.push(peak);
        } else {
            data.push(baseline);
        }
    }

    return data;
}

export function updateChart() {
    let yMax;

    if (cfg.workload === "baselinePeak") {
        chart.data.datasets[0].data = generateData(cfg.baselineReads, cfg.peakReads, cfg.peakDurationReads);
        chart.data.datasets[1].data = generateData(cfg.baselineWrites, cfg.peakWrites, cfg.peakDurationWrites);
        chart.data.labels = Array.from({length: 24}, (_, i) => (i + 1).toString());
        chart.options.scales.x.ticks.display = false;
        yMax = Math.max(
            cfg.baselineReads + cfg.peakReads,
            cfg.baselineWrites + cfg.peakWrites
        );
    } else {
        chart.data.datasets[0].pointHitRadius = 25;
        chart.data.datasets[0].data = cfg.seriesReads;
        chart.data.datasets[1].pointHitRadius = 25;
        chart.data.datasets[1].data = cfg.seriesWrites;
        chart.data.labels = Array.from({length: 24}, (_, i) => (i + 1).toString());
        chart.options.scales.x.ticks.display = true;
        yMax = Math.max(
            ...cfg.seriesReads.map(p => p.y),
            ...cfg.seriesWrites.map(p => p.y)
        );
    }

    if (yMax >= chart.options.scales.y.max * 0.98) {
        chart.options.scales.y.max = yMax * 1.2;
    }

    chart.data.datasets[2].data = chart.data.datasets[0].data.map((v, i) => {
        const y = typeof v === 'object' ? v.y : v;
        return typeof v === 'object' ? {x: v.x, y: y * (1 + cfg.overprovisioned / 100)} : y * (1 + cfg.overprovisioned / 100);
    });
    chart.data.datasets[3].data = chart.data.datasets[1].data.map((v, i) => {
        const y = typeof v === 'object' ? v.y : v;
        return typeof v === 'object' ? {x: v.x, y: y * (1 + cfg.overprovisioned / 100)} : y * (1 + cfg.overprovisioned / 100);
    });

    chart.data.datasets[4].data = cfg.seriesReservedRCU || Array(24).fill(null);
    chart.data.datasets[5].data = cfg.seriesReservedWCU || Array(24).fill(null);

    chart.update();
}

export const chart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [{
            label: 'Reads',
            data: generateData(),
            borderColor: '#326DE6',
            borderWidth: 3,
            backgroundColor: bluePattern,
            fill: true,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            pointHitRadius: 0,
            pointRadius: 0,
            hidden: false
        }, {
            label: 'Writes',
            data: generateData(),
            borderColor: '#FF5500',
            borderWidth: 2,
            backgroundColor: orangePattern,
            fill: true,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            pointHitRadius: 0,
            pointRadius: 0,
            hidden: false
        }, {
            label: 'Overprovisioned Reads',
            data: generateData().map((v, i) => typeof v === 'object' ? {x: v.x, y: v.y * 1.2} : v * 1.2),
            borderColor: 'rgba(50,109,230,0.40)',
            borderWidth: 2,
            borderDash: [6, 6],
            fill: false,
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            hidden: false,
            showLine: true,
            showInLegend: false
        }, {
            label: 'Overprovisioned Writes',
            data: generateData().map((v, i) => typeof v === 'object' ? {x: v.x, y: v.y * 1.2} : v * 1.2),
            borderColor: 'rgba(255,85,0,0.40)',
            borderWidth: 2,
            borderDash: [6, 6],
            fill: false,
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            hidden: false,
            showLine: true,
            showInLegend: false
        }, {
            label: 'Reserved RCU',
            data: Array(24).fill(null),
            borderColor: 'rgba(50,109,230,0.80)',
            borderWidth: 2,
            borderDash: [2, 2],
            fill: false,
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0,
            cubicInterpolationMode: 'monotone',
            hidden: false,
            showLine: true,
            showInLegend: true
        }, {
            label: 'Reserved WCU',
            data: Array(24).fill(null),
            borderColor: 'rgba(255,85,0,0.80)',
            borderWidth: 2,
            borderDash: [2, 2],
            fill: false,
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0,
            cubicInterpolationMode: 'monotone',
            hidden: false,
            showLine: true,
            showInLegend: true
        }]
    }, options: {
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    filter: function(item, chart) {
                        // Only show legend for series 0 and 1
                        return item.datasetIndex === 0 || item.datasetIndex === 1;
                    }
                }
            },
            title: {
                display: false
            },
            tooltip: {
                display: true,
                callbacks: {
                    label: function (context) {
                        return context.dataset.label +  ': ' + formatNumber(context.raw.y) + ' ops/sec';
                    }
                },
            },
            dragData: {
                dragX: false,
                dragY: true,
                round: 2,
                showTooltip: true,
                onDragStart: function (e) {
                },
                onDrag: function (...args) {
                    const [e] = args;
                    if (e.target?.style)
                        e.target.style.cursor = "grabbing";
                },
                onDragEnd: function (e) {
                    cfg.workload = "custom";
                    updateAll();
                    if (e.target?.style)
                        e.target.style.cursor = "default";
                },
            },
        },
        scales: {
            x: {
                type: 'category',
                labels: [...Array(24).keys()].map(h => h.toString().padStart(2, '0') + ':00'),
                title: {
                    display: false,
                },
                grid: {
                    color: '#D8E5EB',
                    lineWidth: 1,
                    display: true,
                    drawBorder: true,
                    drawOnChartArea: true
                },
                ticks: {
                    stepSize: 1,
                    display: true
                }
            },
            y: {
                stacked: false,
                type: 'linear',
                title: {
                    display: true,
                    text: 'ops/sec',
                    color: '#616D87',
                    font: {
                        size: 15,
                        weight: 'normal'
                    }
                },
                min: 1000,
                max: (cfg.peakReads + cfg.peakWrites) * 2,
                ticks: {
                    color: '#616D87',
                    font: {
                        size: 13,
                        weight: 'normal'
                    },
                    padding: 5,
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
