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
        let value;
        if (peakDuration > 0 && hour >= peakStart && hour < peakEnd) {
            value = peak;
        } else {
            value = baseline;
        }
        data.push({x: hour, y: value});
    }

    return data;
}

export function decodeSeriesData() {
    // Only proceed if both encoded strings exist and are non-empty
    if (!cfg.seriesReadsEncoded?.length || !cfg.seriesWritesEncoded?.length) return;

    cfg.seriesReads = cfg.seriesReadsEncoded
        .split('.')
        .map((val, i) => ({x: i, y: parseInt(val, 10) * 1000}));

    cfg.seriesWrites = cfg.seriesWritesEncoded
        .split('.')
        .map((val, i) => ({x: i, y: parseInt(val, 10) * 1000}));
}

export function encodeSeriesData() {
    cfg.seriesReadsEncoded = cfg.seriesReads.map(p => Math.round(p.y / 1000)).join(".");
    cfg.seriesWritesEncoded = cfg.seriesWrites.map(p => Math.round(p.y / 1000)).join(".");
}

export function updateSeries() {
    const base = 100000;
    const seriesReads = [];
    const seriesWrites = [];

    for (let i = 0; i < 24; i++) {
        let value = base;
        switch (cfg.workload) {
            case "dailyPeak":
                value = i === 9 ? base * 4.5 : base;
                break;
            case "twiceDaily":
                value = (i === 9 || i === 18) ? base * 3.5 : base;
                break;
            case "batch":
                value = (i >= 0 && i <= 3) ? base * 6 : base;
                break;
            case "sawtooth":
                value = base + (i % 6) * base * 0.5;
                break;
            case "bursty":
                value = (Math.random() < 0.3) ? base * (5 + Math.random() * 5) : base;
                break;
            case "rampUp":
                value = base + (i * (base * 9 / 23));
                break;
            case "rampDown":
                value = base * (1 - i / 24);
                break;
            case "flatline":
                value = base;
                break;
            case "sinusoidal":
                value = base + base * Math.sin((i / 12) * 2 * Math.PI);
                break;
            case "diurnal":
                value = 400000 + Math.cos((i - 12) * Math.PI / 12) * 400000 * 0.9;
                break;
            case "nocturnal":
                value = 400000 + Math.cos((i) * Math.PI / 12) * 400000 * 0.9;
                break;
            case "mountain":
                value = base + Math.max(0, (12 - Math.abs(i - 12)) * (base / 2));
                break;
            case "valley":
                value = Math.max(0, base * 4 - Math.max(0, (12 - Math.abs(i - 12)) * (base / 2)));
                break;
            case "chaos":
                let seed = (new Date()).getDate();
                // Simple LCG for repeatable pseudo-random numbers
                const seededRandom = () => {
                    seed = (seed * 42 + 42) % 424242;
                    return seed / 4242424;
                };
                const chaosSeries = Array.from({length: 24}, () => base * (0.5 + seededRandom() * 5));
                value = chaosSeries[i];
                break;
            case "custom":
                break;
            case "baselinePeak":
                break;
            default:
                value = [
                    150000, 130000, 110000, 100000, 100000, 110000, 170000, 300000,
                    450000, 550000, 400000, 350000, 330000, 310000, 300000,
                    320000, 350000, 370000, 330000, 250000, 200000, 170000,
                    150000, 130000
                ][i];
        }
        seriesReads.push({x: i, y: value});
        seriesWrites.push({x: i, y: value * 0.7});
    }

    if (cfg.workload === "custom") {
        decodeSeriesData();
    } else {
        cfg.seriesReads = seriesReads;
        cfg.seriesWrites = seriesWrites;
        encodeSeriesData();
    }

    if (cfg.workload === "baselinePeak") {
        cfg.seriesReads = generateData(cfg.baselineReads, cfg.peakReads, cfg.peakDurationReads);
        cfg.seriesWrites = generateData(cfg.baselineWrites, cfg.peakWrites, cfg.peakDurationWrites);
        encodeSeriesData();
    }

    chart.data.datasets[0].data = [...cfg.seriesReads];
    chart.data.datasets[1].data = [...cfg.seriesWrites];

    cfg.maxReads = Math.max(...cfg.seriesReads.map(p => p.y));
    cfg.maxWrites = Math.max(...cfg.seriesWrites.map(p => p.y));

    if (cfg.pricing === 'provisioned') {
        const op = (1 + cfg.overprovisioned / 100);
        chart.data.datasets[2].data = chart.data.datasets[0].data.map((v, i) => {
            const y = typeof v === 'object' ? v.y : v;
            return typeof v === 'object' ? {x: v.x, y: y * op} : y * op;
        });
        chart.data.datasets[3].data = chart.data.datasets[1].data.map((v, i) => {
            const y = typeof v === 'object' ? v.y : v;
            return typeof v === 'object' ? {x: v.x, y: y * op} : y * op;
        });
    } else {
        chart.data.datasets[2].data = [];
        chart.data.datasets[3].data = [];
    }

    if (cfg.pricing === 'provisioned' && (cfg.reservedReads > 0 || cfg.reservedWrites > 0)) {
        chart.data.datasets[4].data = Array(24).fill(cfg.totalReservedRCU / cfg.itemRCU) || Array(24).fill(null);
        chart.data.datasets[5].data = Array(24).fill(cfg.totalReservedWCU / cfg.itemWCU) || Array(24).fill(null);
    } else {
        chart.data.datasets[4].data = [];
        chart.data.datasets[5].data = [];
    }

    const allData = chart.data.datasets.flatMap(ds => ds.data);
    const maxY = Math.max(...allData.map(p => (typeof p === 'object' && p !== null ? p.y : p)));

    chart.options.scales.y.max = Math.ceil(maxY * 1.3 / 10000) * 10000;

    chart.update();
}

export const chart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [{
            label: 'Reads',
            data: Array(24).fill(null),
            borderColor: '#326DE6',
            borderWidth: 2,
            backgroundColor: bluePattern,
            fill: true,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            pointHitRadius: 25,
            pointRadius: 0,
            hidden: false
        }, {
            label: 'Writes',
            data: Array(24).fill(null),
            borderColor: '#FF5500',
            borderWidth: 2,
            backgroundColor: orangePattern,
            fill: true,
            tension: 0.5,
            cubicInterpolationMode: 'monotone',
            pointHitRadius: 25,
            pointRadius: 0,
            hidden: false
        }, {
            label: 'Overprovisioned Reads',
            data: Array(24).fill(null),
            borderColor: 'rgba(50,109,230,0.80)',
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
            data: Array(24).fill(null),
            borderColor: 'rgba(255,85,0,0.80)',
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
            borderDash: [3, 3],
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
            borderDash: [3, 3],
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
                    filter: function (item, chart) {
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
                        return context.dataset.label + ': ' + formatNumber(context.raw.y) + ' ops/sec';
                    },
                    afterBody: function (context) {
                        let hour = null;
                        if (context.length > 0) {
                            hour = context[0].dataIndex;
                        }
                        if (hour !== null && cfg._costs && cfg._costs.autoscale && cfg._costs.autoscale[hour]) {
                            const hourConfig = cfg._costs.autoscale[hour];
                            const lines = [' '];
                            Object.entries(hourConfig)
                                .filter(([key]) => key === 'nodes' || key === 'type' || key === 'totalOpsPerSec' || key === 'requiredVCPUs')
                                .forEach(([key, value]) => lines.push(`◦ ${key}: ${value}`));
                            return lines;
                        }
                        return [];
                    },
                    footer: (context) => {
                        let hour = null;
                        if (context.length > 0) {
                            hour = context[0].dataIndex;
                        }
                        let costLine = '';
                        if (hour !== null && cfg._costs && cfg._costs.autoscale && cfg._costs.autoscale[hour]) {
                            const cost = cfg._costs.autoscale[hour].cost;
                            if (cost !== undefined) {
                                costLine = `Cost: $${cost}/hr`;
                            }
                        }
                        return costLine ? [costLine] : [];
                    },
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
                onDragEnd: function (e, datasetIndex, index, value) {
                    // Only update for Reads (0) and Writes (1) series
                    if (datasetIndex === 0 || datasetIndex === 1) {
                        chart.data.datasets[datasetIndex].data[index] = value;
                        // Update cfg.seriesReads or cfg.seriesWrites as well
                        if (datasetIndex === 0) {
                            cfg.seriesReads[index].y = value.y !== undefined ? value.y : value;
                        } else if (datasetIndex === 1) {
                            cfg.seriesWrites[index].y = value.y !== undefined ? value.y : value;
                        }
                        encodeSeriesData();
                    }
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
