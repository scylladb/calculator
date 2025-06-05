import {cfg} from './config.js';
import {formatNumber} from "./utils.js";

const ctx = document.getElementById('chart').getContext('2d');
const ctxReal = document.getElementById('chartReal').getContext('2d');

const bluePattern = pattern.draw('disc', '#326DE600', '#326DE699', 6);
const orangePattern = pattern.draw('line', '#ff550000', '#FF550099', 6);

function generateData(baseline, peak, peakDuration) {
    const data = [];
    const peakStart = Math.floor((24 - peakDuration) / 2);
    const peakEnd = peakStart + peakDuration;

    for (let hour = 0; hour < 24; hour++) {
        if (peakDuration > 0 && hour >= peakStart && hour < peakEnd) {
            data.push({x: hour, y: peak});
        } else {
            data.push({x: hour, y: baseline});
        }
    }

    return data;
}

export function updateChart() {
    let maxPeak = Math.max(cfg.peakReads, cfg.peakWrites);
    chart.data.datasets[0].data = generateData(cfg.baselineReads, cfg.peakReads, cfg.peakDurationReads);
    chart.data.datasets[1].data = generateData(cfg.baselineWrites, cfg.peakWrites, cfg.peakDurationWrites);
    // Check if peak is close to the current y-axis max value
    if (maxPeak >= chart.options.scales.y.max * 0.98) {
        chart.options.scales.y.max = maxPeak * 1.2;
    }
    chart.update();
    chartReal.update();
}

export const chart = new Chart(ctx, {
    type: 'scatter',
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
            showLine: true,
            pointRadius: 0,
            hidden: false
        },{
            label: 'Writes',
            data: generateData(),
            borderColor: '#FF5500',
            borderWidth: 2,

            backgroundColor: orangePattern,
            fill: true,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            showLine: true,
            pointRadius: 0,
            hidden: false
        }]
    }, options: {
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
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
            }
        },
        scales: {
            x: {
                stacked: false,
                min: 0,
                max: 23,
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
                    callback: function (value) {
                        if (value === 23) return '00:00';
                        return value.toString().padStart(2, '0') + ':00';
                    },
                    display: false
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
                    color: '#616D87', // Tick text color
                    font: {
                        size: 13,
                        weight: 'normal' // Font weight (normal, bold, etc.)
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

export const chartReal = new Chart(ctxReal,  {
    type: "line",
    options: {
        animation: true,
        plugins: {
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
                    if (e.target?.style)
                        e.target.style.cursor = "default";
                },
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y;
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (value >= 1_000_000) {
                            return label + (value / 1_000_000).toFixed(2) + 'M';
                        } else if (value >= 1_000) {
                            return label + (value / 1_000).toFixed(0) + 'K';
                        } else {
                            return label + Math.round(value);
                        }
                    }
                }
            }
        },
        onHover: function (e) {
            const point = e.chart.getElementsAtEventForMode(
                e,
                e.chart.options.interaction.mode,
                {intersect: true},
                false,
            );
            if (point.length) e.native.target.style.cursor = "grab";
            else e.native.target.style.cursor = "default";
        },
        scales: {
            x: {
                type: "linear",
                stacked: false,
                min: 0,
                max: 23,
                ticks: {
                    stepSize: 1
                },
                title: {
                    display: true,
                    text: "hour"
                },
            },
            y: {
                stacked: false,
                beginAtZero: false,
                min: 0,
                max: 1_000_000,
                grace: "20%",
                ticks: {
                    callback: function (value) {
                        if (value >= 1_000_000) {
                            return (value / 1_000_000).toFixed(2) + "M";
                        } else if (value >= 1_000) {
                            return (value / 1_000).toFixed(0) + "K";
                        } else {
                            return value;
                        }
                    }
                },
                title: {
                    display: true,
                    text: "ops/sec"
                }
            }
        },
    },
    data: {
        labels: [...Array(24).keys()].map(h => `${h}:00`),
        datasets: [
            {
                label: "Reads",
                data: [...Array(24).keys()].map((x, i) => ({
                    x, y: [150000, 130000, 110000, 100000, 100000, 110000, 170000, 300000,
                        450000, 550000, 400000, 350000, 330000, 310000, 300000,
                        320000, 350000, 370000, 330000, 250000, 200000, 170000,
                        150000, 130000][i] * 1.25
                })),
                backgroundColor: bluePattern,
                borderColor: '#326DE6',
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                cubicInterpolationMode: 'monotone',
                pointHitRadius: 25,
                // stepped: true,
            },
            {
                label: "Writes",
                data: [...Array(24).keys()].map((x, i) => ({
                    x, y: [150000, 130000, 110000, 100000, 100000, 110000, 170000, 300000,
                        450000, 550000, 400000, 350000, 330000, 310000, 300000,
                        320000, 350000, 370000, 330000, 250000, 200000, 170000,
                        150000, 130000][i]
                })),
                backgroundColor: orangePattern,
                borderColor: '#FF5500',
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                cubicInterpolationMode: 'monotone',
                pointHitRadius: 25,
                // stepped: true,
            }
        ],
    },
});
