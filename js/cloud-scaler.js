function OnLoad() {
	// displaying back the selected orchestrator options
	SelectOrchestrator(document.getElementById("form-orchestrator"));
}

(function($) {
	"use strict";
	// Smooth scrolling using jQuery easing
	$('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
		if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
			if (target.length) {
				$('html, body').animate({
					scrollTop: (target.offset().top)
				}, 1000, "easeInOutExpo");
				return false;
			}
		}
	});
})(jQuery);

function Run() {
	// hiding results & displaying loading gif
	document.getElementById('form-error').style.display = "none";
	document.getElementById('results').style.display = "none";
	document.getElementById("loading-gif").style.display = "flex";

	/* FORM */
	// application
	var instanceMaxLoad = parseFloat(document.getElementById("form-instance-max-load").value);
	var instanceStartDuration = parseInt(document.getElementById("form-instance-start-duration").value);
	var minNbInstances = parseInt(document.getElementById("form-min-number-instances").value);
	// load test
	var nbUsers = parseInt(document.getElementById("form-number-users").value);
	var loadDuration = parseInt(document.getElementById("form-loadtest-duration").value);
	// computation & graphics
	var nbIterations = parseInt(document.getElementById("form-number-iterations").value);
	var nbPointSecond = parseInt(document.getElementById("form-number-point-second").value);
	var nbCoordonates = Math.ceil(loadDuration * nbPointSecond);
	
	// parsing load function
	var loadFunctions = [];
	var totalPercent = 0;
	for (var i=0; i<=loadFunctionNbRows; i++) {
		if (document.getElementById("form-loadfunction-row" + i) == null) {
			continue;
		}
		// hidding error
		document.getElementById("form-loadfunction-error-row" + i).style.display = "none";

		var loadFunction = null;
		try {
			eval("loadFunction =  " + document.getElementById("form-loadfunction-function" + i).value);
			if (typeof loadFunction !== "function") {
				LoadFunctionError(i, "Load function is not a function.");
				return FormError("Error with a load function (see above)");
			}
		} catch(e) {
			LoadFunctionError(i, "Could parse load function: " + e);
			return FormError("Error with a load function (see above)");
		}
		var userPercent = parseFloat(document.getElementById("form-loadfunction-user-percent" + i).value);

		totalPercent += userPercent;
		loadFunctions.push({percent: userPercent / 100, func: loadFunction});
	}
	if (totalPercent != 100) {
		return FormError("Load functions user percent total is not 100%.");
	}
	ChartsDesigner.DrawLoadFunctions('chart-loadfunctions', loadFunctions, nbPointSecond);
	var userLoadFunction = new UserLoadFunction(loadFunctions);

	/* COMPUTING */
	// calculating load
	var loadCoordonates = null;
	switch(document.getElementById("form-loadtest-distribution").value) {
		case "gauss":
			loadCoordonates = LoadCalculator.Gauss(nbUsers, userLoadFunction, loadDuration, nbCoordonates, nbIterations);
			break;
		case "constant":
			loadCoordonates = LoadCalculator.Constant(nbUsers, userLoadFunction, loadDuration, nbCoordonates, nbIterations);
			break;
		case "linear":
			loadCoordonates = LoadCalculator.Linear(nbUsers, userLoadFunction, loadDuration, nbCoordonates, nbIterations);
			break;
	}
	// displaying load chart
	ChartsDesigner.DrawLoadOverTime('chart-load-time', loadCoordonates);

	// orchestrators
	var rowsClass = null;
	var resultCoordonates = null;
	switch(document.getElementById("form-orchestrator").value) {
		// kubernetes 1.12
		case "kubernetes-1.12":
			var horizontalPodAutoscalerSyncPeriod = parseInt(document.getElementById("form-k8s-1-12-hpasp").value);
			var horizontalPodAutoscalerTolerance = parseFloat(document.getElementById("form-k8s-1-12-hpat").value);
			var scaleUpPercent = AutoScaler.findScaleUpPercentKubernetes_1_12(loadCoordonates, instanceMaxLoad, instanceStartDuration, minNbInstances, horizontalPodAutoscalerSyncPeriod, horizontalPodAutoscalerTolerance);

			rowsClass = "results_kubernetes-1-12";
			document.getElementById("results_kubernetes-1-12_targetAverageValue").innerHTML = Math.floor(scaleUpPercent * 1000) / 1000; // should I add instanceMaxLoad?

			resultCoordonates = Kubernetes_1_12.instancesStatusOverTime(loadCoordonates, instanceMaxLoad, scaleUpPercent, instanceStartDuration, minNbInstances, horizontalPodAutoscalerSyncPeriod, horizontalPodAutoscalerTolerance);
			break;

		default:
			return FormError("You must select an orchestrator");
	}
	// displaying orchestrator results rows
	if (rowsClass != null) {
		var rows = document.getElementsByClassName(rowsClass);
		for (var i=0; i<rows.length; i++) {
			rows[i].style.display = "block"; // back to default
		}
	}

	// displaying metrics results
	var maxNbInstances = 0;
	var maxLoadInstance = 0;
	for (var i=0; i<resultCoordonates.length; i++) {
		if (maxNbInstances < resultCoordonates[i].instancesReady) {
			maxNbInstances = resultCoordonates[i].instancesReady;
		}
		if (maxLoadInstance < resultCoordonates[i].instanceLoadPercent) {
			maxLoadInstance = resultCoordonates[i].instanceLoadPercent;
		}
	}
	document.getElementById("results_max-nb-instance").innerHTML = maxNbInstances;
	document.getElementById("results_max-instance-load").innerHTML = (Math.round(maxLoadInstance * instanceMaxLoad * 1000) / 1000) + ' (' + (Math.round(maxLoadInstance * 1000) / 10) + '%)';

	// drawing result graphs
	ChartsDesigner.DrawResults('chart-results', resultCoordonates);

	// showing results
	document.getElementById("loading-gif").style.display = "none";
	document.getElementById('results').style.display = "block";

	// scrolling to results
	(function($) {
		"use strict";
		$('html, body').animate({
			scrollTop: ($('#results').offset().top)
		}, 1000, "easeInOutExpo");
	})(jQuery);
}

/* FORM */
var loadFunctionNbRows = 0;
function LoadFunctionAddRow() {
	// searching for next row id
	var rowId = 0;
	while(true) {
		if (document.getElementById("form-loadfunction-row" + rowId) == null) {
			if (loadFunctionNbRows < rowId) {
				loadFunctionNbRows = rowId;
			}
			break;
		}
		rowId++;
	}

	// user percent
	var userPercentSpan = document.createElement("span");
	userPercentSpan.innerHTML = "Pourcentage of user: "
	var userPercentInput = document.createElement("input");
	userPercentInput.type = "number";
	userPercentInput.id = "form-loadfunction-user-percent" + rowId;
	userPercentInput.min = "0.1";
	userPercentInput.max = "100";
	userPercentInput.step = "0.1";
	userPercentInput.value = "10";
	var userPercentPercentSpan = document.createElement("span");
	userPercentPercentSpan.innerHTML = "%"
	var userPercent = document.createElement("div");
	userPercent.className = "col-lg-3";
	userPercent.appendChild(userPercentSpan);
	userPercent.appendChild(userPercentInput);
	userPercent.appendChild(userPercentPercentSpan);

	// function label
	var functionSpan = document.createElement("span");
	functionSpan.innerHTML = "JavaScript function:"
	var functionSpanCol = document.createElement("div");
	functionSpanCol.className = "col-lg-2";
	functionSpanCol.appendChild(functionSpan);
	// function textarea
	var functionTextarea = document.createElement("textarea");
	functionTextarea.className = "form-control";
	functionTextarea.id = "form-loadfunction-function" + rowId;
	functionTextarea.innerHTML = "function(time) {return 0;}";
	var functionCol = document.createElement("div");
	functionCol.className = "col-lg-6";
	functionCol.appendChild(functionTextarea);

	// buttons
	var buttonRemove = document.createElement("input");
	buttonRemove.type = "button";
	buttonRemove.className = "btn btn-secondary";
	buttonRemove.setAttribute("onclick", "LoadFunctionRemoveRow(" + rowId + ");");
	buttonRemove.value = "-";
	var buttonsCol = document.createElement("div");
	buttonsCol.className = "col-lg-1 text-center";
	buttonsCol.appendChild(buttonRemove);

	// row
	var row = document.createElement("div");
	row.className = "row loadfunction";
	row.id = "form-loadfunction-row" + rowId;
	row.appendChild(userPercent);
	row.appendChild(functionSpanCol);
	row.appendChild(functionCol);
	row.appendChild(buttonsCol);

	// error row
	var errorSpan = document.createElement("span");
	errorSpan.id = "form-loadfunction-error" + rowId;
	errorSpan.className = "error";
	var errorDiv = document.createElement("div");
	errorDiv.className = "col-lg-12";
	errorDiv.appendChild(errorSpan)
	var errorRow = document.createElement("div");
	errorRow.id = "form-loadfunction-error-row" + rowId;
	errorRow.className = "row error-row";
	errorRow.appendChild(errorDiv);

	// displaying HTML
	document.getElementById("form-loadfunction-rows").appendChild(errorRow);
	document.getElementById("form-loadfunction-rows").appendChild(row);
}

function LoadFunctionRemoveRow(rowIndex) {
	RemoveHTML('form-loadfunction-error-row' + rowIndex);
	RemoveHTML('form-loadfunction-row' + rowIndex);
}

function LoadFunctionError(rowIndex, error) {
	document.getElementById("form-loadfunction-error" + rowIndex).innerHTML = "<i class=\"fas fa-bug warning\"></i> &darr; " + error;
	document.getElementById("form-loadfunction-error-row" + rowIndex).style.display = "flex";
	// removing loading gif
	document.getElementById("loading-gif").style.display = "none";
	return false;
}

function FormError(error) {
	document.getElementById('form-error').innerHTML = "<i class=\"fas fa-bug warning\"></i> " + error;
	document.getElementById('form-error').style.display = "block";
	// removing loading gif
	document.getElementById("loading-gif").style.display = "none";
	return false;
}

function SelectOrchestrator(selectElement) {
	// undisplay every rows
	["kubernetes-1-12"].forEach(element => {
		var rows = document.getElementsByClassName(element);
		for (var i=0; i<rows.length; i++) {
			rows[i].style.display = "none";
		}
	});

	// selecting rows to display
	var rowsClass = null;
	switch (selectElement.value) {
		case "kubernetes-1.12": rowsClass = "kubernetes-1-12";
			break;

		default: break;
	}

	// displaying rows
	var rows = document.getElementsByClassName(rowsClass);
	for (var i=0; i<rows.length; i++) {
		rows[i].style.display = "flex"; // back to default
	}
}

function ResetForm() {
	SelectOrchestrator(document.getElementById("form-orchestrator"));
	document.getElementById("loading-gif").style.display = "none";
	document.getElementById('results').style.display = "none";
}

/* COMMON */
function RemoveHTML(id) {
	var elem = document.getElementById(id);
	elem.parentNode.removeChild(elem);
	return false;
}

function RandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}