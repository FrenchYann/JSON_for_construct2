// ECMAScript 5 strict mode
"use strict";

// Diagnostic for preview only
var shown_assert_alert = false;

function assert2(cnd, msg)
{
	if (!cnd)
	{
		debugger;
		
		var stack;
		
		try {
			throw Error();
		} catch(ex) {
			stack = ex.stack;
		}
		
		var msg = "Assertion failure: " + msg + "\n\nStack trace: \n" + stack;
		
		if (!shown_assert_alert)
		{
			shown_assert_alert = true;
			alert(msg + "\n\nSubsequent failures will now be logged to the console.");
		}
		
		if (console.error)
			console.error(msg);
	}
};
// Show javascript errors in preview, since most users don't check the browser log. Only show first error
var shown_error_alert = false;

window.onerror = function(msg, url, line, col)
{
	if (shown_error_alert)
		return;
	
	// Turn off mysterious "Script error." on line 0 with no URL errors in Firefox & Chrome
	if (!msg || !url || msg === "Script error.")
		return;
	
	shown_error_alert = true;
	alert("Javascript error!\n" + msg + "\n" + url + ", line " + line + " (col " + col + ")\n\n" + "This may be a bug in Construct 2 or a third party plugin or behavior - please report it to the developer following the bug report guidelines. Subsequent errors will be logged to the console.");
};

function log(msg, type)
{
	// console logging seems to crash IE9 sometimes, so never log for IE
	if (typeof console !== "undefined" && console.log && navigator.userAgent.indexOf("MSIE") === -1)
	{
		if (type === "warn" && console.warn)
			console.warn(msg);
		else
			console.log(msg);
	}
};

var isNWjs = (typeof window["c2nodewebkit"] !== "undefined") || (typeof window["c2nwjs"] !== "undefined") || (window.location.search === "?nw" || /nodewebkit/i.test(navigator.userAgent)) || /nwjs/i.test(navigator.userAgent);

// Start refresh polling after 2 sec
function doRefreshPoll()
{
	var request = new XMLHttpRequest();
	request.onreadystatechange = onRefreshPollReadyStateChange;
	
	// Don't add the date in NW.js mode, since it seems to leak cache files
	if (isNWjs)
		request.open("GET", "_reloadpoll_");
	else
		request.open("GET", "_reloadpoll_?_=" + Date.now());
	
	request.timeout = 450;
	
	try {
		request.responseType = "text";
	} catch (e) {}
	
	request.send();
};

function onRefreshPollReadyStateChange()
{
	if (this.readyState === 4 && this.status !== 0 && this.status < 400)
	{
		var data = this.responseText;
		var reloadcode, i, len;
		
		if (data.indexOf("\n") === -1)
		{
			// No additional messages
			reloadcode = data;
		}
		else
		{
			// Additional messages provided
			var parts = data.split("\n");
			reloadcode = parts[0];
			
			for (i = 1, len = parts.length; i < len; ++i)
			{
				onMessageFromEditor(parts[i]);
			}
		}
		
		// Reload as ordinary preview
		if (reloadcode === "1")
		{
			log("Reload request was signalled, refreshing page...");
			
			postToDebugger({"type": "reset"});
			
			if (!!window["c2cocoonjs"])
			{
				CocoonJS.App.reload();
			}
			else
			{
				if (window.location.search.indexOf("continuous") > -1)
					window.parent.location = window.location.protocol + "//" + window.location.host;
				else if (window.location.search.indexOf("debug") > -1)
					window.parent.location = window.location.protocol + "//" + window.location.host;
				else
					window.location.reload(true);
			}
		}
		// Reload as continuous preview
		else if (reloadcode === "2")
		{
			postToDebugger({"type": "reset"});
			
			log("Reload request for continuous preview was signalled, saving state...");
			window["cr_getC2Runtime"]().signalContinuousPreview();
		}
		// Reload as continuous preview and debug
		else if (reloadcode === "3")
		{
			postToDebugger({"type": "reset"});
			
			// TODO
			log("Reload request for continuous preview was signalled, saving state...");
			window["cr_getC2Runtime"]().signalContinuousPreview();
		}
		// Reload as debug
		else if (reloadcode === "4")
		{
			postToDebugger({"type": "reset"});
			
			if (window.location.search.indexOf("debug") > -1)
				window.location.reload(true);
			else
				window.parent.location = window.location + "debug";
		}
	}
};
/*
setTimeout(function() {
	setInterval(doRefreshPoll, 500);
  }, 2000);
//*/

// Mark preview mode with a global variable
var cr_is_preview = true;

///////////////////////////////////////
// Debugger utilities
var ife = true;

// Work around stupid Firefox exceptions if you change privacy settings
function localStorage_getItem(key)
{
	try {
		return localStorage.getItem(key);
	}
	catch (e)
	{
		return null;
	}
};

function localStorage_setItem(key, value)
{
	try {
		localStorage.setItem(key, value);
	}
	catch (e)
	{
		// ignore
	}
};

/*
document.addEventListener("DOMContentLoaded", function ()
{
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (request.readyState === 4 && request.status !== 0 && request.status < 400)
			ife = (request.responseText === "1");
	};
	
	if (isNWjs)
		request.open("GET", "_ife_");
	else
		request.open("GET", "_ife_?_=" + Date.now());
	
	try {
		request.responseType = "text";
	} catch (e) {}
	
	request.send();
	
	watch = JSON.parse(localStorage_getItem("__c2_watch") || "{}");
});
//*/
function postToDebugger(data)
{
	// Runtime is iframed in the debugger page, so post messages to the parent.
	if (window.parent)
		window.parent.postMessage(data, "*");
};

// Runtime instance currently being inspected by debugger
var inspect_inst = null;
var inspect_system = false;
var highlight_enabled = true;
var current_mode = "inspect";

// Properties to watch in the format: watch[uid][header] = [propname1, propname2, ...]
var watch = {};

function debuggerIsProfiling()
{
	return current_mode === "profile";
};

// On message from debugger
window.addEventListener("message", onMessage, false);

function onMessage(e)
{
	var data = e.data;
	var type = data["type"];
	var runtime = window["cr_getC2Runtime"]();
	
	if (type === "inspectinstance")
	{
		current_mode = "inspect";
		
		var typename = data["typename"];
		
		// Inspecting System
		if (typename === "System")
		{
			inspect_inst = null;
			inspect_system = true;
		}
		// Inspecting object instance
		else
		{
			highlight_enabled = true;
			
			if (data.hasOwnProperty("uid"))
			{
				inspect_inst = runtime.getObjectByUID(data["uid"]);
				inspect_system = false;
			}
			else
			{
				var object_type = runtime.types[typename];
				var iid = data["iid"];
				
				if (object_type && iid >= 0 && iid < object_type.instances.length)
				{
					inspect_inst = object_type.instances[iid];
					inspect_system = false;
				}
			}
		}
		
		updateInspectedInstance();
	}
	else if (type === "add-watch")
	{
		if (ife)
		{
			postToDebugger({"type": "nocando"});
			return;
		}
		
		onAddToWatch(data["header_title"], data["property_name"]);
		updateInspectedInstance();
		localStorage_setItem("__c2_watch", JSON.stringify(watch));
	}
	else if (type === "add-watch-header")
	{
		if (ife)
		{
			postToDebugger({"type": "nocando"});
			return;
		}
		
		onAddToWatchHeader(data["header_title"], data["property_names"]);
		updateInspectedInstance();
		localStorage_setItem("__c2_watch", JSON.stringify(watch));
	}
	else if (type === "remove-watch")
	{
		onRemoveFromWatch(data["header_title"], data["property_name"]);
		updateInspectedInstance();
		localStorage_setItem("__c2_watch", JSON.stringify(watch));
	}
	else if (type === "remove-watch-header")
	{
		onRemoveFromWatchHeader(data["header_title"]);
		updateInspectedInstance();
		localStorage_setItem("__c2_watch", JSON.stringify(watch));
	}
	else if (type === "editvalue")
	{
		onDebugValueEdited(data["header"], data["name"], data["value"]);
		updateInspectedInstance();
	}
	else if (type === "pause")
	{
		runtime["setSuspended"](true);
		updateInspectedInstance();
	}
	else if (type === "resume")
	{
		runtime["setSuspended"](false);
	}
	else if (type === "resumebreakpoint")
	{
		runtime.step_break = false;
		runtime.debugResume();
	}
	else if (type === "step")
	{
		onStep();
	}
	else if (type === "save")
	{
		runtime.saveToSlot = "__c2_debuggerslot";
		
		// If suspended, step with a zero dt to make the save/load happen
		if (runtime.isSuspended)
		{
			runtime.last_tick_time = cr.performance_now();
			runtime.tick(false);
		}
	}
	else if (type === "load")
	{
		runtime.loadFromSlot = "__c2_debuggerslot";
		
		// If suspended, step with a zero dt to make the save/load happen
		if (runtime.isSuspended)
		{
			runtime.last_tick_time = cr.performance_now();
			runtime.tick(false);
			
			// Load happens async; when it finishes loading it will also fire another tick
			// if in the debugger and suspended
		}
	}
	else if (type === "highlight")
	{
		highlight_enabled = data["enabled"];
	}
	else if (type === "switchtab")
	{
		if (ife && data["mode"] !== "inspect")
		{
			postToDebugger({"type": "nocando"});
		}
		else
			current_mode = data["mode"];
	}
	else if (type === "restart")
	{
		window.location.reload(true);
	}
	else if (type === "destroy-inspect-inst")
	{
		if (inspect_inst)
			runtime.DestroyInstance(inspect_inst);
	}
	// When the debugger is popped out to a window, or collapsed back to a pane, it is effectively
	// reset. It needs to know about all object types again, so they're reposted.
	else if (type === "repostinit")
	{
		// Seems to be something of a race condition: a message posted at the same time
		// as opening a window sometimes isn't received by the window. Delay 500ms before
		// sending to try to ensure window exists and can receive messages.
		setTimeout(function() {
			debuggerInit(runtime);
		}, 500);
	}
}

function getDebuggerPropertiesForUID(uid, propsections)
{
	var i, len, b;
	var runtime = window["cr_getC2Runtime"]();
	
	if (!runtime)
		return;
	
	if (uid === -1)		// system
	{
		runtime.system.getDebuggerValues(propsections);
	}
	else
	{
		var inst = runtime.getObjectByUID(uid);
		
		if (!inst)
			return;
		
		propsections.push({
			"title": "Common",
			"properties": [
				{"name": "Name", "value": inst.type.name, "readonly": true},
				{"name": "UID", "value": inst.uid, "readonly": true},
				{"name": "IID", "value": inst.get_iid(), "readonly": true}
			]
		});
		
		if (inst.type.plugin.is_world)
		{
			propsections.push({
				"title": "Layout",
				"properties": [
					{"name": "X", "value": inst.x},
					{"name": "Y", "value": inst.y},
					{"name": "Width", "value": inst.width},
					{"name": "Height", "value": inst.height},
					{"name": "Angle", "value": cr.to_degrees(inst.angle)},
					{"name": "Opacity", "value": inst.opacity * 100},
					{"name": "Visible", "value": inst.visible},
					{"name": "Layer", "value": inst.layer.name, "readonly": true},
					{"name": "Z Index", "value": inst.get_zindex(), "readonly": true},
					{"name": "Collisions enabled", "value": inst.collisionsEnabled}
				]
			});
		}
		
		var varprops = [];
		
		if (inst.instance_vars && inst.instance_vars.length)
		{
			for (i = 0, len = inst.instance_vars.length; i < len; ++i)
			{
				varprops.push({
					"name": inst.instance_var_names[i],
					"value": inst.instance_vars[i]
				});
			}
			
			propsections.push({
				"title": "Instance variables",
				"properties": varprops
			});
		}
		
		if (inst.behavior_insts && inst.behavior_insts.length)
		{
			for (i = 0, len = inst.behavior_insts.length; i < len; ++i)
			{
				b = inst.behavior_insts[i];
				
				if (b.getDebuggerValues)
					b.getDebuggerValues(propsections);
			}
		}
		
		if (inst.getDebuggerValues)
			inst.getDebuggerValues(propsections);
	}
};

// Send new property values for the currently inspected instance. Called every 100ms
function updateInspectedInstance()
{
	var propsections, watchsections, watchprops, sendwatchprops;
	var i, len, j, lenj, b, p, prop, siblings;
	var runtime, inst, curwatch, watchvalues, section;
	
	// Update outline around inspected inst
	debuggerShowInspectInstance();
	
	if (current_mode === "inspect")
	{
		propsections = [];
		
		if (inspect_system)
		{
			getDebuggerPropertiesForUID(-1, propsections);
			
			postToDebugger({
				"type": "inst-inspect",
				"is_world": false,
				"sections": propsections
			});
		}
		else if (inspect_inst)
		{
			getDebuggerPropertiesForUID(inspect_inst.uid, propsections);
			
			// List all sibling UIDs to be able to jump around container from debugger
			siblings = [];
			
			if (inspect_inst.siblings)
			{
				for (i = 0, len = inspect_inst.siblings.length; i < len; ++i)
				{
					siblings.push({
						"typename": inspect_inst.siblings[i].type.name,
						"uid": inspect_inst.siblings[i].uid
					});
				}
			}
			
			postToDebugger({
				"type": "inst-inspect",
				"is_world": inspect_inst.type.plugin.is_world,
				"siblings": siblings,
				"sections": propsections
			});
		}
	}
	else if (current_mode === "watch")
	{
		watchsections = [];
		runtime = window["cr_getC2Runtime"]();
		
		if (!runtime)
			return;
		
		// Iterate every instance in the watch
		for (p in watch)
		{			
			if (p !== "-1")
			{
				inst = runtime.getObjectByUID(parseInt(p, 10));
				
				if (!inst)
				{
					// Must have been destroyed - remove watch record
					delete watch[p];
					continue;
				}
			}
			
			propsections = [];
			getDebuggerPropertiesForUID(parseInt(p, 10), propsections);
			
			// Copy just the watched header/properties to watchsections
			curwatch = watch[p];
			
			// For each header available
			for (i = 0, len = propsections.length; i < len; ++i)
			{
				section = propsections[i];
				
				// This header is being watched
				if (curwatch.hasOwnProperty(section["title"]))
				{
					watchprops = curwatch[section["title"]];
					sendwatchprops = [];
					
					// For each property in this header
					for (j = 0, lenj = section["properties"].length; j < lenj; ++j)
					{
						prop = section["properties"][j];
						
						// This property is being watched
						if (watchprops.indexOf(prop["name"]) > -1)
						{
							// Add to watch sections
							sendwatchprops.push(prop);
						}
					}
					
					if (sendwatchprops.length)
					{
						watchvalues = {
							"title": (p === "-1" ? "System" : inst.type.name + " UID " + p) + ": " + section["title"],
							"properties": sendwatchprops
						};
						
						watchsections.push(watchvalues);
					}
				}
			}
		}
		
		postToDebugger({
			"type": "watch-inspect",
			"sections": watchsections
		});
	}
};

window.setInterval(updateInspectedInstance, 100);

function onDebugValueEdited(header, name, value)
{
	if (ife)
	{
		alert("Editing values in the debugger is not available in the free edition of Construct 2. Purchase a license to take advantage of this feature.");
		return;		// don't be a leet hax0r and edit this... help support us and buy a license!
	}
	
	var i, len, v, binst;
	var runtime = window["cr_getC2Runtime"]();
	
	var my_inspect_system = inspect_system;
	var my_inspect_inst = inspect_inst;
	
	if (current_mode === "watch")
	{
		var uid = getUidFromTitle(header);
		header = getRealHeaderFromTitle(header);
		
		if (uid === -1)
		{
			my_inspect_system = true;
			my_inspect_inst = null;
		}
		else if (runtime)
		{
			my_inspect_system = false;
			my_inspect_inst = runtime.getObjectByUID(uid);
			
			if (!my_inspect_inst)
				return;
		}
		else
			return;
	}
	
	if (runtime)
		runtime.redraw = true;
	
	if (my_inspect_system)
	{
		if (runtime)
		{
			runtime.system.onDebugValueEdited(header, name, value);
		}
	}
	else if (my_inspect_inst)
	{
		// Handle default properties
		if (header === "Layout")
		{
			switch (name) {
			case "X":
				my_inspect_inst.x = value;
				my_inspect_inst.set_bbox_changed();
				return;
			case "Y":
				my_inspect_inst.y = value;
				my_inspect_inst.set_bbox_changed();
				return;
			case "Width":
				my_inspect_inst.width = value;
				my_inspect_inst.set_bbox_changed();
				return;
			case "Height":
				my_inspect_inst.height = value;
				my_inspect_inst.set_bbox_changed();
				return;
			case "Angle":
				my_inspect_inst.angle = cr.to_radians(value);
				my_inspect_inst.set_bbox_changed();
				return;
			case "Opacity":
				my_inspect_inst.opacity = cr.clamp(value / 100, 0, 1);
				return;
			case "Visible":
				my_inspect_inst.visible = value;
				my_inspect_inst.runtime.redraw = true;
				return;
			case "Collisions enabled":
				my_inspect_inst.collisionsEnabled = value;
				return;
			}
		}
		// Handle instance variable changes
		else if (header === "Instance variables")
		{
			// Find instance variable with given name
			for (i = 0, len = my_inspect_inst.instance_var_names.length; i < len; ++i)
			{
				v = my_inspect_inst.instance_var_names[i];
				
				if (v === name)
				{
					my_inspect_inst.instance_vars[i] = value;
					return;
				}
			}
		}
		
		// Try to find a behavior with this header name and pass the call to it
		if (my_inspect_inst.behavior_insts)
		{
			for (i = 0, len = my_inspect_inst.behavior_insts.length; i < len; ++i)
			{
				binst = my_inspect_inst.behavior_insts[i];
				
				if (binst.type.name === header)
				{
					if (binst.onDebugValueEdited)
					{
						binst.onDebugValueEdited(header, name, value);
						return;
					}
				}
			}
		}
		
		// Pass on to plugin to handle
		if (my_inspect_inst.onDebugValueEdited)
			my_inspect_inst.onDebugValueEdited(header, name, value);
	}
};

function sortNameAZ(a, b)
{
	var alower = a.name.toLowerCase();
	var blower = b.name.toLowerCase();
	
	if (alower > blower)
		return 1;
	if (alower < blower)
		return -1;
	else
		return 0;
};

function debuggerLoadingProgress(x)
{
	postToDebugger({
		"type": "loadingprogress",
		"progress": x
	});
};

function debuggerInit(runtime)
{
	// Send a list of all object type names in the project, sorted A-Z
	var objs = [];
	var sorted_types = [];
	cr.shallowAssignArray(sorted_types, runtime.types_by_index);
	sorted_types.sort(sortNameAZ);
	
	var i, len, object_type;
	for (i = 0, len = sorted_types.length; i < len; ++i)
	{
		object_type = sorted_types[i];
		objs.push({
			"name": object_type.name,
			"world": object_type.plugin.is_world,
			"singleglobal": object_type.plugin.singleglobal,
			"instances": object_type.instances.length
		});
	}
	
	postToDebugger({
		"type": "init",
		"paused": runtime.isSuspended,
		"objects": objs
	});
	
	// Start off initial inspect on the System object
	if (!inspect_inst)
		inspect_system = true;
};

function debuggerSuspended(s, h, e)
{
	postToDebugger({
		"type": "suspend",
		"suspended": s,
		"hit_breakpoint": h,
		"hit_event": e
	});
};

function debuggerFullscreen(f)
{
	postToDebugger({
		"type": "fullscreen",
		"enabled": f
	});
};

function debuggerPerfStats(fps, cpu, mem, renderer, objectcount, rendercpu, eventscpu, physicscpu, sheets_perf)
{
	postToDebugger({
		"type": "perfstats",
		"fps": fps,
		"cpu": cpu,
		"mem": mem,
		"renderer": renderer,
		"objectcount": objectcount,
		"rendercpu": rendercpu,
		"eventscpu": eventscpu,
		"physicscpu": physicscpu,
		"sheets_perf": sheets_perf
	});
};

function debuggerInstanceCreated(inst)
{
	// Need to send all family names to debugger so family instance lists
	// can also be updated
	var names = [inst.type.name];
	
	var i, len;
	for (i = 0, len = inst.type.families.length; i < len; ++i)
	{
		names.push(inst.type.families[i].name);
	}
	
	postToDebugger({
		"type": "inst-create",
		"uid": inst.uid,
		"names": names
	});
};

function debuggerInstanceDestroyed(inst)
{
	// If the destroyed instance was being inspected, indicate to the debugger to clear
	// the view for that instance.
	var was_inspecting = false;
	
	if (inspect_inst && inspect_inst.uid === inst.uid)
	{
		inspect_inst = null;
		was_inspecting = true;
	}
	
	// Need to send all family names to debugger so family instance lists
	// can also be updated
	var names = [inst.type.name];
	
	var i, len;
	for (i = 0, len = inst.type.families.length; i < len; ++i)
	{
		names.push(inst.type.families[i].name);
	}
	
	postToDebugger({
		"type": "inst-destroy",
		"names": names,
		"uid": inst.uid,
		"was-inspecting": was_inspecting
	});
};

var inspect_outline_div = null;

function debuggerShowInspectInstance()
{
	if (!inspect_inst || !highlight_enabled || current_mode !== "inspect" || !inspect_inst.type.plugin.is_world)
	{
		if (inspect_outline_div)
			jQuery(inspect_outline_div).hide();
		
		return;
	}
	
	if (!inspect_outline_div)
	{
		inspect_outline_div = document.createElement("div");
		inspect_outline_div.id = "inspect-outline";
		document.body.appendChild(inspect_outline_div);
		jQuery(inspect_outline_div).css({
			"position": "absolute",
			"border": "2px dotted red",
			"overflow": "hidden",
			"font-size": "8pt",
			"font-family": "Sans serif"
		});
	}
	
	inspect_inst.update_bbox();
	var layer = inspect_inst.layer;
	var bbox = inspect_inst.bbox;
	
	var p1x = layer.layerToCanvas(bbox.left, bbox.top, true);
	var p1y = layer.layerToCanvas(bbox.left, bbox.top, false);
	var p2x = layer.layerToCanvas(bbox.right, bbox.bottom, true);
	var p2y = layer.layerToCanvas(bbox.right, bbox.bottom, false);
	
	var left = cr.min(p1x, p2x) - 2;
	var top = cr.min(p1y, p2y) - 2;
	var w = cr.max(p1x, p2x) - left - 2;
	var h = cr.max(p1y, p2y) - top - 2;
	
	var canvaspos = jQuery("#c2canvasdiv").offset();
	
	jQuery(inspect_outline_div).show();
	jQuery(inspect_outline_div).css({"left": left + canvaspos.left, "top": top + canvaspos.top});
	jQuery(inspect_outline_div).width(w).height(h);
	inspect_outline_div.textContent = inspect_inst.type.name + " #" + inspect_inst.get_iid();
};

function onAddToWatch(header_title, property_name)
{
	if (!inspect_inst && !inspect_system)
		return;		// not inspecting anything
	
	// First try to look up instance with same UID to see if a watch record exists for it already
	var uid = inspect_inst ? inspect_inst.uid : -1;
	var headers, properties;
	
	// Already has record
	if (watch.hasOwnProperty(uid.toString()))
	{
		headers = watch[uid.toString()];
		
		// Check for existing header with same name
		if (headers.hasOwnProperty(header_title))
		{
			properties = headers[header_title];
			
			// Only add if not already added
			if (properties.indexOf(property_name) === -1)
				properties.push(property_name);
		}
		// Doesn't have header with this name: add new one
		else
		{
			headers[header_title] = [property_name];
		}
	}
	// Doesn't have record: add a new one
	else
	{
		properties = [property_name];
		headers = {};
		headers[header_title] = properties;
		watch[uid.toString()] = headers;
	}
};

function onAddToWatchHeader(header_title, property_names)
{
	if (!inspect_inst && !inspect_system)
		return;		// not inspecting anything
	
	// First try to look up instance with same UID to see if a watch record exists for it already
	var uid = inspect_inst ? inspect_inst.uid : -1;
	var headers, properties;
	var i, len;
	
	// Already has record
	if (watch.hasOwnProperty(uid.toString()))
	{
		headers = watch[uid.toString()];
		headers[header_title] = property_names
	}
	// Doesn't have record: add a new one
	else
	{
		headers = {};
		headers[header_title] = property_names;
		watch[uid.toString()] = headers;
	}
};

function getUidFromTitle(title)
{
	var i = title.indexOf(": ");
	var namepart = title.substr(0, i);
	
	if (namepart.toLowerCase() === "system")
		return -1;
	
	var parts = namepart.split(" ");
	return parseInt(parts[2], 10);
};

function getRealHeaderFromTitle(title)
{
	var i = title.indexOf(": ");
	return title.substr(i + 2);
};

function onRemoveFromWatch(header_title, property_name)
{
	var uid = getUidFromTitle(header_title);
	
	var i = header_title.indexOf(": ");
	var len;
	var real_header = header_title.substr(i + 2);
	
	if (!watch.hasOwnProperty(uid.toString()))
		return;
	
	var headers = watch[uid.toString()];
	
	if (!headers.hasOwnProperty(real_header))
		return;
	
	var props = headers[real_header];
	
	cr.arrayFindRemove(props, property_name);
	
	// Was last property for header: remove header
	if (!props.length)
	{
		delete headers[real_header];
		
		// Headers object is now empty: remove entire object record from watch
		if (!cr.hasAnyOwnProperty(headers))
			delete watch[uid.toString()];
	}
};

function onRemoveFromWatchHeader(header_title)
{
	var uid = getUidFromTitle(header_title);
	var real_header = getRealHeaderFromTitle(header_title);
	var len;
	
	if (!watch.hasOwnProperty(uid.toString()))
		return;
	
	var headers = watch[uid.toString()];
	
	if (!headers.hasOwnProperty(real_header))
		return;
		
	delete headers[real_header];
};

function onMessageFromEditor(msg)
{
	var parts = msg.split(",");
	
	switch (parts[0]) {
	case "breakpoint":
		onBreakpointUpdate(parts[1], parseInt(parts[2], 10), parseInt(parts[3], 10), parseInt(parts[4], 10), parts[5] !== "0");
		break;
	}
};

function onBreakpointUpdate(event_sheet, event_number, cnd_index, act_index, set_breakpoint)
{
	var runtime = window["cr_getC2Runtime"]();
	
	if (!runtime || !runtime.isDebug)
		return;
	
	var sheet = runtime.eventsheets[event_sheet];
	
	if (!sheet)
		return;
	
	var ev = sheet.events_by_number[event_number];
	
	if (!ev || !ev.is_breakable)
		return;
	
	if (cnd_index > -1)
	{
		if (ev.conditions && cnd_index < ev.conditions.length)
		{
			ev.conditions[cnd_index].is_breakpoint = set_breakpoint;
			
			console.log((set_breakpoint ? "Set" : "Unset") + " breakpoint at '" + event_sheet + "' event " + event_number + " condition " + (cnd_index + 1));
		}
	}
	else if (act_index > -1)
	{
		if (ev.actions && act_index < ev.actions.length)
		{
			ev.actions[act_index].is_breakpoint = set_breakpoint;
			
			console.log((set_breakpoint ? "Set" : "Unset") + " breakpoint at '" + event_sheet + "' event " + event_number + " action " + (act_index + 1));
		}
	}
	else
	{
		// Setting on event block itself
		ev.is_breakpoint = set_breakpoint;
		
		console.log((set_breakpoint ? "Set" : "Unset") + " breakpoint at '" + event_sheet + "' event " + event_number);
	}
};

function onStep()
{
	var runtime = window["cr_getC2Runtime"]();
	if (!runtime)
		return;
	
	if (runtime.hit_breakpoint)
	{
		// Breakpoint step: break again on next block/action/condition
		runtime.step_break = true;
		runtime.debugResume();
	}
	else if (runtime.isSuspended)
	{
		// Ordinary one-tick step
		// Set last tick time to 16ms ago to trick runtime in to setting dt correctly
		runtime.last_tick_time = cr.performance_now() - (1000.0 / 60.0);
		runtime.tick(false, null, true);
	}
};

// Keyboard shortcuts
if (!window["c2cocoonjs"])
{
	jQuery(document).keydown(function(info) {
		if (info.which === 121)	// F10 to step/next
		{
			onStep();
			info.preventDefault();
		}		
	});
}