import {cfg} from './config.js';
import {formatNumber} from "./utils.js";

const ctx = document.getElementById('chart').getContext('2d');

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
                        family: "'Roboto Flex', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                        size: 15, 
                        weight: 'normal'
                    }
                },
                min: 1000,
                max: (cfg.peakReads + cfg.peakWrites) * 2,
                ticks: {
                    color: '#616D87', // Tick text color
                    font: {
                        family: "'Roboto Flex', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", 
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

let chartConfiguration = {
    type: "line",
    options: {
        plugins: {
            datalabels: {
                display: false
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
                    text: "← ops/sec →"
                }
            }
        },
    },
    data: {
        labels: [...Array(24).keys()].map(h => `${h}:00`),
        datasets: [
            {
                label: "Actual ops/sec",
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
            },
            {
                label: "Planned ops/sec",
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
            }
        ],
    },
};

window.isPluginLoaded = false;

window.setupChart = function setupChart(options) {
    const {
        disablePlugin,
        draggableAxis,
        roundingPrecision,
        renderOnHoverCirclesTrail = false,
    } = options;

    let onDrag = undefined;

    function onPluginScriptLoaded() {
        if (!window.isPluginLoaded) console.log("Plugin script loaded");
        window.isPluginLoaded = true;

        const bothAxesDraggable = draggableAxis === "both",
            xAxisDraggable =
                !draggableAxis || bothAxesDraggable || draggableAxis === "x",
            yAxisDraggable = bothAxesDraggable || draggableAxis === "y";

        function drawDragMarker(e) {
            // demo environment stub
        }

        const configuration = _.merge(
            {
                options: {
                    animation: true,
                    plugins: {
                        dragData: disablePlugin
                            ? false
                            : {
                                dragX: false,
                                dragY: true,
                                round: roundingPrecision,
                                showTooltip: true,
                                onDragStart: function (e) {
                                    if (renderOnHoverCirclesTrail) drawDragMarker(e);
                                },
                                onDrag: function (...args) {
                                    const [e] = args;
                                    if (e.target?.style)
                                        e.target.style.cursor = "grabbing";

                                    onDrag?.(...args);
                                    if (renderOnHoverCirclesTrail) drawDragMarker(e);
                                },
                                onDragEnd: function (e) {
                                    if (e.target?.style)
                                        e.target.style.cursor = "default";

                                    if (renderOnHoverCirclesTrail) drawDragMarker(e);
                                },
                            },
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
                },
            },
            {
                ...chartConfiguration,
                options: {
                    ...chartConfiguration.options,
                    plugins: {
                        ...(chartConfiguration.options.plugins ?? {}),
                        datalabels: {
                            ...(chartConfiguration.options.plugins?.datalabels ?? {}),
                            ...(chartConfiguration.options.plugins?.datalabels?.display
                                ? {
                                    formatter: function (value, context) {
                                        return (
                                            dateFns.differenceInDays(value[1], value[0]) + "d"
                                        );
                                    },
                                }
                                : {}),
                        },
                    },
                },
                data: {
                    ...chartConfiguration.data,
                    ...(chartConfiguration.scales?.x?.type === "time"
                        ? {
                            datasets: chartConfiguration.data.datasets.map((d) => ({
                                ...d,
                                data: d.data.map((darr) =>
                                    darr.map((date) => new Date(date)),
                                ),
                            })),
                        }
                        : {}),
                },
            },
        );

        var ctx = document
            .getElementById("chartReal")
            .getContext("2d");
        Chart.register(ChartDataLabels);

        window.testedChart = new Chart(ctx, configuration);

        let originalTestedChartData = _.cloneDeep(window.testedChart.data);
        window.resetData = function resetData() {
            console.log(
                "[resetData] Resetting data to original data passed to setupChart()",
                originalTestedChartData,
            );

            window.testedChart.data = _.cloneDeep(originalTestedChartData);
            window.testedChart.update("none");
        };

        function updateSummaryTable() {
            const actual = window.testedChart.data.datasets[0].data.map(d => d.y);
            const planned = window.testedChart.data.datasets[1].data.map(d => d.y);

            const totalActual = _.sum(actual);
            const totalPlanned = _.sum(planned);
            const delta = totalPlanned - totalActual;

            const formatOps = v => (v >= 1_000_000 ? (v / 1_000_000).toFixed(2) + "M" : (v / 1000).toFixed(0) + "K");

            let warnings = [];
            for (let i = 0; i < 24; i++) {
                if (actual[i] > planned[i]) warnings.push(`Time ${i.toString().padStart(2, "0")}00: underprovisioned (actual ${formatOps(actual[i])} > planned ${formatOps(planned[i])})`);
                if (planned[i] > actual[i] * 1.5) warnings.push(`Time ${i.toString().padStart(2, "0")}00: overprovisioned (planned ${formatOps(planned[i])} >> actual ${formatOps(actual[i])})`);
            }

            document.getElementById("summaryTable").innerHTML = `
          <div class="mui-container">
            <table class="mui-table mui-table--bordered">
              <thead>
                <tr><th></th><th>Workload total ops/sec</th></tr>
              </thead>
              <tbody>
                <tr><td>Actual</td><td style="text-align: right;">${formatOps(totalActual)}</td></tr>
                <tr><td>Planned</td><td style="text-align: right;">${formatOps(totalPlanned)}</td></tr>
                <tr><td>Delta</td><td style="text-align: right;">${formatOps(delta)}</td></tr>
              </tbody>
            </table>
            <div style="margin-top: 1em; color: ${warnings.length ? "red" : "green"};">
              ${warnings.length ? `<strong>Warnings:</strong><ul>${warnings.map(w => `<li>${w}</li>`).join("")}</ul>` : "<strong>No issues detected.</strong>"}
            </div>
          </div>
        `;
        }

        updateSummaryTable();

        window.updateSummaryTable = updateSummaryTable;

        function applyWorkload(pattern) {
            const base = 100000;
            window.testedChart.options.scales.y.max = 1_000_000;
            const data = [];

            for (let i = 0; i < 24; i++) {
                let actual = base;

                switch (pattern) {
                    case "dailyPeak":
                        actual = i === 9 ? base * (4.5 + Math.random()) : base + (Math.random() * base * 0.1);
                        break;
                    case "twiceDaily":
                        actual = (i === 9 || i === 18) ? base * (3.5 + Math.random()) : base + (Math.random() * base * 0.1);
                        break;
                    case "batch":
                        actual = (i >= 0 && i <= 3) ? base * 6 : base;
                        break;
                    case "sawtooth":
                        actual = base + (i % 6) * base * 0.5;
                        break;
                    case "bursty":
                        actual = (Math.random() < 0.3) ? base * (5 + Math.random() * 5) : base;
                        break;
                    case "rampUp":
                        actual = base + (i * (base * 9 / 23));
                        break;
                    case "rampDown":
                        actual = base * (1 - i / 24);
                        break;
                    case "flatline":
                        actual = base;
                        break;
                    case "sinusoidal":
                        actual = base + base * Math.sin((i / 12) * 2 * Math.PI);
                        break;
                    case "diurnal":
                        actual = 400000 + Math.cos((i - 12) * Math.PI / 12) * 400000 * 0.9;
                        break;
                    case "nocturnal":
                        actual = 400000 + Math.cos((i) * Math.PI / 12) * 400000 * 0.9;
                        break;
                    case "mountain":
                        actual = base + Math.max(0, (12 - Math.abs(i - 12)) * (base / 2));
                        break;
                    case "valley":
                        actual = Math.max(0, base * 4 - Math.max(0, (12 - Math.abs(i - 12)) * (base / 2)));
                        break;
                    case "chaos":
                        actual = base * (0.5 + Math.random() * 5);
                        break;
                    default:
                        actual = [
                            150000, 130000, 110000, 100000, 100000, 110000, 170000, 300000,
                            450000, 550000, 400000, 350000, 330000, 310000, 300000,
                            320000, 350000, 370000, 330000, 250000, 200000, 170000,
                            150000, 130000
                        ][i];
                }

                data.push({x: i, y: actual});
            }

            window.testedChart.data.datasets[0].data = data;
            window.testedChart.data.datasets[1].data = data.map(d => ({x: d.x, y: d.y * 1.25}));
            window.testedChart.update();
            updateSummaryTable();
        }

        window.applyWorkload = applyWorkload;

        document.getElementById("workloadSelect").addEventListener("change", function () {
            applyWorkload(this.value);
        });

        window.testedChart.options.plugins.dragData.onDragEnd = function (e) {
            if (e.target?.style) e.target.style.cursor = "default";
            if (renderOnHoverCirclesTrail) drawDragMarker(e);
            updateSummaryTable();
        };
    }

    if (window.isPluginLoaded) {
        onPluginScriptLoaded();
    } else {

    }
};

document.getElementById("workloadSelect").addEventListener("change", function () {
    // Update the pattern param in the URL without reloading
    const url = new URL(window.location);
    url.searchParams.set("pattern", this.value);
    window.history.replaceState({}, '', url);
});

document.getElementById("saveCsvBtn").addEventListener("click", function () {
    const chart = window.testedChart;
    const labels = chart.data.labels;
    const datasets = chart.data.datasets;
    const pattern = document.getElementById("workloadSelect").value || "workload";

    let csv = "Hour,Actual ops/sec,Planned ops/sec\n";
    for (let i = 0; i < labels.length; i++) {
        const hour = labels[i];
        const actual = (datasets[0].data[i]?.y).toFixed(0);
        const planned = (datasets[1].data[i]?.y).toFixed(0);
        csv += `${hour},${actual},${planned}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pattern}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Add after setupChart is called and chart is initialized
document.addEventListener('DOMContentLoaded', function () {
    const chartCanvas = document.getElementById('chartJSContainer');
    const chartRect = chartCanvas.getBoundingClientRect();

    // Create overlay for y-axis drag
    const yAxisOverlay = document.createElement('div');
    yAxisOverlay.style.position = 'absolute';
    yAxisOverlay.style.left = (chartRect.left - chartCanvas.offsetLeft) + 'px';
    yAxisOverlay.style.top = (chartRect.top - chartCanvas.offsetTop) + 'px';
    yAxisOverlay.style.width = '40px'; // adjust as needed for y-axis width
    yAxisOverlay.style.height = chartRect.height + 'px';
    yAxisOverlay.style.cursor = 'ns-resize';
    yAxisOverlay.style.zIndex = 10;
    yAxisOverlay.style.background = 'rgba(0,0,0,0)';
    yAxisOverlay.id = 'yAxisDragOverlay';

    chartCanvas.parentElement.style.position = 'relative';
    chartCanvas.parentElement.appendChild(yAxisOverlay);

    let dragging = false;
    let startY = 0;
    let startData = [];

    yAxisOverlay.addEventListener('mousedown', function (e) {
        dragging = true;
        startY = e.clientY;
        // Save original data
        startData = window.testedChart.data.datasets.map(ds =>
            ds.data.map(point => ({ ...point }))
        );
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        const chart = window.testedChart;
        const yScale = chart.scales.y;
        const deltaPx = e.clientY - startY;
        // Convert pixel delta to value delta
        const valueDelta = yScale.getValueForPixel(yScale.top) - yScale.getValueForPixel(yScale.top + deltaPx);

        // Find current max y value in all datasets
        const allY = chart.data.datasets.flatMap(ds => ds.data.map(point => point.y));
        const currentMax = Math.max(...allY);
        // Set y.max to 1.25x the current max
        chart.options.scales.y.max = currentMax * 1.25;

        chart.data.datasets.forEach((ds, i) => {
            ds.data = startData[i].map(point => ({
                ...point,
                y: Math.max(0, point.y + valueDelta)
            }));
        });
        chart.update('none');
    });

    window.addEventListener('mouseup', function () {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.testedChart.update();
            updateSummaryTable();
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById("chartReal");
    const ctx = canvas.getContext("2d");

    const urlSearchParams = new URLSearchParams(window.location.search);
    const workload = urlSearchParams.get("workload");

    if (workload) {
        const select = document.getElementById("workloadSelect");
        if ([...select.options].some(opt => opt.value === workload)) {
            select.value = workload;
            cfg.workload = workload;
        }
    } else {
        // Default to "workload" if no pattern is specified
        const select = document.getElementById("workloadSelect");
        select.value = "default";
    }

    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const actualData = [
        150000, 130000, 110000, 100000, 100000, 110000, 170000, 300000,
        450000, 550000, 400000, 350000, 330000, 310000, 300000,
        320000, 350000, 370000, 330000, 250000, 200000, 170000,
        150000, 130000
    ];
    const plannedData = actualData.map(v => v * 1.25);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: "Actual ops/sec",
                    data: actualData,
                    fill: true,
                    backgroundColor: orangePattern,
                    borderColor: "rgba(255, 85, 0, 1)",
                    tension: 0.4
                },
                {
                    label: "Planned ops/sec",
                    data: plannedData,
                    fill: true,
                    backgroundColor: bluePattern,
                    borderColor: "rgba(50, 109, 230, 1)",
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Hour of Day"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Ops/sec"
                    },
                    beginAtZero: false
                }
            }
        }
    });

    if (workload) {
        setTimeout(() => {
            const select = document.getElementById("workloadSelect");
            select.dispatchEvent(new Event("change"));
        }, 500);
    }
});


console.log("Rendering chartReal with config:", chartConfiguration);