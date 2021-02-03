const ctx = document.getElementById('myChart');
let chart;

main();
setInterval(main, 1000 * 60 * 5); // reload data every 5 min

window.addEventListener("hashchange", main);

async function main() {
    let data = await (await fetch(`./data.json?cacheBust=${+(new Date())}`)).json();

    const now = moment();
    let other;
    const hash = window.location.hash;

    document.querySelectorAll('.links a').forEach((node) => node.classList.remove('selected'));
    hash && document.querySelectorAll(`.links a[href=${CSS.escape(hash)}]`).forEach((node) => node.classList.add('selected'));

    switch (hash) {
        case "#today":
            data = data.filter(({ time }) => now.isSame(time, 'day'));
            break;
        case "#24":
            other = moment(now).add(-1, 'day');
            data = data.filter(({ time }) => moment(time).isBetween(other, now));
            break;
        case "#week":
            other = moment(now).add(-7, 'day');
            data = data.filter(({ time }) => moment(time).isBetween(other, now));
            break;
        case "#month":
            other = moment(now).add(-30, 'day');
            data = data.filter(({ time }) => moment(time).isBetween(other, now));
            break;
        default:
    }

    data = data.reduce((arr, item, idx, items) => { // fill gaps if greater then 10min
        if (idx === 0) {
            arr.push(item);
            return arr;
        }
        const m1 = moment(item.time);
        const m2 = moment(items[idx - 1].time);
        const diff = m1.diff(m2, 'minutes');
        if (diff < 20) {
            arr.push(item);
            return arr;
        }
        for (let i = 5; i < diff; i += 5) {
            arr.push({
                ...item,
                time: moment(m2).add(i, 'minutes').toISOString(),
                currentTemperature: null
            });
        }
        arr.push(item);
        return arr;
    }, []);

    chart && chart.destroy();

    chart = window.c = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(({ time }) => time),
            datasets: [
                {
                    data: data.map(({ currentTemperature, status }, i, items) => status === 'on' || (items[i + 1] && items[i + 1].status === 'on') ? currentTemperature : null),
                    label: "Current (on)",
                    borderColor: "red",
                    fill: false,
                    yAxisID: 'A',
                    pointRadius: 0,
                    lineTension: 0.1
                },
                {
                    data: data.map(({ currentTemperature, status }, i, items) => status === 'off' || (items[i + 1] && items[i + 1].status === 'off') ? currentTemperature : null),
                    label: "Current (off)",
                    borderColor: "#3e95cd",
                    fill: false,
                    yAxisID: 'A',
                    pointRadius: 0,
                    lineTension: 0.1
                },
                {
                    data: data.map(({ targetTemperature }) => targetTemperature),
                    label: "Target",
                    borderColor: "#6fd66f",
                    fill: false,
                    yAxisID: 'A',
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    data: data.map(({ targetTemperature }) => targetTemperature - 0.5),
                    label: "Target min",
                    borderColor: "#a5e6a5",
                    fill: false,
                    yAxisID: 'A',
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    data: data.map(({ targetTemperature }) => targetTemperature + 0.5),
                    label: "Target max",
                    borderColor: "#a5e6a5",
                    fill: false,
                    yAxisID: 'A',
                    pointRadius: 0,
                    borderWidth: 1
                }/*,
                {
                    data: data.map(({ status }) => status === 'on' ? 1 : (status === 'off' ? -1 : 0)),
                    //data: data.map(() => Math.random() > 0.5 ? 1 : -1),
                    label: "Status",
                    // backgroundColor: "green",
                    //type: 'bar',
                    yAxisID: 'B'
                }*/
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                labels: {
                    filter: ({ datasetIndex }) => datasetIndex < 3
                }
            },
            scales: {
                yAxes: [
                    {
                        id: 'A',
                        type: 'linear',
                        position: 'left',
                        ticks: {
                        }
                    }/*,
                    {
                        id: 'B',
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            stepSize: 2,
                            min: -1, max: 1,
                            callback: function (value, index, values) {
                                return value === 1 ? 'On' : (value === -1 ? 'Off' : '');
                            }
                        }
                    }*/
                ],
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            // minute: 'H:mm - D.M.YY'
                            minute: 'H:mm'
                        }
                    }
                }]
            },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        rangeMin: { x: data.length && +(new Date(data[0].time)) },
                        rangeMax: { x: data.length && +(new Date(data[data.length - 1].time)) },
                        speed: 20,
                        threshold: 10
                    },
                    zoom: {
                        enabled: true,
                        drag: false,
                        mode: 'x',
                        rangeMin: { x: data.length && +(new Date(data[0].time)) },
                        rangeMax: { x: data.length && +(new Date(data[data.length - 1].time)) },
                        speed: 0.1,
                        threshold: 2,
                        sensitivity: 3,
                    }
                }
            },
            annotation: {
                drawTime: 'afterDatasetsDraw',
                annotations: data
                    .map(({ time }) => new Date(time))
                    .filter((date, i, items) => i === 0 || date.getDate() != items[i - 1].getDate())
                    .map((date) => ({
                        type: 'line',
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: +date,
                        borderColor: "#aaa",
                        borderWidth: 1,
                        label: {
                            content: moment(date).format("D. M. YYYY"),
                            enabled: true,
                            position: "top",
                            backgroundColor: '#aaa',
                            font: {
                                size: 12,
                                style: "normal",
                                // Font color of text, default below
                                color: '#123456',
                            },
                            xPadding: 4,
                            yPadding: 4,
                            cornerRadius: 2,
                            xAdjust: 0,
                            yAdjust: 5
                        }
                    }))
            }

        }
    });
}