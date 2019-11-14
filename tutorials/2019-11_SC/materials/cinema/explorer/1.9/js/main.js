/*
A general Parallel Coordinates-based viewer for Spec-D cinema databases 

Copyright 2017 Los Alamos National Laboratory 

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this 
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, 
   this list of conditions and the following disclaimer in the documentation 
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors 
   may be used to endorse or promote products derived from this software 
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

//Init variables
var databaseInfo;//An array of the databases as defined in databases.json
var currentDbInfo //Info for the currently selected database as defined in databases.json
var currentDb;//The currently loaded database (as CINEMA_COMPONENTS.Database instance)
var hasAxisOrdering = false; //whether or not the currentDb has extra axis ordering data
var databaseFile = 'cinema/explorer/1.9/databases.json' //this can be overriden with HTTP params

var loaded = false;

//Components
var pcoord;//The Parallel Coordinates Chart
var view; //The component for viewing selected results
var query; //The component for querying results

//View type enum
var viewType = Object.freeze({
	IMAGESPREAD: 0,
	SCATTERPLOT: 1
});
var currentView = viewType.IMAGESPREAD;

//save last-used dimensions on scatter plot between tab switches
var savedDimensions = {};

//Pcoord type enum
var pcoordType = Object.freeze({
	SVG: 0,
	CANVAS: 1
})
var currentPcoord = pcoordType.SVG;

//State of the slideOut Panel
var slideOutOpen = false;

// ---------------------------------------------------------------------------
// Parse arguments that come in through the URL
// ---------------------------------------------------------------------------

// @TODO:
// Javascript has some built in methods parsing HTTP parameters, maybe we should use those?
var url = window.location.href;
var urlArgs = url.split('?');

if (urlArgs.length > 1) {
    var urlArgPairs = urlArgs[1].split('&');

    // go through all the pairs, and if you find something you expect, deal with it
    for (var i in urlArgPairs) {
        var kvpair = urlArgPairs[i].split('=');

        // now look for the values you expect, and do something with them
        if (kvpair[0] == 'databases') {
            databaseFile = kvpair[1]; 
        }
    }
}

//Load database file and register databases into the database selection
//then load the first one
var jsonRequest = new XMLHttpRequest();
jsonRequest.open("GET",databaseFile,true);
jsonRequest.onreadystatechange = function() {
	if (jsonRequest.readyState === 4) {
		if (jsonRequest.status === 200 || jsonRequest.status === 0) {
			databaseInfo = JSON.parse(jsonRequest.responseText);
			d3.select('#database').selectAll('option')
				.data(databaseInfo)
				.enter().append('option')
					.attr('value',function(d,i){return i;})
					.text(function(d) {
						return d.name ? d.name: d.directory;
					});
			load();
		}
	}
}
jsonRequest.send(null);

//init margins and image size
updateViewContainerSize();

//Set up dragging on the resize bar
var resizeDrag = d3.drag()
	.on('start', function() {
		d3.select(this).attr('mode', 'dragging');
	})
	.on('drag', function() {
		var headerRect = d3.select('#header').node().getBoundingClientRect();
		d3.select('#pcoordArea').style('height',(d3.event.y - headerRect.height)+'px');
		updateViewContainerSize();
		if (loaded) {
			pcoord.updateSize();
			view.updateSize();
		}
	})
	.on('end', function() {
		d3.select(this).attr('mode', 'default');
	});
d3.select('#resizeBar').call(resizeDrag);

//Resize chart and update margins when window is resized
window.onresize = function(){
	updateViewContainerSize();
	if (loaded) {
		pcoord.updateSize();
		view.updateSize();
	}
};

//*********
//END MAIN THREAD
//FUNCTION DEFINITIONS BELOW
//*********

/**
 * Set the current database to the one selected in the database selection
 * and load it, rebuilding all components
 */
function load() {
	loaded = false;
	savedDimensions = {};

	//Remove old components
	if (window.pcoord) {pcoord.destroy();}
	if (window.view) {view.destroy();}
	if (window.query) {query.destroy();}

	//Remove axisOrdering panel if it exists
	if (hasAxisOrdering) {
		d3.select('#axisOrderPanel').remove();
	}
	hasAxisOrdering = false;

	currentDbInfo = databaseInfo[d3.select('#database').node().value];
	//Init Database
	//Will call doneLoading if succesful, otherwise wil call loadingError
	currentDb = new CINEMA_COMPONENTS.Database(
		currentDbInfo.directory,
		doneLoading,
		loadingError,
		currentDbInfo.query);
}

/**
 * Called if an error was found when loading the database
 */
function loadingError(error) {
	window.alert(error);
}

/**
 * Called when a database finishes loading.
 * Builds components
 * and sets up event listeners
 */
function doneLoading() {
	loaded = true;

	//Build pcoord
	//Use a PcoordCanvas for larger datasets to prevent slowdown
	if (currentDb.data.length > 300) {
		currentPcoord = pcoordType.CANVAS;
		window.alert("This database is very large. The viewer will switch to a faster "+
			"version of components. Some functionality may be unavailable.");
		pcoord = new CINEMA_COMPONENTS.PcoordCanvas(d3.select('#pcoordContainer').node(),
			currentDb,
			currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter));
	}
	else {
		currentPcoord = pcoordType.SVG;
		pcoord = new CINEMA_COMPONENTS.PcoordSVG(d3.select('#pcoordContainer').node(),
			currentDb,
			currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter));
	}
	//Set initial state of smoothPaths according to status of smoothLines checkbox
	pcoord.smoothPaths = d3.select('#smoothLines').node().checked;
	if (!pcoord.smoothPaths)
		pcoord.redrawPaths();//redraw if smoothPaths should be false

	//Build view depending on selected viewType
	if (currentView == viewType.IMAGESPREAD)
		view = new CINEMA_COMPONENTS.ImageSpread(d3.select('#viewContainer').node(),currentDb);
	else if (currentView == viewType.SCATTERPLOT) {
		//Use either an SVG or a Canvas Scatter Plot depending on pcoordType
		if (currentPcoord == pcoordType.SVG)
			view = new CINEMA_COMPONENTS.ScatterPlotSVG(d3.select('#viewContainer').node(),currentDb,
				currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter));
		else
			view = new CINEMA_COMPONENTS.ScatterPlotCanvas(d3.select('#viewContainer').node(),currentDb,
				currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter));
	}

	//Build Query panel
	query = new CINEMA_COMPONENTS.Query(d3.select('#queryContainer').node(),currentDb);

	//When selection in pcoord chart changes, set readout
	//and update view component
	pcoord.dispatch.on('selectionchange',function(selection) {
		d3.select('#selectionStats')
			.text(selection.length+' out of '+currentDb.data.length+' results selected');
		view.setSelection(selection);
	});

	//Set mouseover handler for pcoord and views component
	pcoord.dispatch.on("mouseover",handleMouseover);
	view.dispatch.on('mouseover',handleMouseover);

	//If the view is a Scatter Plot, set listeners to save dimensions when they are changed
	if (currentView == viewType.SCATTERPLOT) {
		view.dispatch.on('xchanged',function(d){savedDimensions.x = d;});
		view.dispatch.on('ychanged',function(d){savedDimensions.y = d;});
	}

	//Set styles for query data
	//Style is interpreted differently by SVG and Canvas components
	if (currentPcoord == pcoordType.SVG) {
		query.custom.style = "stroke-dasharray:20,7;stroke-width:3px;stroke:red";
		query.lower.style = "stroke-dasharray:initial;stroke-width:2px;stroke:pink;";
		query.upper.style = "stroke-dasharray:initial;stroke-width:2px;stroke:pink;";
	}
	else {
		query.custom.style = {lineWidth:3,strokeStyle:'red',lineDash:[20,7]};
		query.lower.style = {lineWidth:2,strokeStyle:'pink'};
		query.upper.style = {lineWidth:2,strokeStyle:'pink'};
	}
	//Add query data as overlays to pcoord chart
	pcoord.setOverlayPaths([query.custom,query.upper,query.lower]);

	//Set pcoord chart to repond to change in query data
	query.dispatch.on('customchange',function(newData) {
		pcoord.redrawOverlayPaths();
	});

	//Set pcoord query to respond to a query
	query.dispatch.on('query',function(results) {
		pcoord.setSelection(results);
	})

	//Update size now that components are built
	updateViewContainerSize();
	view.updateSize();

	//Trigger initial selectionchange event
	pcoord.dispatch.call('selectionchange',pcoord,pcoord.selection.slice());

	//Build the axis ordering panel if the database has additional axis order data
	if (currentDb.hasAxisOrdering) {
		hasAxisOrdering = true;
		buildAxisOrderPanel();
	}

	//If we defined a pre-set selection, set it in the pcoord chart
	if (currentDbInfo.selection) {
		pcoord.filterSelection(currentDbInfo.selection)
	}
}

/**
 * Open or close the slideOut Panel
 */
function toggleShowHide() {
	slideOutOpen = !slideOutOpen;
	if (slideOutOpen) { //slide out
		d3.select('#slideOut').transition()
			.duration(500)
			.style('width','500px')
			.on('start',function(){
				d3.select('#slideOutContents').style('display','initial');
				pcoord.setOverlayPaths([query.custom,query.upper,query.lower]);
			})
			.on('end',function() {
				query.updateSize();
			});
		d3.select('#pcoordArea').transition()
			.duration(500)
			.style('padding-left','500px')
			.on('end',function(){pcoord.updateSize();})
		d3.select('#showHideLabel').text('<');
	}
	else { //slide in
		d3.select('#slideOut').transition()
			.duration(500)
			.style('width','25px')
			.on('start',function(){
				pcoord.setOverlayPaths([]);
			})
			.on('end',function(){
				d3.select('#slideOutContents').style('display','hidden');
				query.updateSize();
			});
		d3.select('#pcoordArea').transition()
			.duration(500)
			.style('padding-left','25px')
			.on('end',function(){pcoord.updateSize();})
		d3.select('#showHideLabel').text('>');
	}

}

/**
 * Change the view component to the specified viewType
 * Called by clicking one of the tabs
 */
function changeView(type) {
	if (loaded && type != currentView) {
		currentView = type;
		view.destroy();//destroy current view
		//Build ImageSpread if Image Spread tab is selected
		if (currentView == viewType.IMAGESPREAD) {
			view = new CINEMA_COMPONENTS.ImageSpread(d3.select('#viewContainer').node(),currentDb);
			//change selected tab
			d3.select('#imageSpreadTab').attr('selected','selected');
			d3.select('#scatterPlotTab').attr('selected','default');
		}
		//Build ScatterPlot if Scatter Plot tab is selected
		else if (currentView == viewType.SCATTERPLOT) {
			//Build either SVG or Canvas ScatterPlot depending on pcoordType
			if (currentPcoord == pcoordType.SVG)
				view = new CINEMA_COMPONENTS.ScatterPlotSVG(d3.select('#viewContainer').node(),currentDb,
					currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter));
			else
				view = new CINEMA_COMPONENTS.ScatterPlotCanvas(d3.select('#viewContainer').node(),currentDb,
					currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter));
			//change selected tab
			d3.select('#scatterPlotTab').attr('selected','selected');
			d3.select('#imageSpreadTab').attr('selected','default');

			//add listeners to save dimensions when they are changed
			view.dispatch.on('xchanged',function(d){savedDimensions.x = d;});
			view.dispatch.on('ychanged',function(d){savedDimensions.y = d;});

			//set view to currently saved dimensions if defined
			if (savedDimensions.x) {
				var node = d3.select(view.xSelect).node();
				node.value = savedDimensions.x;
				d3.select(node).on('input').call(node);//trigger input event on select
			}
			if (savedDimensions.y) {
				var node = d3.select(view.ySelect).node();
				node.value = savedDimensions.y;
				d3.select(node).on('input').call(node);//trigger input event on select
			}
		}

		//Set mouseover handler for new view and update size
		view.dispatch.on('mouseover',handleMouseover);
		updateViewContainerSize();
		view.updateSize();

		//Set view's initial selection to the current pcoord selection
		view.setSelection(pcoord.selection.slice());
	}
}

/**
 * Build a panel for selecting axis orderings
 * Add listeners for pcoord chart
 */
function buildAxisOrderPanel() {
	//Add panel
	var axisOrderPanel = d3.select('#header').append('div')
		.attr('id','axisOrderPanel');
	//Add label
	axisOrderPanel.append('span')
		.attr('id','axisOrderLabel')
		.text("Axis Order:");
	axisOrderPanel.append('br');
	//Add select for category
	axisOrderPanel.append('select')
		.attr('id','axis_category')
		.selectAll('option').data(d3.keys(currentDb.axisOrderData))
			.enter().append('option')
				.attr('value',function(d){return d;})
				.text(function(d){return d;});
	//Set onchange for category select to populate value select
	d3.select('#axis_category').on('change',function() {
		var category = currentDb.axisOrderData[this.value];
		var val = d3.select('#axis_value').selectAll('option')
			.data(d3.range(-1,category.length));//-1 is 'custom' order
		val.exit().remove();
		val.enter().append('option')
			.merge(val)
				.attr('value',function(d){return d;})
				.text(function(d){return d == -1 ? 'Custom' : category[d].name;});
		//set onchange for value select to change order in pcoord chart
		d3.select('#axis_value').on('change',function() {
			if (this.value != -1) {
				var order = category[this.value].order;
				pcoord.setAxisOrder(order);
			}
		});
		d3.select('#axis_value').node().value = -1; //set to custom
	});
	//Add spacer
	axisOrderPanel.append('span').text(' : ');
	//Add value select
	axisOrderPanel.append('select')
		.attr('id','axis_value');

	//Add handler to pcoord chart to set value select to "custom" 
	//when axis order is manually changed
	pcoord.dispatch.on('axisorderchange',function() {
		d3.select('#axis_value').node().value = -1;
	});

	//trigger change in category to populate value select
	d3.select('#axis_category').on('change').call(d3.select('#axis_category').node());
}

/**
 * Respond to smoothLines checkbox.
 * Update lines in pcoord chart
 */
function updateSmoothLines() {
	if (loaded) {
		pcoord.smoothPaths = d3.select('#smoothLines').node().checked;
		pcoord.redrawPaths();
	}
}

/**
 * Update the size of viewContainer to fill the remaining space below the top panel
 **/
function updateViewContainerSize() {
	var topRect = d3.select('#top').node().getBoundingClientRect();
	var tabRect = d3.select('#tabContainer').node().getBoundingClientRect();
	d3.select('#viewContainer').style('height',window.innerHeight-topRect.height-tabRect.height+'px');
}

//Respond to mouseover event.
//Set highlight in pcoord chart
//and update info pane
//Also sets highlight in view if its a Scatter Plot
function handleMouseover(index, event) {
	if (index != null) {
		pcoord.setHighlightedPaths([index]);
		if (currentView == viewType.SCATTERPLOT)
			view.setHighlightedPoints([index]);
	}
	else {
		pcoord.setHighlightedPaths([]);
		if (currentView == viewType.SCATTERPLOT)
			view.setHighlightedPoints([]);
	}
	updateInfoPane(index,event);
}

//Update the info pane according to the index of the data
//being moused over
function updateInfoPane(index, event) {
	var pane = d3.select('.infoPane');
	if (index != null && pane.empty()) {
		pane = d3.select('body').append('div')
			.attr('class', 'infoPane')
	}
	if (index != null) {
		pane.html(function() {
				var text = '<b>Index:<b> '+index+'<br>';
				var data = currentDb.data[index]
				for (i in data) {
					text += ('<b>'+i+':</b> ');
					text += (data[i] + '<br>');
				}
				return text;
			});
		//Draw the info pane in the side of the window opposite the mouse
		var leftHalf = (event.clientX <= window.innerWidth/2)
		if (leftHalf)
			pane.style('right', '30px');
		else
			pane.style('left', '30px');
	}
	else {
		d3.select('.infoPane').remove();
	}
}
