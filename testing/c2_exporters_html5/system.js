// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");

// System object
cr.system_object = function (runtime)
{
    this.runtime = runtime;
	
	// Scheduled events set by the Wait action
	this.waits = [];
};

cr.system_object.prototype.saveToJSON = function ()
{
	var o = {};
	var i, len, j, lenj, p, w, t, sobj;
	
	// save scheduled waits
	o["waits"] = [];
	var owaits = o["waits"];
	var waitobj;
	
	for (i = 0, len = this.waits.length; i < len; i++)
	{
		w = this.waits[i];
		waitobj = {
			"t": w.time,
			"st": w.signaltag,
			"s": w.signalled,
			"ev": w.ev.sid,
			"sm": [],
			"sols": {}
		};
		
		if (w.ev.actions[w.actindex])
			waitobj["act"] = w.ev.actions[w.actindex].sid;
			
		for (j = 0, lenj = w.solModifiers.length; j < lenj; j++)
			waitobj["sm"].push(w.solModifiers[j].sid);
			
		for (p in w.sols)
		{
			if (w.sols.hasOwnProperty(p))
			{
				t = this.runtime.types_by_index[parseInt(p, 10)];
				assert2(t, "Missing type by index saving wait records");
				
				sobj = {
					"sa": w.sols[p].sa,
					"insts": []
				};
				
				for (j = 0, lenj = w.sols[p].insts.length; j < lenj; j++)
					sobj["insts"].push(w.sols[p].insts[j].uid);
				
				waitobj["sols"][t.sid.toString()] = sobj;
			}
		}
		
		owaits.push(waitobj);
	}
	
	return o;
};

cr.system_object.prototype.loadFromJSON = function (o)
{
	var owaits = o["waits"];
	var i, len, j, lenj, p, w, addWait, e, aindex, t, savedsol, nusol, inst;
	
	cr.clearArray(this.waits);
	
	for (i = 0, len = owaits.length; i < len; i++)
	{
		w = owaits[i];
		
		e = this.runtime.blocksBySid[w["ev"].toString()];
		
		if (!e)
			continue;	// event must've gone missing
			
		// Find the action it was pointing at in this event
		aindex = -1;
		
		for (j = 0, lenj = e.actions.length; j < lenj; j++)
		{
			if (e.actions[j].sid === w["act"])
			{
				aindex = j;
				break;
			}
		}
		
		if (aindex === -1)
			continue;	// action must've gone missing
		
		addWait = {};
		addWait.sols = {};
		addWait.solModifiers = [];
		addWait.deleteme = false;
		addWait.time = w["t"];
		addWait.signaltag = w["st"] || "";
		addWait.signalled = !!w["s"];
		addWait.ev = e;
		addWait.actindex = aindex;
		
		for (j = 0, lenj = w["sm"].length; j < lenj; j++)
		{
			t = this.runtime.getObjectTypeBySid(w["sm"][j]);
			
			if (t)
				addWait.solModifiers.push(t);
		}
		
		for (p in w["sols"])
		{
			if (w["sols"].hasOwnProperty(p))
			{
				t = this.runtime.getObjectTypeBySid(parseInt(p, 10));
				
				if (!t)
					continue;		// type must've been deleted
				
				savedsol = w["sols"][p];
				nusol = {
					sa: savedsol["sa"],
					insts: []
				};
				
				for (j = 0, lenj = savedsol["insts"].length; j < lenj; j++)
				{
					inst = this.runtime.getObjectByUID(savedsol["insts"][j]);
					
					if (inst)
						nusol.insts.push(inst);
				}
				
				addWait.sols[t.index.toString()] = nusol;
			}
		}
		
		this.waits.push(addWait);
	}
};

/**BEGIN-PREVIEWONLY**/
cr.system_object.prototype.getDebuggerValues = function (propsections)
{
	var runtime = this.runtime;
	var layout = runtime.running_layout;
	
	propsections.push({
		"title": "Performance",
		"properties": [
			{"name": "Frames per second", "value": "" + runtime.fps + " (" + (Math.round(10000 / runtime.fps) / 10) + " ms/frame)", "readonly": true},
			{"name": "Est. CPU utilisation", "value": "" + (Math.round(runtime.cpuutilisation) / 10) + "%", "readonly": true},
			{"name": "Est. image memory", "value": runtime.glwrap ? (Math.round(10 * runtime.glwrap.estimateVRAM() / (1024 * 1024)) / 10).toString() + " mb" : "Unavailable", "readonly": true},
			{"name": "Renderer", "value": runtime.glwrap ? "webgl" : "canvas2d", "readonly": true},
			{"name": "Object count", "value": runtime.objectcount, "readonly": true},
			{"name": "Collision checks/sec", "value": "" + runtime.collisioncheck_sec + " (~" + Math.round(runtime.collisioncheck_sec / runtime.fps) + "/tick)", "readonly": true},
			{"name": "Poly checks/sec", "value": "" + runtime.polycheck_sec + " (~" + Math.round(runtime.polycheck_sec / runtime.fps) + "/tick)", "readonly": true},
			{"name": "Moved cell/sec", "value": "" + runtime.movedcell_sec + " (~" + Math.round(runtime.movedcell_sec / runtime.fps) + "/tick)", "readonly": true},
			{"name": "Cell count", "value": "" + cr.SparseGrid.prototype.totalCellCount, "readonly": true},
			{"name": "Moved render cell/sec", "value": "" + runtime.movedrendercell_sec + " (~" + Math.round(runtime.movedrendercell_sec / runtime.fps) + "/tick)", "readonly": true},
			{"name": "Render cell count", "value": "" + cr.RenderGrid.prototype.totalCellCount, "readonly": true}
		]
	});
	
	propsections.push({
		"title": "System",
		"properties": [
			{"name": "Canvas size", "value": "(" + runtime.width + "," + runtime.height + ")", "readonly": true},
			{"name": "Time scale", "value": runtime.timescale},
			{"name": "Time", "value": runtime.kahanTime.sum, "readonly": true},
			{"name": "Wall clock time", "value": (Date.now() - this.runtime.start_time) / 1000.0, "readonly": true},
			{"name": "Tick count", "value": runtime.tickcount, "readonly": true}
		]
	});
	
	// Add global variables sorted by name
	var i, len, props = [], layer, v;
	
	var globals_sorted = [];
	cr.shallowAssignArray(globals_sorted, runtime.all_global_vars);
	globals_sorted.sort(sortNameAZ);
	
	for (i = 0, len = globals_sorted.length; i < len; ++i)
	{
		v = globals_sorted[i];
		props.push({"name": v.name, "value": v.data});
	}
	
	if (props.length)
	{
		propsections.push({
			"title": "Global variables",
			"properties": props
		});
	}
	
	// Add static local variables sorted by name
	props = [];
	
	var locals_sorted = [];
	cr.shallowAssignArray(locals_sorted, runtime.all_local_vars);
	locals_sorted.sort(sortNameAZ);
	
	for (i = 0, len = locals_sorted.length; i < len; ++i)
	{
		v = locals_sorted[i];
		
		if (v.is_static)
			props.push({"name": v.name, "value": v.data});
	}
	
	if (props.length)
	{
		propsections.push({
			"title": "Static local variables",
			"properties": props
		});
	}
	
	propsections.push({
		"title": "Current layout",
		"properties": [
			{"name": "Name", "value": layout.name, "readonly": true},
			{"name": "Width", "value": layout.width},
			{"name": "Height", "value": layout.height},
			{"name": "Event sheet", "value": layout.event_sheet ? layout.event_sheet.name : "(none)", "readonly": true},
			{"name": "Scroll X", "value": layout.scrollX},
			{"name": "Scroll Y", "value": layout.scrollY},
			{"name": "Scale", "value": layout.scale},
			{"name": "Angle", "value": cr.to_degrees(layout.angle)}
		]
	});
	
	for (i = 0, len = layout.layers.length; i < len; ++i)
	{
		layer = layout.layers[i];
		props = [];
		
		props.push({"name": "Index", "value": layer.index, "readonly": true});
		props.push({"name": "Scale", "value": layer.scale});
		props.push({"name": "Angle", "value": cr.to_degrees(layer.angle)});
		props.push({"name": "Viewport left", "value": layer.viewLeft, "readonly": true});
		props.push({"name": "Viewport top", "value": layer.viewTop, "readonly": true});
		props.push({"name": "Viewport right", "value": layer.viewRight, "readonly": true});
		props.push({"name": "Viewport bottom", "value": layer.viewBottom, "readonly": true});
		props.push({"name": "Visible", "value": layer.visible});
		props.push({"name": "Transparent", "value": layer.transparent});
		props.push({"name": "Parallax X", "value": layer.parallaxX * 100});
		props.push({"name": "Parallax Y", "value": layer.parallaxY * 100});
		props.push({"name": "Opacity", "value": layer.opacity * 100});
		props.push({"name": "Force own texture", "value": layer.forceOwnTexture});
		props.push({"name": "Zoom rate", "value": layer.zoomRate});
		
		propsections.push({
			"title": "Layer '" + layer.name + "'",
			"properties": props
		});
	}
};

cr.system_object.prototype.onDebugValueEdited = function (header, name, value)
{
	var i, len, v;
	var runtime = this.runtime;
	var layout = runtime.running_layout;
	
	if (header === "System")
	{
		if (name === "Time scale")
			runtime.timescale = value;
	}
	else if (header === "Global variables")
	{
		// Look for a global variable with the given property name
		for (i = 0, len = runtime.all_global_vars.length; i < len; ++i)
		{
			v = runtime.all_global_vars[i];
			
			if (v.name === name)
			{
				v.data = value;
				return;
			}
		}
	}
	else if (header === "Static local variables")
	{
		// Look for a static local variable with the given property name
		for (i = 0, len = runtime.all_local_vars.length; i < len; ++i)
		{
			v = runtime.all_local_vars[i];
			
			if (v.name === name)
			{
				v.data = value;
				return;
			}
		}
	}
	else if (header === "Current layout")
	{
		switch (name) {
		case "Width":				layout.width = value;				break;
		case "Height":				layout.height = value;				break;
		case "Scroll X":			layout.scrollToX(value);			break;
		case "Scroll Y":			layout.scrollToY(value);			break;
		case "Scale":				layout.scale = value;				break;
		case "Angle":				layout.angle = cr.to_radians(value); break;
		}
	}
	else {
		// Parse layer name from string "Layer 'Foo'" in header
		var layername = header.substr(7, header.length - 8);
		var layer = null;
		
		for (i = 0, len = layout.layers.length; i < len; ++i)
		{
			if (layout.layers[i].name === layername)
			{
				layer = layout.layers[i];
				break;
			}
		}
		
		if (layer)
		{
			switch (name) {
			case "Scale":					layer.scale = value;				break;
			case "Angle":					layer.angle = cr.to_radians(value);	break;
			case "Visible":					layer.visible = value;				break;
			case "Transparent":				layer.transparent = value;			break;
			case "Parallax X":				layer.parallaxX = value / 100;		break;
			case "Parallax Y":				layer.parallaxY = value / 100;		break;
			case "Opacity":					layer.opacity = value / 100;		break;
			case "Force own texture":		layer.forceOwnTexture = value;		break;
			case "Zoom rate":				layer.zoomRate = value;				break;
			}
		}
	}
};
/**END-PREVIEWONLY**/

(function ()
{
	var sysProto = cr.system_object.prototype;
	
	function SysCnds() {};

	//////////////////////////////
	// System conditions
    SysCnds.prototype.EveryTick = function()
    {
        return true;
    };

    SysCnds.prototype.OnLayoutStart = function()
    {
        return true;
    };

    SysCnds.prototype.OnLayoutEnd = function()
    {
        return true;
    };

    SysCnds.prototype.Compare = function(x, cmp, y)
    {
        return cr.do_cmp(x, cmp, y);
    };

    SysCnds.prototype.CompareTime = function (cmp, t)
    {
        var elapsed = this.runtime.kahanTime.sum;

        // Handle 'time equals X' separately, basically as "on first tick where time is over X"
        if (cmp === 0)
        {
            var cnd = this.runtime.getCurrentCondition();

            if (!cnd.extra["CompareTime_executed"])
            {
                // First occasion that time has elapsed
                if (elapsed >= t)
                {
                    cnd.extra["CompareTime_executed"] = true;
                    return true;
                }
            }

            return false;
        }

        // Otherwise do ordinary comparison
        return cr.do_cmp(elapsed, cmp, t);
    };

    SysCnds.prototype.LayerVisible = function (layer)
    {
        if (!layer)
            return false;
        else
            return layer.visible;
    };
	
	SysCnds.prototype.LayerEmpty = function (layer)
    {
        if (!layer)
            return false;
        else
            return !layer.instances.length;
    };
	
	SysCnds.prototype.LayerCmpOpacity = function (layer, cmp, opacity_)
	{
		if (!layer)
			return false;
		
		return cr.do_cmp(layer.opacity * 100, cmp, opacity_);
	};

    SysCnds.prototype.Repeat = function (count)
    {
		var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack();

        var i;
		
		if (solModifierAfterCnds)
		{
			for (i = 0; i < count && !current_loop.stopped; i++)
			{
				this.runtime.pushCopySol(current_event.solModifiers);

				current_loop.index = i;
				current_event.retrigger();
				
				/**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;

				this.runtime.popSol(current_event.solModifiers);
			}
		}
		else
		{
			for (i = 0; i < count && !current_loop.stopped; i++)
			{
				current_loop.index = i;
				current_event.retrigger();
				
				/**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;
			}
		}

        this.runtime.popLoopStack();
		return false;
    };
	
	SysCnds.prototype.While = function (count)
    {
		var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack();

        var i;
		
		if (solModifierAfterCnds)
		{
			for (i = 0; !current_loop.stopped; i++)
			{
				this.runtime.pushCopySol(current_event.solModifiers);

				current_loop.index = i;
				
				if (!current_event.retrigger())		// one of the other conditions returned false
					current_loop.stopped = true;	// break

				this.runtime.popSol(current_event.solModifiers);
			}
		}
		else
		{
			for (i = 0; !current_loop.stopped; i++)
			{
				current_loop.index = i;
				
				if (!current_event.retrigger())
					current_loop.stopped = true;
			}
		}

        this.runtime.popLoopStack();
		return false;
    };

    SysCnds.prototype.For = function (name, start, end)
    {
        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack(name);

        var i;
		
		// running backwards
		if (end < start)
		{
			if (solModifierAfterCnds)
			{
				for (i = start; i >= end && !current_loop.stopped; --i)  // inclusive to end
				{
					this.runtime.pushCopySol(current_event.solModifiers);

					current_loop.index = i;
					current_event.retrigger();

					this.runtime.popSol(current_event.solModifiers);
				}
			}
			else
			{
				for (i = start; i >= end && !current_loop.stopped; --i)  // inclusive to end
				{
					current_loop.index = i;
					current_event.retrigger();
				}
			}
		}
		else
		{
			if (solModifierAfterCnds)
			{
				for (i = start; i <= end && !current_loop.stopped; ++i)  // inclusive to end
				{
					this.runtime.pushCopySol(current_event.solModifiers);

					current_loop.index = i;
					current_event.retrigger();

					this.runtime.popSol(current_event.solModifiers);
				}
			}
			else
			{
				for (i = start; i <= end && !current_loop.stopped; ++i)  // inclusive to end
				{
					current_loop.index = i;
					current_event.retrigger();
				}
			}
		}

        this.runtime.popLoopStack();
		return false;
    };

	// For recycling arrays and avoiding garbage in foreach conditions
	var foreach_instancestack = [];
	var foreach_instanceptr = -1;
	
    SysCnds.prototype.ForEach = function (obj)
    {
        // Copy instances to iterate
        var sol = obj.getCurrentSol();
		
		// Push to foreach stack if necessary
		foreach_instanceptr++;
		if (foreach_instancestack.length === foreach_instanceptr)
			foreach_instancestack.push([]);
		
		var instances = foreach_instancestack[foreach_instanceptr];
		cr.shallowAssignArray(instances, sol.getObjects());

        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack();

        var i, len, j, lenj, inst, s, sol2;
		var is_contained = obj.is_contained;
		
		if (solModifierAfterCnds)
		{
			for (i = 0, len = instances.length; i < len && !current_loop.stopped; i++)
			{
				this.runtime.pushCopySol(current_event.solModifiers);
				
				inst = instances[i];

				// Pick the current instance (note sol was pushed above, don't move this out the loop)
				sol = obj.getCurrentSol();
				sol.select_all = false;
				cr.clearArray(sol.instances);
				sol.instances[0] = inst;
				
				if (is_contained)
				{
					for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
					{
						s = inst.siblings[j];
						sol2 = s.type.getCurrentSol();
						sol2.select_all = false;
						cr.clearArray(sol2.instances);
						sol2.instances[0] = s;
					}
				}

				current_loop.index = i;
				current_event.retrigger();

				this.runtime.popSol(current_event.solModifiers);
			}
		}
		else
		{
			sol.select_all = false;
			cr.clearArray(sol.instances);
			
			for (i = 0, len = instances.length; i < len && !current_loop.stopped; i++)
			{
				inst = instances[i];
				sol.instances[0] = inst;
				
				if (is_contained)
				{
					for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
					{
						s = inst.siblings[j];
						sol2 = s.type.getCurrentSol();
						sol2.select_all = false;
						cr.clearArray(sol2.instances);
						sol2.instances[0] = s;
					}
				}

				current_loop.index = i;
				current_event.retrigger();
			}
		}

		cr.clearArray(instances);
        this.runtime.popLoopStack();
		foreach_instanceptr--;
		return false;
    };
	
	function foreach_sortinstances(a, b)
	{
		var va = a.extra["c2_feo_val"];
		var vb = b.extra["c2_feo_val"];
		
		if (cr.is_number(va) && cr.is_number(vb))
			return va - vb;
		else
		{
			va = "" + va;
			vb = "" + vb;
			
			if (va < vb)
				return -1;
			else if (va > vb)
				return 1;
			else
				return 0;
		}
	};
	
	SysCnds.prototype.ForEachOrdered = function (obj, exp, order)
    {
        // Copy instances to iterate
        var sol = obj.getCurrentSol();
        
		// Push to foreach stack if necessary
		foreach_instanceptr++;
		if (foreach_instancestack.length === foreach_instanceptr)
			foreach_instancestack.push([]);
		
		var instances = foreach_instancestack[foreach_instanceptr];
		cr.shallowAssignArray(instances, sol.getObjects());

        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var current_condition = this.runtime.getCurrentCondition();
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack();

		// Re-calculate the expression evaluated for each individual instance in the SOL
		var i, len, j, lenj, inst, s, sol2;
		for (i = 0, len = instances.length; i < len; i++)
		{
			instances[i].extra["c2_feo_val"] = current_condition.parameters[1].get(i);
		}
		
		// Sort instances by the calculated values in ascending order (and reverse if descending)
		instances.sort(foreach_sortinstances);

		if (order === 1)
			instances.reverse();
			
		var is_contained = obj.is_contained;
		
		// From here, same as for-each
		if (solModifierAfterCnds)
		{
			for (i = 0, len = instances.length; i < len && !current_loop.stopped; i++)
			{
				this.runtime.pushCopySol(current_event.solModifiers);

				inst = instances[i];
				sol = obj.getCurrentSol();
				sol.select_all = false;
				cr.clearArray(sol.instances);
				sol.instances[0] = inst;
				
				if (is_contained)
				{
					for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
					{
						s = inst.siblings[j];
						sol2 = s.type.getCurrentSol();
						sol2.select_all = false;
						cr.clearArray(sol2.instances);
						sol2.instances[0] = s;
					}
				}

				current_loop.index = i;
				current_event.retrigger();

				this.runtime.popSol(current_event.solModifiers);
			}
		}
		else
		{
			sol.select_all = false;
			cr.clearArray(sol.instances);
			
			for (i = 0, len = instances.length; i < len && !current_loop.stopped; i++)
			{
				inst = instances[i];
				sol.instances[0] = inst;
				
				if (is_contained)
				{
					for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
					{
						s = inst.siblings[j];
						sol2 = s.type.getCurrentSol();
						sol2.select_all = false;
						cr.clearArray(sol2.instances);
						sol2.instances[0] = s;
					}
				}

				current_loop.index = i;
				current_event.retrigger();
			}
		}

		cr.clearArray(instances);
        this.runtime.popLoopStack();
		foreach_instanceptr--;
		return false;
    };
	
	SysCnds.prototype.PickByComparison = function (obj_, exp_, cmp_, val_)
	{
		var i, len, k, inst;
		
		if (!obj_)
			return;
		
		// Re-use foreach stack for temp arrays (expression to evaluate could call functions)
		foreach_instanceptr++;
		if (foreach_instancestack.length === foreach_instanceptr)
			foreach_instancestack.push([]);
		
		var tmp_instances = foreach_instancestack[foreach_instanceptr];
		
		// Copy the instances to process to tmp_instances.
		var sol = obj_.getCurrentSol();
		cr.shallowAssignArray(tmp_instances, sol.getObjects());
		
		if (sol.select_all)
			cr.clearArray(sol.else_instances);
		
		// All instances to process are now in tmp_instances. Filter them down to only
		// those meeting the condition; if any don't meet the condition, add them to else_instances.		
		var current_condition = this.runtime.getCurrentCondition();
		
		for (i = 0, k = 0, len = tmp_instances.length; i < len; i++)
		{
			inst = tmp_instances[i];
			tmp_instances[k] = inst;
			
			exp_ = current_condition.parameters[1].get(i);
			val_ = current_condition.parameters[3].get(i);
			
			if (cr.do_cmp(exp_, cmp_, val_))
			{
				k++;
			}
			else
			{
				sol.else_instances.push(inst);
			}
		}
		
		cr.truncateArray(tmp_instances, k);
		
		sol.select_all = false;
		cr.shallowAssignArray(sol.instances, tmp_instances);
		cr.clearArray(tmp_instances);
		
		foreach_instanceptr--;
		
		obj_.applySolToContainer();
		
		return !!sol.instances.length;
	};
	
	SysCnds.prototype.PickByEvaluate = function (obj_, exp_)
	{
		var i, len, k, inst;
		
		if (!obj_)
			return;
		
		// Re-use foreach stack for temp arrays (expression to evaluate could call functions)
		foreach_instanceptr++;
		if (foreach_instancestack.length === foreach_instanceptr)
			foreach_instancestack.push([]);
		
		var tmp_instances = foreach_instancestack[foreach_instanceptr];
		
		// Copy the instances to process to tmp_instances.
		var sol = obj_.getCurrentSol();
		cr.shallowAssignArray(tmp_instances, sol.getObjects());
		
		if (sol.select_all)
			cr.clearArray(sol.else_instances);
		
		// All instances to process are now in tmp_instances. Filter them down to only
		// those meeting the condition; if any don't meet the condition, add them to else_instances.		
		var current_condition = this.runtime.getCurrentCondition();
		
		for (i = 0, k = 0, len = tmp_instances.length; i < len; i++)
		{
			inst = tmp_instances[i];
			tmp_instances[k] = inst;
			
			exp_ = current_condition.parameters[1].get(i);
			
			if (exp_)
			{
				k++;
			}
			else
			{
				sol.else_instances.push(inst);
			}
		}
		
		cr.truncateArray(tmp_instances, k);
		
		sol.select_all = false;
		cr.shallowAssignArray(sol.instances, tmp_instances);
		cr.clearArray(tmp_instances);
		
		foreach_instanceptr--;
		
		obj_.applySolToContainer();
		
		return !!sol.instances.length;
	};

    SysCnds.prototype.TriggerOnce = function ()
    {
        // Store state in the owner condition
        var cndextra = this.runtime.getCurrentCondition().extra;

        // Get the last tick time that the condition was reached
		if (typeof cndextra["TriggerOnce_lastTick"] === "undefined")
			cndextra["TriggerOnce_lastTick"] = -1;
		
        var last_tick = cndextra["TriggerOnce_lastTick"];
        var cur_tick = this.runtime.tickcount;

        cndextra["TriggerOnce_lastTick"] = cur_tick;

        // If the last true tick was last tick, filter this call by returning false.
		// Always return true on the first tick of a layout, else restarting the current layout
		// doesn't re-run conditions filtered by 'trigger once'.
        return this.runtime.layout_first_tick || last_tick !== cur_tick - 1;
    };

    SysCnds.prototype.Every = function (seconds)
    {
        // Store state in the owner condition
        var cnd = this.runtime.getCurrentCondition();

        // Get the last time that the event ran
        var last_time = cnd.extra["Every_lastTime"] || 0;
        var cur_time = this.runtime.kahanTime.sum;
		
		// Only use the parameter every time the event runs
		if (typeof cnd.extra["Every_seconds"] === "undefined")
			cnd.extra["Every_seconds"] = seconds;
			
		var this_seconds = cnd.extra["Every_seconds"];

        // Delay has elapsed
        if (cur_time >= last_time + this_seconds)
        {
            cnd.extra["Every_lastTime"] = last_time + this_seconds;
			
			// If it's still over 40ms behind, just bring it up to date
			if (cur_time >= cnd.extra["Every_lastTime"] + 0.04)
			{
				cnd.extra["Every_lastTime"] = cur_time;
			}
			
			// Update the next time based on new parameter
			cnd.extra["Every_seconds"] = seconds;
			
            return true;
        }
		// Last triggered time is in the future (possible when using save/load): just bring timer up to date.
		else if (cur_time < last_time - 0.1)
		{
			cnd.extra["Every_lastTime"] = cur_time;
		}
        
		return false;
    };

    SysCnds.prototype.PickNth = function (obj, index)
    {
        if (!obj)
            return false;

        // Get the current sol
        var sol = obj.getCurrentSol();
        var instances = sol.getObjects();
		
		index = cr.floor(index);

        // Index out of range: condition false (no wraparound)
        if (index < 0 || index >= instances.length)
            return false;
			
		var inst = instances[index];

        // Set just the nth instance picked
        sol.pick_one(inst);
		obj.applySolToContainer();
        return true;
    };
	
	SysCnds.prototype.PickRandom = function (obj)
    {
        if (!obj)
            return false;

        // Get the current sol
        var sol = obj.getCurrentSol();
        var instances = sol.getObjects();
		
		var index = cr.floor(Math.random() * instances.length);

        // Index out of range: condition false (no wraparound)
        if (index >= instances.length)
            return false;
			
		var inst = instances[index];

        // Set just the nth instance picked
        sol.pick_one(inst);
		obj.applySolToContainer();
        return true;
    };
	
	SysCnds.prototype.CompareVar = function (v, cmp, val)
    {
        return cr.do_cmp(v.getValue(), cmp, val);
    };

    SysCnds.prototype.IsGroupActive = function (group)
    {
		var g = this.runtime.groups_by_name[group.toLowerCase()];
        return g && g.group_active;
    };
	
	SysCnds.prototype.IsPreview = function ()
	{
		return typeof cr_is_preview !== "undefined";
	};
	
	SysCnds.prototype.PickAll = function (obj)
    {
        if (!obj)
            return false;
			
		if (!obj.instances.length)
			return false;

        // Get the current sol and reset the select_all flag
        var sol = obj.getCurrentSol();
        sol.select_all = true;
		obj.applySolToContainer();
        return true;
    };
	
	SysCnds.prototype.IsMobile = function ()
	{
		return this.runtime.isMobile;
	};
	
	SysCnds.prototype.CompareBetween = function (x, a, b)
	{
		return x >= a && x <= b;
	};
	
	SysCnds.prototype.Else = function ()
	{
		var current_frame = this.runtime.getCurrentEventStack();
	
		if (current_frame.else_branch_ran)
			return false;		// another event in this else-if chain has run
		else
			return !current_frame.last_event_true;
		
		// TODO: picking Else implementation
		/*
		var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var prev_event = current_event.prev_block;
		
		if (!prev_event)
			return false;
			
		// If previous event is "logical" (e.g. is purely system conditions),
		// run solely based on if the last event did not run.
		if (prev_event.is_logical)
			return !this.runtime.last_event_true;
	
		// Otherwise, invert the picked object's SOLs (swap with the else_instances)
		// and run with those instances.
		var i, len, j, lenj, s, sol, temp, inst, any_picked = false;
		for (i = 0, len = prev_event.cndReferences.length; i < len; i++)
		{
			s = prev_event.cndReferences[i];
			sol = s.getCurrentSol();
			
			// All picked: pick none
			if (sol.select_all || sol.instances.length === s.instances.length)
			{
				sol.select_all = false;
				sol.instances.length = 0;
			}
			// Some picked: swap the pick lists to invert
			else
			{
				// Static conditions sometimes set one instance without filling else_instances.
				// In this case copy in all instances except the one picked.
				if (sol.instances.length === 1 && sol.else_instances.length === 0 && s.instances.length >= 2)
				{
					inst = sol.instances[0];
					sol.instances.length = 0;
					
					for (j = 0, lenj = s.instances.length; j < lenj; j++)
					{
						if (s.instances[j] != inst)
							sol.instances.push(s.instances[j]);
					}
					
					any_picked = true;
				}
				else
				{
					// Swap the picked instances with else_instances set by the preceding event
					temp = sol.instances;
					sol.instances = sol.else_instances;
					sol.else_instances = temp;
					any_picked = true;
				}
			}
		}
		
		// Nothing picked at all (all SOLs reverted to empty): event will do nothing, do not run
		return any_picked;
		*/
	};
	
	SysCnds.prototype.OnLoadFinished = function ()
	{
		return true;
	};
	
	SysCnds.prototype.OnCanvasSnapshot = function ()
	{
		return true;
	};
	
	SysCnds.prototype.EffectsSupported = function ()
	{
		return !!this.runtime.glwrap;
	};
	
	SysCnds.prototype.OnSaveComplete = function ()
	{
		return true;
	};
	
	SysCnds.prototype.OnSaveFailed = function ()
	{
		return true;
	};
	
	SysCnds.prototype.OnLoadComplete = function ()
	{
		return true;
	};
	
	SysCnds.prototype.OnLoadFailed = function ()
	{
		return true;
	};
	
	SysCnds.prototype.ObjectUIDExists = function (u)
	{
		return !!this.runtime.getObjectByUID(u);
	};
	
	SysCnds.prototype.IsOnPlatform = function (p)
	{
		var rt = this.runtime;
		
		switch (p) {
		case 0:		// HTML5 website
			return !rt.isDomFree && !rt.isNodeWebkit && !rt.isCordova && !rt.isWinJS && !rt.isWindowsPhone8 && !rt.isBlackberry10 && !rt.isAmazonWebApp;
		case 1:		// iOS
			return rt.isiOS;
		case 2:		// Android
			return rt.isAndroid;
		case 3:		// Windows 8
			return rt.isWindows8App;
		case 4:		// Windows Phone 8
			return rt.isWindowsPhone8;
		case 5:		// Blackberry 10
			return rt.isBlackberry10;
		case 6:		// Tizen
			return rt.isTizen;
		case 7:		// CocoonJS
			return rt.isCocoonJs;
		case 8:		// Cordova
			return rt.isCordova;
		case 9:	// Scirra Arcade
			return rt.isArcade;
		case 10:	// node-webkit
			return rt.isNodeWebkit;
		case 11:	// crosswalk
			return rt.isCrosswalk;
		case 12:	// amazon webapp
			return rt.isAmazonWebApp;
		case 13:	// windows 10 app
			return rt.isWindows10;
		default:	// should not be possible
			return false;
		}
	};
	
	var cacheRegex = null;
	var lastRegex = "";
	var lastFlags = "";
	
	function getRegex(regex_, flags_)
	{
		// To allow RegExp objects to be compiled efficiently, keep re-using the same RegExp
		// object until the regex or flags change
		if (!cacheRegex || regex_ !== lastRegex || flags_ !== lastFlags)
		{
			cacheRegex = new RegExp(regex_, flags_);
			lastRegex = regex_;
			lastFlags = flags_;
		}
		
		cacheRegex.lastIndex = 0;		// reset
		return cacheRegex;
	};
	
	SysCnds.prototype.RegexTest = function (str_, regex_, flags_)
	{
		var regex = getRegex(regex_, flags_);
		
		return regex.test(str_);
	};
	
	var tmp_arr = [];
	
	SysCnds.prototype.PickOverlappingPoint = function (obj_, x_, y_)
	{
		if (!obj_)
            return false;

        // Get the current sol
        var sol = obj_.getCurrentSol();
        var instances = sol.getObjects();
		var current_event = this.runtime.getCurrentEventStack().current_event;
		var orblock = current_event.orblock;
		
		var cnd = this.runtime.getCurrentCondition();
		var i, len, inst, pick;
		
		if (sol.select_all)
		{
			cr.shallowAssignArray(tmp_arr, instances);
			cr.clearArray(sol.else_instances);
			sol.select_all = false;
			cr.clearArray(sol.instances);
		}
		else
		{
			if (orblock)
			{
				cr.shallowAssignArray(tmp_arr, sol.else_instances);
				cr.clearArray(sol.else_instances);
			}
			else
			{
				cr.shallowAssignArray(tmp_arr, instances);
				cr.clearArray(sol.instances);
			}
		}
		
		for (i = 0, len = tmp_arr.length; i < len; ++i)
		{
			inst = tmp_arr[i];
			inst.update_bbox();
			
			pick = cr.xor(inst.contains_pt(x_, y_), cnd.inverted);
			
			if (pick)
				sol.instances.push(inst);
			else
				sol.else_instances.push(inst);
		}
		
		obj_.applySolToContainer();
		
		return cr.xor(!!sol.instances.length, cnd.inverted);
	};
	
	SysCnds.prototype.IsNaN = function (n)
	{
		return !!isNaN(n);
	};
	
	SysCnds.prototype.AngleWithin = function (a1, within, a2)
	{
		return cr.angleDiff(cr.to_radians(a1), cr.to_radians(a2)) <= cr.to_radians(within);
	};
	
	SysCnds.prototype.IsClockwiseFrom = function (a1, a2)
	{
		return cr.angleClockwise(cr.to_radians(a1), cr.to_radians(a2));
	};
	
	SysCnds.prototype.IsBetweenAngles = function (a, la, ua)
	{
		var angle = cr.to_clamped_radians(a);
		var lower = cr.to_clamped_radians(la);
		var upper = cr.to_clamped_radians(ua);
		var obtuse = (!cr.angleClockwise(upper, lower));
		
		// Handle differently when angle range is over 180 degrees, since angleClockwise only tests if within
		// 180 degrees clockwise of the angle
		if (obtuse)
			return !(!cr.angleClockwise(angle, lower) && cr.angleClockwise(angle, upper));
		else
			return cr.angleClockwise(angle, lower) && !cr.angleClockwise(angle, upper);
	};
	
	SysCnds.prototype.IsValueType = function (x, t)
	{
		if (typeof x === "number")
			return t === 0;
		else		// string
			return t === 1;
	};
	
	sysProto.cnds = new SysCnds();

	//////////////////////////////
	// System actions
    function SysActs() {};

    SysActs.prototype.GoToLayout = function (to)
    {
		if (this.runtime.isloading)
			return;		// cannot change layout while loading on loader layout
			
		if (this.runtime.changelayout)
			return;		// already changing to a different layout
		
		log("Go to layout: " + to.name);
        this.runtime.changelayout = to;
    };
	
	SysActs.prototype.NextPrevLayout = function (prev)
    {
		if (this.runtime.isloading)
			return;		// cannot change layout while loading on loader layout
			
		if (this.runtime.changelayout)
			return;		// already changing to a different layout
		
		var index = this.runtime.layouts_by_index.indexOf(this.runtime.running_layout);
		
		if (prev && index === 0)	
			return;		// cannot go to previous layout from first layout
		
		if (!prev && index === this.runtime.layouts_by_index.length - 1)
			return;		// cannot go to next layout from last layout
		
		var to = this.runtime.layouts_by_index[index + (prev ? -1 : 1)];
		
		log("Go to layout: " + to.name);
        this.runtime.changelayout = to;
    };

    SysActs.prototype.CreateObject = function (obj, layer, x, y)
    {
        if (!layer || !obj)
            return;

        var inst = this.runtime.createInstance(obj, layer, x, y);
		
		if (!inst)
			return;
		
		this.runtime.isInOnDestroy++;
		
		var i, len, s;
		this.runtime.trigger(Object.getPrototypeOf(obj.plugin).cnds.OnCreated, inst);
		
		if (inst.is_contained)
		{
			for (i = 0, len = inst.siblings.length; i < len; i++)
			{
				s = inst.siblings[i];
				this.runtime.trigger(Object.getPrototypeOf(s.type.plugin).cnds.OnCreated, s);
			}
		}
		
		this.runtime.isInOnDestroy--;

        // Pick just this instance
        var sol = obj.getCurrentSol();
        sol.select_all = false;
		cr.clearArray(sol.instances);
		sol.instances[0] = inst;
		
		// Siblings aren't in instance lists yet, pick them manually
		if (inst.is_contained)
		{
			for (i = 0, len = inst.siblings.length; i < len; i++)
			{
				s = inst.siblings[i];
				sol = s.type.getCurrentSol();
				sol.select_all = false;
				cr.clearArray(sol.instances);
				sol.instances[0] = s;
			}
		}
    };

    SysActs.prototype.SetLayerVisible = function (layer, visible_)
    {
        if (!layer)
            return;

		if (layer.visible !== visible_)
		{
			layer.visible = visible_;
			this.runtime.redraw = true;
		}
    };
	
	SysActs.prototype.SetLayerOpacity = function (layer, opacity_)
	{
		if (!layer)
			return;
			
		opacity_ = cr.clamp(opacity_ / 100, 0, 1);
		
		if (layer.opacity !== opacity_)
		{
			layer.opacity = opacity_;
			this.runtime.redraw = true;
		}
	};
	
	SysActs.prototype.SetLayerScaleRate = function (layer, sr)
	{
		if (!layer)
			return;
			
		if (layer.zoomRate !== sr)
		{
			layer.zoomRate = sr;
			this.runtime.redraw = true;
		}
	};
	
	SysActs.prototype.SetLayerForceOwnTexture = function (layer, f)
	{
		if (!layer)
			return;
		
		f = !!f;
		
		if (layer.forceOwnTexture !== f)
		{
			layer.forceOwnTexture = f;
			this.runtime.redraw = true;
		}
	};
	
	SysActs.prototype.SetLayoutScale = function (s)
	{
		if (!this.runtime.running_layout)
			return;
			
		if (this.runtime.running_layout.scale !== s)
		{
			this.runtime.running_layout.scale = s;
			this.runtime.running_layout.boundScrolling();
			this.runtime.redraw = true;
		}
	};

    SysActs.prototype.ScrollX = function(x)
    {
        this.runtime.running_layout.scrollToX(x);
    };

    SysActs.prototype.ScrollY = function(y)
    {
        this.runtime.running_layout.scrollToY(y);
    };

    SysActs.prototype.Scroll = function(x, y)
    {
        this.runtime.running_layout.scrollToX(x);
        this.runtime.running_layout.scrollToY(y);
    };

    SysActs.prototype.ScrollToObject = function(obj)
    {
        var inst = obj.getFirstPicked();

        if (inst)
        {
            this.runtime.running_layout.scrollToX(inst.x);
            this.runtime.running_layout.scrollToY(inst.y);
        }
    };
	
	SysActs.prototype.SetVar = function(v, x)
	{
		assert2(!v.is_constant, "Setting a constant event variable");
		
		// Number
		if (v.vartype === 0)
		{
			if (cr.is_number(x))
				v.setValue(x);
			else
				v.setValue(parseFloat(x));
		}
		// String
		else if (v.vartype === 1)
			v.setValue(x.toString());
	};
	
	SysActs.prototype.AddVar = function(v, x)
	{
		assert2(!v.is_constant, "Setting a constant event variable");
		
		// Number
		if (v.vartype === 0)
		{
			if (cr.is_number(x))
				v.setValue(v.getValue() + x);
			else
				v.setValue(v.getValue() + parseFloat(x));
		}
		// String
		else if (v.vartype === 1)
			v.setValue(v.getValue() + x.toString());
	};
	
	SysActs.prototype.SubVar = function(v, x)
	{
		assert2(!v.is_constant, "Setting a constant event variable");
		
		// Number
		if (v.vartype === 0)
		{
			if (cr.is_number(x))
				v.setValue(v.getValue() - x);
			else
				v.setValue(v.getValue() - parseFloat(x));
		}
	};

    SysActs.prototype.SetGroupActive = function (group, active)
    {
		var g = this.runtime.groups_by_name[group.toLowerCase()];
		
		if (!g)
			return;
		
		switch (active) {
		// Disable
		case 0:
			g.setGroupActive(false);
			break;
		// Enable
		case 1:
			g.setGroupActive(true);
			break;
		// Toggle
		case 2:
			g.setGroupActive(!g.group_active);
			break;
		}
    };

    SysActs.prototype.SetTimescale = function (ts_)
    {
        var ts = ts_;

        if (ts < 0)
            ts = 0;

        this.runtime.timescale = ts;
    };

    SysActs.prototype.SetObjectTimescale = function (obj, ts_)
    {
        var ts = ts_;

        if (ts < 0)
            ts = 0;

        if (!obj)
            return;

        // Get the current sol
        var sol = obj.getCurrentSol();
        var instances = sol.getObjects();

        // Set all timescales
        var i, len;
        for (i = 0, len = instances.length; i < len; i++)
        {
            instances[i].my_timescale = ts;
        }
    };

    SysActs.prototype.RestoreObjectTimescale = function (obj)
    {
        if (!obj)
            return false;

        // Get the current sol
        var sol = obj.getCurrentSol();
        var instances = sol.getObjects();

        // Set all timescales to -1, to indicate game time
        var i, len;
        for (i = 0, len = instances.length; i < len; i++)
        {
            instances[i].my_timescale = -1.0;
        }
    };
	
	var waitobjrecycle = [];
	
	function allocWaitObject()
	{
		var w;
		
		if (waitobjrecycle.length)
			w = waitobjrecycle.pop();
		else
		{
			w = {};
			w.sols = {};
			w.solModifiers = [];
		}
		
		w.deleteme = false;
		return w;
	};
	
	function freeWaitObject(w)
	{
		cr.wipe(w.sols);
		cr.clearArray(w.solModifiers);
		waitobjrecycle.push(w);
	};
	
	var solstateobjects = [];
	
	function allocSolStateObject()
	{
		var s;
		
		if (solstateobjects.length)
			s = solstateobjects.pop();
		else
		{
			s = {};
			s.insts = [];
		}
		
		s.sa = false;
		return s;
	};
	
	function freeSolStateObject(s)
	{
		cr.clearArray(s.insts);
		solstateobjects.push(s);
	};
	
	SysActs.prototype.Wait = function (seconds)
	{
		if (seconds < 0)
			return;
		
		var i, len, s, t, ss;
		var evinfo = this.runtime.getCurrentEventStack();
		
		// Add a new wait record with the current SOL state and scheduled time
		var waitobj = allocWaitObject();
		waitobj.time = this.runtime.kahanTime.sum + seconds;
		waitobj.signaltag = "";
		waitobj.signalled = false;
		waitobj.ev = evinfo.current_event;
		waitobj.actindex = evinfo.actindex + 1;	// pointing at next action
		
		for (i = 0, len = this.runtime.types_by_index.length; i < len; i++)
		{
			t = this.runtime.types_by_index[i];
			s = t.getCurrentSol();
			
			if (s.select_all && evinfo.current_event.solModifiers.indexOf(t) === -1)
				continue;
				
			// Copy selected instances
			waitobj.solModifiers.push(t);
			ss = allocSolStateObject();
			ss.sa = s.select_all;
			cr.shallowAssignArray(ss.insts, s.instances);
			waitobj.sols[i.toString()] = ss;
		}
		
		this.waits.push(waitobj);
		
		// Return true so the current event cancels in run_actions_and_subevents()
		return true;
	};
	
	SysActs.prototype.WaitForSignal = function (tag)
	{
		var i, len, s, t, ss;
		var evinfo = this.runtime.getCurrentEventStack();
		
		// Add a new wait record with the current SOL state and scheduled time
		var waitobj = allocWaitObject();
		waitobj.time = -1;
		waitobj.signaltag = tag.toLowerCase();
		waitobj.signalled = false;
		waitobj.ev = evinfo.current_event;
		waitobj.actindex = evinfo.actindex + 1;	// pointing at next action
		
		for (i = 0, len = this.runtime.types_by_index.length; i < len; i++)
		{
			t = this.runtime.types_by_index[i];
			s = t.getCurrentSol();
			
			if (s.select_all && evinfo.current_event.solModifiers.indexOf(t) === -1)
				continue;
				
			// Copy selected instances
			waitobj.solModifiers.push(t);
			ss = allocSolStateObject();
			ss.sa = s.select_all;
			cr.shallowAssignArray(ss.insts, s.instances);
			waitobj.sols[i.toString()] = ss;
		}
		
		this.waits.push(waitobj);
		
		// Return true so the current event cancels in run_actions_and_subevents()
		return true;
	};
	
	SysActs.prototype.Signal = function (tag)
	{
		// Mark all waiting events with the same tag as signalled
		var lowertag = tag.toLowerCase();
		
		var i, len, w;
		
		for (i = 0, len = this.waits.length; i < len; ++i)
		{
			w = this.waits[i];
			
			if (w.time !== -1)
				continue;					// timer wait, ignore
			
			if (w.signaltag === lowertag)	// waiting for this signal
				w.signalled = true;			// will run on next check
		}
	};
	
	SysActs.prototype.SetLayerScale = function (layer, scale)
    {
        if (!layer)
            return;

		if (layer.scale === scale)
			return;
			
        layer.scale = scale;
        this.runtime.redraw = true;
    };
	
	SysActs.prototype.ResetGlobals = function ()
	{
		var i, len, g;
		for (i = 0, len = this.runtime.all_global_vars.length; i < len; i++)
		{
			g = this.runtime.all_global_vars[i];
			g.data = g.initial;
		}
	};
	
	SysActs.prototype.SetLayoutAngle = function (a)
	{
		a = cr.to_radians(a);
		a = cr.clamp_angle(a);
		
		if (this.runtime.running_layout)
		{
			if (this.runtime.running_layout.angle !== a)
			{
				this.runtime.running_layout.angle = a;
				this.runtime.redraw = true;
			}
		}
	};
	
	SysActs.prototype.SetLayerAngle = function (layer, a)
    {
        if (!layer)
            return;
			
		a = cr.to_radians(a);
		a = cr.clamp_angle(a);

		if (layer.angle === a)
			return;
			
        layer.angle = a;
        this.runtime.redraw = true;
    };
	
	SysActs.prototype.SetLayerParallax = function (layer, px, py)
    {
        if (!layer)
            return;
			
		if (layer.parallaxX === px / 100 && layer.parallaxY === py / 100)
			return;
			
        layer.parallaxX = px / 100;
		layer.parallaxY = py / 100;
		
		// If layer is now parallaxed, update types any_instance_parallaxed flag
		if (layer.parallaxX !== 1 || layer.parallaxY !== 1)
		{
			var i, len, instances = layer.instances;
			for (i = 0, len = instances.length; i < len; ++i)
			{
				instances[i].type.any_instance_parallaxed = true;
			}
		}
		
        this.runtime.redraw = true;
    };
	
	SysActs.prototype.SetLayerBackground = function (layer, c)
    {
        if (!layer)
            return;
			
		var r = cr.GetRValue(c);
		var g = cr.GetGValue(c);
		var b = cr.GetBValue(c);
			
		if (layer.background_color[0] === r && layer.background_color[1] === g && layer.background_color[2] === b)
			return;
			
        layer.background_color[0] = r;
		layer.background_color[1] = g;
		layer.background_color[2] = b;
        this.runtime.redraw = true;
    };
	
	SysActs.prototype.SetLayerTransparent = function (layer, t)
    {
        if (!layer)
            return;
			
		if (!!t === !!layer.transparent)
			return;
			
		layer.transparent = !!t;
        this.runtime.redraw = true;
    };
	
	SysActs.prototype.SetLayerBlendMode = function (layer, bm)
    {
        if (!layer)
            return;
			
		if (layer.blend_mode === bm)
			return;
			
		layer.blend_mode = bm;
		layer.compositeOp = cr.effectToCompositeOp(layer.blend_mode);
		
		if (this.runtime.gl)
			cr.setGLBlend(layer, layer.blend_mode, this.runtime.gl);
		
        this.runtime.redraw = true;
    };
	
	SysActs.prototype.StopLoop = function ()
	{
		if (this.runtime.loop_stack_index < 0)
			return;		// no loop currently running
			
		// otherwise mark loop stopped
		this.runtime.getCurrentLoop().stopped = true;
	};
	
	SysActs.prototype.GoToLayoutByName = function (layoutname)
	{
		if (this.runtime.isloading)
			return;		// cannot change layout while loading on loader layout
			
		if (this.runtime.changelayout)
			return;		// already changing to different layout
		
		log("Go to layout: " + layoutname);
		
		// Find layout name with correct case
		var l;
		for (l in this.runtime.layouts)
		{
			if (this.runtime.layouts.hasOwnProperty(l) && cr.equals_nocase(l, layoutname))
			{
				this.runtime.changelayout = this.runtime.layouts[l];
				return;
			}
		}
	};
	
	SysActs.prototype.RestartLayout = function (layoutname)
	{
		if (this.runtime.isloading)
			return;		// cannot restart loader layouts
			
		if (this.runtime.changelayout)
			return;		// already changing to a different layout
		
		log("Restarting layout");
		
		if (!this.runtime.running_layout)
			return;
			
		// Change to current layout - will restart the layout
		this.runtime.changelayout = this.runtime.running_layout;
		
		// Reset all group initial activations
		var i, len, g;
		for (i = 0, len = this.runtime.allGroups.length; i < len; i++)
		{
			g = this.runtime.allGroups[i];
			g.setGroupActive(g.initially_activated);
		}
	};
	
	SysActs.prototype.SnapshotCanvas = function (format_, quality_)
	{
		this.runtime.doCanvasSnapshot(format_ === 0 ? "image/png" : "image/jpeg", quality_ / 100);
	};
	
	SysActs.prototype.SetCanvasSize = function (w, h)
	{
		if (w <= 0 || h <= 0)
			return;
		
		var mode = this.runtime.fullscreen_mode;
		
		var isfullscreen = (document["mozFullScreen"] || document["webkitIsFullScreen"] || !!document["msFullscreenElement"] || document["fullScreen"] || this.runtime.isNodeFullscreen);
		
		if (isfullscreen && this.runtime.fullscreen_scaling > 0)
			mode = this.runtime.fullscreen_scaling;
		
		if (mode === 0)
		{
			this.runtime["setSize"](w, h, true);
		}
		else
		{
			// fullscreen mode: effectively change the project 'window size' property
			this.runtime.original_width = w;
			this.runtime.original_height = h;
			this.runtime["setSize"](this.runtime.lastWindowWidth, this.runtime.lastWindowHeight, true);
		}
	};
	
	SysActs.prototype.SetLayoutEffectEnabled = function (enable_, effectname_)
	{
		if (!this.runtime.running_layout || !this.runtime.glwrap)
			return;
			
		var et = this.runtime.running_layout.getEffectByName(effectname_);
		
		if (!et)
			return;		// effect name not found
			
		var enable = (enable_ === 1);
		
		if (et.active == enable)
			return;		// no change
			
		et.active = enable;
		this.runtime.running_layout.updateActiveEffects();
		this.runtime.redraw = true;
	};
	
	SysActs.prototype.SetLayerEffectEnabled = function (layer, enable_, effectname_)
	{
		if (!layer || !this.runtime.glwrap)
			return;
			
		var et = layer.getEffectByName(effectname_);
		
		if (!et)
			return;		// effect name not found
			
		var enable = (enable_ === 1);
		
		if (et.active == enable)
			return;		// no change
			
		et.active = enable;
		layer.updateActiveEffects();
		this.runtime.redraw = true;
	};
	
	SysActs.prototype.SetLayoutEffectParam = function (effectname_, index_, value_)
	{
		if (!this.runtime.running_layout || !this.runtime.glwrap)
			return;
			
		var et = this.runtime.running_layout.getEffectByName(effectname_);
		
		if (!et)
			return;		// effect name not found
			
		var params = this.runtime.running_layout.effect_params[et.index];
			
		index_ = Math.floor(index_);
		
		if (index_ < 0 || index_ >= params.length)
			return;		// effect index out of bounds
			
		// Percent param: divide by 100
		if (this.runtime.glwrap.getProgramParameterType(et.shaderindex, index_) === 1)
			value_ /= 100.0;
		
		if (params[index_] === value_)
			return;		// no change
			
		params[index_] = value_;
		
		if (et.active)
			this.runtime.redraw = true;
	};
	
	SysActs.prototype.SetLayerEffectParam = function (layer, effectname_, index_, value_)
	{
		if (!layer || !this.runtime.glwrap)
			return;
			
		var et = layer.getEffectByName(effectname_);
		
		if (!et)
			return;		// effect name not found
			
		var params = layer.effect_params[et.index];
			
		index_ = Math.floor(index_);
		
		if (index_ < 0 || index_ >= params.length)
			return;		// effect index out of bounds
			
		// Percent param: divide by 100
		if (this.runtime.glwrap.getProgramParameterType(et.shaderindex, index_) === 1)
			value_ /= 100.0;
		
		if (params[index_] === value_)
			return;		// no change
			
		params[index_] = value_;
		
		if (et.active)
			this.runtime.redraw = true;
	};
	
	SysActs.prototype.SaveState = function (slot_)
	{
		this.runtime.saveToSlot = slot_;
	};
	
	SysActs.prototype.LoadState = function (slot_)
	{
		this.runtime.loadFromSlot = slot_;
	};
	
	SysActs.prototype.LoadStateJSON = function (jsonstr_)
	{
		this.runtime.loadFromJson = jsonstr_;
	};
	
	SysActs.prototype.SetHalfFramerateMode = function (set_)
	{
		this.runtime.halfFramerateMode = (set_ !== 0);
	};
	
	SysActs.prototype.SetFullscreenQuality = function (q)
	{
		var isfullscreen = (document["mozFullScreen"] || document["webkitIsFullScreen"] || !!document["msFullscreenElement"] || document["fullScreen"] || this.isNodeFullscreen);
		
		if (!isfullscreen && this.runtime.fullscreen_mode === 0)
			return;
		
		this.runtime.wantFullscreenScalingQuality = (q !== 0);
		this.runtime["setSize"](this.runtime.lastWindowWidth, this.runtime.lastWindowHeight, true);
	};
	
	SysActs.prototype.ResetPersisted = function ()
	{
		var i, len;
		for (i = 0, len = this.runtime.layouts_by_index.length; i < len; ++i)
		{
			this.runtime.layouts_by_index[i].persist_data = {};
			this.runtime.layouts_by_index[i].first_visit = true;
		}
	};
	
	SysActs.prototype.RecreateInitialObjects = function (obj, x1, y1, x2, y2)
	{
		if (!obj)
			return;
		
		this.runtime.running_layout.recreateInitialObjects(obj, x1, y1, x2, y2);
	};
	
	SysActs.prototype.SetPixelRounding = function (m)
	{
		this.runtime.pixel_rounding = (m !== 0);
		this.runtime.redraw = true;
	};
	
	SysActs.prototype.SetMinimumFramerate = function (f)
	{
		if (f < 1)
			f = 1;
		if (f > 120)
			f = 120;
		
		this.runtime.minimumFramerate = f;
	};
	
	sysProto.acts = new SysActs();

	//////////////////////////////
	// System expressions
    function SysExps() {};

    SysExps.prototype["int"] = function(ret, x)
    {
        if (cr.is_string(x))
        {
            ret.set_int(parseInt(x, 10));

            // Don't allow invalid conversions to return NaN
            if (isNaN(ret.data))
                ret.data = 0;
        }
        else
            ret.set_int(x);
    };

    SysExps.prototype["float"] = function(ret, x)
    {
        if (cr.is_string(x))
        {
            ret.set_float(parseFloat(x));

            // Don't allow invalid conversions to return NaN
            if (isNaN(ret.data))
                ret.data = 0;
        }
        else
            ret.set_float(x);
    };

    SysExps.prototype.str = function(ret, x)
    {
        if (cr.is_string(x))
            ret.set_string(x);
        else
            ret.set_string(x.toString());
    };

    SysExps.prototype.len = function(ret, x)
    {
        ret.set_int(x.length || 0);
    };

    SysExps.prototype.random = function (ret, a, b)
    {
        // b not provided: random number from 0 to a
        if (b === undefined)
        {
            ret.set_float(Math.random() * a);
        }
        else
        {
            // Return random number between a and b
            ret.set_float(Math.random() * (b - a) + a);
        }
    };

    SysExps.prototype.sqrt = function(ret, x)
    {
        ret.set_float(Math.sqrt(x));
    };

    SysExps.prototype.abs = function(ret, x)
    {
        ret.set_float(Math.abs(x));
    };

    SysExps.prototype.round = function(ret, x)
    {
        ret.set_int(Math.round(x));
    };

    SysExps.prototype.floor = function(ret, x)
    {
        ret.set_int(Math.floor(x));
    };

    SysExps.prototype.ceil = function(ret, x)
    {
        ret.set_int(Math.ceil(x));
    };

    SysExps.prototype.sin = function(ret, x)
    {
        ret.set_float(Math.sin(cr.to_radians(x)));
    };

    SysExps.prototype.cos = function(ret, x)
    {
        ret.set_float(Math.cos(cr.to_radians(x)));
    };

    SysExps.prototype.tan = function(ret, x)
    {
        ret.set_float(Math.tan(cr.to_radians(x)));
    };

    SysExps.prototype.asin = function(ret, x)
    {
        ret.set_float(cr.to_degrees(Math.asin(x)));
    };

    SysExps.prototype.acos = function(ret, x)
    {
        ret.set_float(cr.to_degrees(Math.acos(x)));
    };

    SysExps.prototype.atan = function(ret, x)
    {
        ret.set_float(cr.to_degrees(Math.atan(x)));
    };

    SysExps.prototype.exp = function(ret, x)
    {
        ret.set_float(Math.exp(x));
    };

    SysExps.prototype.ln = function(ret, x)
    {
        ret.set_float(Math.log(x));
    };

    SysExps.prototype.log10 = function(ret, x)
    {
        ret.set_float(Math.log(x) / Math.LN10);
    };

    SysExps.prototype.max = function(ret)
    {
		var max_ = arguments[1];
		
		if (typeof max_ !== "number")
			max_ = 0;
		
		var i, len, a;
		for (i = 2, len = arguments.length; i < len; i++)
		{
			a = arguments[i];
			
			if (typeof a !== "number")
				continue;		// ignore non-numeric types
			
			if (max_ < a)
				max_ = a;
		}
		
		ret.set_float(max_);
    };

    SysExps.prototype.min = function(ret)
    {
        var min_ = arguments[1];
		
		if (typeof min_ !== "number")
			min_ = 0;
		
		var i, len, a;
		for (i = 2, len = arguments.length; i < len; i++)
		{
			a = arguments[i];
			
			if (typeof a !== "number")
				continue;		// ignore non-numeric types
			
			if (min_ > a)
				min_ = a;
		}
		
		ret.set_float(min_);
    };

    SysExps.prototype.dt = function(ret)
    {
        ret.set_float(this.runtime.dt);
    };

    SysExps.prototype.timescale = function(ret)
    {
        ret.set_float(this.runtime.timescale);
    };

    SysExps.prototype.wallclocktime = function(ret)
    {
        ret.set_float((Date.now() - this.runtime.start_time) / 1000.0);
    };

    SysExps.prototype.time = function(ret)
    {
        // Use the sum of dt's so far, so timescale is taken in to account
        ret.set_float(this.runtime.kahanTime.sum);
    };

    SysExps.prototype.tickcount = function(ret)
    {
        ret.set_int(this.runtime.tickcount);
    };

    SysExps.prototype.objectcount = function(ret)
    {
        ret.set_int(this.runtime.objectcount);
    };

    SysExps.prototype.fps = function(ret)
    {
        ret.set_int(this.runtime.fps);
    };

    SysExps.prototype.loopindex = function(ret, name_)
    {
		var loop, i, len;
		
        // No loop running: return 0
        if (!this.runtime.loop_stack.length)
        {
            ret.set_int(0);
            return;
        }

        // Name provided: find in loop stack
        if (name_)
        {
			// Note search from the top of the stack downwards, since if there are two nested loops both using the same name
			// (either by accident or e.g. due to function calls where there are two loops in use with index "i") then the
			// named loopindex expression should return the topmost loop's index only.
            for (i = this.runtime.loop_stack_index; i >= 0; --i)
            {
                loop = this.runtime.loop_stack[i];

                if (loop.name === name_)
                {
                    ret.set_int(loop.index);
                    return;
                }
            }

            // Not found
            ret.set_int(0);
        }
        // Name not provided: use top of loop stack
        else
        {
			loop = this.runtime.getCurrentLoop();
			ret.set_int(loop ? loop.index : -1);
        }
    };

    SysExps.prototype.distance = function(ret, x1, y1, x2, y2)
    {
        ret.set_float(cr.distanceTo(x1, y1, x2, y2));
    };

    SysExps.prototype.angle = function(ret, x1, y1, x2, y2)
    {
        ret.set_float(cr.to_degrees(cr.angleTo(x1, y1, x2, y2)));
    };

    SysExps.prototype.scrollx = function(ret)
    {
        ret.set_float(this.runtime.running_layout.scrollX);
    };

    SysExps.prototype.scrolly = function(ret)
    {
        ret.set_float(this.runtime.running_layout.scrollY);
    };

    SysExps.prototype.newline = function(ret)
    {
        ret.set_string("\n");
    };

    SysExps.prototype.lerp = function(ret, a, b, x)
    {
        ret.set_float(cr.lerp(a, b, x));
    };
	
	SysExps.prototype.qarp = function(ret, a, b, c, x)
    {
        ret.set_float(cr.qarp(a, b, c, x));
    };
	
	SysExps.prototype.cubic = function(ret, a, b, c, d, x)
    {
        ret.set_float(cr.cubic(a, b, c, d, x));
    };
	
	SysExps.prototype.cosp = function(ret, a, b, x)
    {
        ret.set_float(cr.cosp(a, b, x));
    };

    SysExps.prototype.windowwidth = function(ret)
    {
        ret.set_int(this.runtime.width);
    };

    SysExps.prototype.windowheight = function(ret)
    {
        ret.set_int(this.runtime.height);
    };
	
	SysExps.prototype.uppercase = function(ret, str)
	{
		ret.set_string(cr.is_string(str) ? str.toUpperCase() : "");
	};
	
	SysExps.prototype.lowercase = function(ret, str)
	{
		ret.set_string(cr.is_string(str) ? str.toLowerCase() : "");
	};
	
	SysExps.prototype.clamp = function(ret, x, l, u)
	{
		if (x < l)
			ret.set_float(l);
		else if (x > u)
			ret.set_float(u);
		else
			ret.set_float(x);
	};
	
	SysExps.prototype.layerscale = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_float(0);
		else
			ret.set_float(layer.scale);
	};
	
	SysExps.prototype.layeropacity = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_float(0);
		else
			ret.set_float(layer.opacity * 100);
	};
	
	SysExps.prototype.layerscalerate = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_float(0);
		else
			ret.set_float(layer.zoomRate);
	};
	
	SysExps.prototype.layerparallaxx = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_float(0);
		else
			ret.set_float(layer.parallaxX * 100);
	};
	
	SysExps.prototype.layerparallaxy = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_float(0);
		else
			ret.set_float(layer.parallaxY * 100);
	};
	
	SysExps.prototype.layerindex = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_int(-1);
		else
			ret.set_int(layer.index);
	};
	
	SysExps.prototype.layoutscale = function (ret)
	{
		if (this.runtime.running_layout)
			ret.set_float(this.runtime.running_layout.scale);
		else
			ret.set_float(0);
	};
	
	SysExps.prototype.layoutangle = function (ret)
	{
		ret.set_float(cr.to_degrees(this.runtime.running_layout.angle));
	};
	
	SysExps.prototype.layerangle = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);
		
		if (!layer)
			ret.set_float(0);
		else
			ret.set_float(cr.to_degrees(layer.angle));
	};
	
	SysExps.prototype.layoutwidth = function (ret)
	{
		ret.set_int(this.runtime.running_layout.width);
	};
	
	SysExps.prototype.layoutheight = function (ret)
	{
		ret.set_int(this.runtime.running_layout.height);
	};

	SysExps.prototype.find = function (ret, text, searchstr)
	{
		if (cr.is_string(text) && cr.is_string(searchstr))
			ret.set_int(text.search(new RegExp(cr.regexp_escape(searchstr), "i")));
		else
			ret.set_int(-1);
	};
	
	SysExps.prototype.findcase = function (ret, text, searchstr)
	{
		if (cr.is_string(text) && cr.is_string(searchstr))
			ret.set_int(text.search(new RegExp(cr.regexp_escape(searchstr), "")));
		else
			ret.set_int(-1);
	};
	
	SysExps.prototype.left = function (ret, text, n)
	{
		ret.set_string(cr.is_string(text) ? text.substr(0, n) : "");
	};
	
	SysExps.prototype.right = function (ret, text, n)
	{
		ret.set_string(cr.is_string(text) ? text.substr(text.length - n) : "");
	};
	
	SysExps.prototype.mid = function (ret, text, index_, length_)
	{
		ret.set_string(cr.is_string(text) ? text.substr(index_, length_) : "");
	};
	
	SysExps.prototype.tokenat = function (ret, text, index_, sep)
	{
		if (cr.is_string(text) && cr.is_string(sep))
		{
			var arr = text.split(sep);
			var i = cr.floor(index_);
			
			if (i < 0 || i >= arr.length)
				ret.set_string("");
			else
				ret.set_string(arr[i]);
		}
		else
			ret.set_string("");
	};
	
	SysExps.prototype.tokencount = function (ret, text, sep)
	{
		if (cr.is_string(text) && text.length)
			ret.set_int(text.split(sep).length);
		else
			ret.set_int(0);
	};
	
	SysExps.prototype.replace = function (ret, text, find_, replace_)
	{
		if (cr.is_string(text) && cr.is_string(find_) && cr.is_string(replace_))
			ret.set_string(text.replace(new RegExp(cr.regexp_escape(find_), "gi"), replace_));
		else
			ret.set_string(cr.is_string(text) ? text : "");
	};
	
	SysExps.prototype.trim = function (ret, text)
	{
		ret.set_string(cr.is_string(text) ? text.trim() : "");
	};
	
	SysExps.prototype.pi = function (ret)
	{
		ret.set_float(cr.PI);
	};
	
	SysExps.prototype.layoutname = function (ret)
	{
		if (this.runtime.running_layout)
			ret.set_string(this.runtime.running_layout.name);
		else
			ret.set_string("");
	};
	
	SysExps.prototype.renderer = function (ret)
	{
		ret.set_string(this.runtime.gl ? "webgl" : "canvas2d");
	};
	
	SysExps.prototype.rendererdetail = function (ret)
	{
		ret.set_string(this.runtime.glUnmaskedRenderer);
	};
	
	SysExps.prototype.anglediff = function (ret, a, b)
	{
		ret.set_float(cr.to_degrees(cr.angleDiff(cr.to_radians(a), cr.to_radians(b))));
	};
	
	SysExps.prototype.choose = function (ret)
	{
		var index = cr.floor(Math.random() * (arguments.length - 1));
		ret.set_any(arguments[index + 1]);
	};
	
	SysExps.prototype.rgb = function (ret, r, g, b)
	{
		ret.set_int(cr.RGB(r, g, b));
	};
	
	SysExps.prototype.projectversion = function (ret)
	{
		ret.set_string(this.runtime.versionstr);
	};
	
	SysExps.prototype.projectname = function (ret)
	{
		ret.set_string(this.runtime.projectName);
	};
	
	SysExps.prototype.anglelerp = function (ret, a, b, x)
	{
		a = cr.to_radians(a);
		b = cr.to_radians(b);
		var diff = cr.angleDiff(a, b);
		
		// b clockwise from a
		if (cr.angleClockwise(b, a))
		{
			ret.set_float(cr.to_clamped_degrees(a + diff * x));
		}
		// b anticlockwise from a
		else
		{
			ret.set_float(cr.to_clamped_degrees(a - diff * x));
		}
	};
	
	SysExps.prototype.anglerotate = function (ret, a, b, c)
	{
		a = cr.to_radians(a);
		b = cr.to_radians(b);
		c = cr.to_radians(c);
		
		ret.set_float(cr.to_clamped_degrees(cr.angleRotate(a, b, c)));
	};
	
	SysExps.prototype.zeropad = function (ret, n, d)
	{
		var s = (n < 0 ? "-" : "");
		if (n < 0) n = -n;
		var zeroes = d - n.toString().length;
		for (var i = 0; i < zeroes; i++)
			s += "0";
		ret.set_string(s + n.toString());
	};
	
	SysExps.prototype.cpuutilisation = function (ret)
	{
		ret.set_float(this.runtime.cpuutilisation / 1000);
	};
	
	SysExps.prototype.viewportleft = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);

		ret.set_float(layer ? layer.viewLeft : 0);
	};
	
	SysExps.prototype.viewporttop = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);

		ret.set_float(layer ? layer.viewTop : 0);
	};
	
	SysExps.prototype.viewportright = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);

		ret.set_float(layer ? layer.viewRight : 0);
	};
	
	SysExps.prototype.viewportbottom = function (ret, layerparam)
	{
		var layer = this.runtime.getLayer(layerparam);

		ret.set_float(layer ? layer.viewBottom : 0);
	};
	
	SysExps.prototype.loadingprogress = function (ret)
	{
		ret.set_float(this.runtime.loadingprogress);
	};
	
	SysExps.prototype.unlerp = function(ret, a, b, y)
    {
        ret.set_float(cr.unlerp(a, b, y));
    };
	
	SysExps.prototype.canvassnapshot = function (ret)
	{
		ret.set_string(this.runtime.snapshotData);
	};
	
	SysExps.prototype.urlencode = function (ret, s)
	{
		ret.set_string(encodeURIComponent(s));
	};
	
	SysExps.prototype.urldecode = function (ret, s)
	{
		ret.set_string(decodeURIComponent(s));
	};
	
	SysExps.prototype.canvastolayerx = function (ret, layerparam, x, y)
	{
		var layer = this.runtime.getLayer(layerparam);
		ret.set_float(layer ? layer.canvasToLayer(x, y, true) : 0);
	};
	
	SysExps.prototype.canvastolayery = function (ret, layerparam, x, y)
	{
		var layer = this.runtime.getLayer(layerparam);
		ret.set_float(layer ? layer.canvasToLayer(x, y, false) : 0);
	};
	
	SysExps.prototype.layertocanvasx = function (ret, layerparam, x, y)
	{
		var layer = this.runtime.getLayer(layerparam);
		ret.set_float(layer ? layer.layerToCanvas(x, y, true) : 0);
	};
	
	SysExps.prototype.layertocanvasy = function (ret, layerparam, x, y)
	{
		var layer = this.runtime.getLayer(layerparam);
		ret.set_float(layer ? layer.layerToCanvas(x, y, false) : 0);
	};
	
	SysExps.prototype.savestatejson = function (ret)
	{
		ret.set_string(this.runtime.lastSaveJson);
	};
	
	SysExps.prototype.imagememoryusage = function (ret)
	{
		if (this.runtime.glwrap)
			// round to 2 dp
			ret.set_float(Math.round(100 * this.runtime.glwrap.estimateVRAM() / (1024 * 1024)) / 100);
		else
			ret.set_float(0);
	};
	
	SysExps.prototype.regexsearch = function (ret, str_, regex_, flags_)
	{
		var regex = getRegex(regex_, flags_);
		
		ret.set_int(str_ ? str_.search(regex) : -1);
	};
	
	SysExps.prototype.regexreplace = function (ret, str_, regex_, flags_, replace_)
	{
		var regex = getRegex(regex_, flags_);
		
		ret.set_string(str_ ? str_.replace(regex, replace_) : "");
	};
	
	var regexMatches = [];
	var lastMatchesStr = "";
	var lastMatchesRegex = "";
	var lastMatchesFlags = "";
	
	function updateRegexMatches(str_, regex_, flags_)
	{
		// Same request as last time: skip running the match again
		if (str_ === lastMatchesStr && regex_ === lastMatchesRegex && flags_ === lastMatchesFlags)
			return;
		
		var regex = getRegex(regex_, flags_);
		regexMatches = str_.match(regex);
		
		lastMatchesStr = str_;
		lastMatchesRegex = regex_;
		lastMatchesFlags = flags_;
	};
	
	SysExps.prototype.regexmatchcount = function (ret, str_, regex_, flags_)
	{
		var regex = getRegex(regex_, flags_);
		updateRegexMatches(str_, regex_, flags_);
		ret.set_int(regexMatches ? regexMatches.length : 0);
	};
	
	SysExps.prototype.regexmatchat = function (ret, str_, regex_, flags_, index_)
	{
		index_ = Math.floor(index_);
		var regex = getRegex(regex_, flags_);
		updateRegexMatches(str_, regex_, flags_);
		
		if (!regexMatches || index_ < 0 || index_ >= regexMatches.length)
			ret.set_string("");
		else
			ret.set_string(regexMatches[index_]);
	};
	
	SysExps.prototype.infinity = function (ret)
	{
		ret.set_float(Infinity);
	};
	
	SysExps.prototype.setbit = function (ret, n, b, v)
	{
		// cast params to ints
		n = n | 0;
		b = b | 0;
		v = (v !== 0 ? 1 : 0);
		
		// return an int with the bit set
		ret.set_int((n & ~(1 << b)) | (v << b));
	};
	
	SysExps.prototype.togglebit = function (ret, n, b)
	{
		// cast params to ints
		n = n | 0;
		b = b | 0;
		
		// return an int with the bit toggled
		ret.set_int(n ^ (1 << b));
	};
	
	SysExps.prototype.getbit = function (ret, n, b)
	{
		// cast params to ints
		n = n | 0;
		b = b | 0;
		
		// return 0 or 1 depending on bit at that position
		ret.set_int((n & (1 << b)) ? 1 : 0);
	};
	
	SysExps.prototype.originalwindowwidth = function (ret)
	{
		ret.set_int(this.runtime.original_width);
	};
	
	SysExps.prototype.originalwindowheight = function (ret)
	{
		ret.set_int(this.runtime.original_height);
	};
	
	sysProto.exps = new SysExps();
	
	sysProto.runWaits = function ()
	{
		var i, j, len, w, k, s, ss;
		var evinfo = this.runtime.getCurrentEventStack();
		
		for (i = 0, len = this.waits.length; i < len; i++)
		{
			w = this.waits[i];
			
			if (w.time === -1)		// signalled wait
			{
				if (!w.signalled)
					continue;		// not yet signalled
			}
			else					// timer wait
			{
				if (w.time > this.runtime.kahanTime.sum)
					continue;		// timer not yet expired
			}
			
			// Scheduled time has arrived. Restore event context
			evinfo.current_event = w.ev;
			evinfo.actindex = w.actindex;
			evinfo.cndindex = 0;
			
			for (k in w.sols)
			{
				if (w.sols.hasOwnProperty(k))
				{
					s = this.runtime.types_by_index[parseInt(k, 10)].getCurrentSol();
					ss = w.sols[k];
					s.select_all = ss.sa;
					cr.shallowAssignArray(s.instances, ss.insts);
					// this wait record is about to be released, so recycle the sol state now
					freeSolStateObject(ss);
				}
			}
			
			// Resume the event in this context
			w.ev.resume_actions_and_subevents();
			
			// Clean up the SOL we changed (subevents that ran will have cleaned themselves up)
			this.runtime.clearSol(w.solModifiers);
			w.deleteme = true;
		}
		
		// Remove expired entries
		for (i = 0, j = 0, len = this.waits.length; i < len; i++)
		{
			w = this.waits[i];
			this.waits[j] = w;
			
			if (w.deleteme)
				freeWaitObject(w);
			else
				j++;
		}
		
		cr.truncateArray(this.waits, j);
	};

}());
