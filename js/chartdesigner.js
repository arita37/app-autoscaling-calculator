/* charts designer */
class ChartsDesigner {
	static DrawLoadOverTime(canvasId, coordonates) {
		new Chart(document.getElementById(canvasId).getContext('2d'), {
			type: 'line',
			data: {
				labels: coordonates.map(e => e.x),
				datasets: [{
					type: 'line',
					label: 'Total load',
					borderColor: '#e49d23',
					backgroundColor: '#e49d23',
					borderWidth: 2,
					fill: false,
					data: coordonates.map(e => Math.round(e.y * 10) / 10)
				}]
			},
			options: {
				title: {
					display: true,
					text: 'Total load over time'
				},
				legend: {
					position: "bottom",
				},
				tooltips: {
					mode: 'index',
					intersect: true
				},
				scales: {
					xAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Time (seconds)'
						},
						min: 0
					}],
					yAxes: [{
						type: 'linear',
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Number of instances'
						},
						min: 0
					}]
				}
			}
		});
	}
	
	static DrawResults(canvasId, results) {
		// number of instances
		var instancesLoadPercentData = results.map(e => Math.round(e.instanceLoadPercent * 1000) / 10);
		var instancesReadyData = [{"x": results[0].time, "y": results[0].instancesReady}]
		var instancesTotalData = [{"x": results[0].time, "y": results[0].instancesWaiting.length}]
		for (var i=1; i<results.length; i++){
			if ((instancesTotalData[instancesTotalData.length-1].y != results[i].instancesWaiting.length) || (instancesReadyData[instancesReadyData.length-1].y != results[i].instancesReady)) {
				if (results[i-1].time != instancesTotalData[instancesTotalData.length-1].x) { // adding previous point to have stair curve
					instancesTotalData.push({"x": results[i-1].time, "y": results[i-1].instancesWaiting.length});
					instancesReadyData.push({"x": results[i-1].time, "y": results[i-1].instancesReady});
				}
				instancesTotalData.push({"x": results[i].time, "y": results[i].instancesWaiting.length});
				instancesReadyData.push({"x": results[i].time, "y": results[i].instancesReady});
			}
		}
		// adding last point
		if (instancesReadyData[instancesReadyData.length-1].x != results[results.length-1].time) {
			instancesTotalData.push({"x": results[results.length-1].time, "y": results[results.length-1].instancesWaiting.length});
			instancesReadyData.push({"x": results[results.length-1].time, "y": results[results.length-1].instancesReady});
		}

		// parsing labels
		new Chart(document.getElementById(canvasId).getContext('2d'), {
			type: 'line',
			data: {
				labels: results.map(e => e.time),
				datasets: [{
					type: 'line',
					label: 'Instances ready',
					borderColor: '#20445f',
					backgroundColor: '#20445f',
					borderWidth: 2,
					yAxisID: 'y-instances',
					stack: 'nbInstances',
					lineTension: 0,
					fill: false,
					data: instancesReadyData
				},{
					type: 'line',
					label: 'Instances waiting (stacked)',
					borderColor: '#aecff0',
					backgroundColor: '#aecff0',
					borderWidth: 2,
					yAxisID: 'y-instances',
					stack: 'nbInstances',
					lineTension: 0,
					fill: false,
					data: instancesTotalData
				},{
					type: 'line',
					label: 'Load per instance (right axis)',
					borderColor: '#e49d23',
					backgroundColor: '#e49d23',
					borderWidth: 2,
					yAxisID: 'y-percent',
					stack: 'loadInstance',
					fill: false,
					data: results.map(e => Math.round(e.instanceLoadPercent * 1000) / 10)
				}]
			},
			options: {
				title: {
					display: true,
					text: 'Number of instances & load per instance over time'
				},
				legend: {
					position: "bottom",
				},
				tooltips: {
					mode: 'index',
					intersect: true
				},
				scales: {
					xAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Time (seconds)'
						},
						min: 0
					}],
					yAxes: [{
						type: 'linear',
						display: true,
						position: 'left',
						id: 'y-instances',
						stacked: true,
						scaleLabel: {
							display: true,
							labelString: 'Number of instances'
						},
						min: 0
					}, {
						type: 'linear',
						display: true,
						position: 'right',
						id: 'y-percent',
						gridLines: {
							drawOnChartArea: false
						},
						scaleLabel: {
							display: true,
							labelString: 'Instance load %'
						},
						min: 0,
						max: 100
					}]
				}
			}
		});
	}
}
