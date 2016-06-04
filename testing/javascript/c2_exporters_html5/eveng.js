// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");

(function()
{
	// For optimising memory use with sol modifiers
	var allUniqueSolModifiers = [];
	
	function testSolsMatch(arr1, arr2)
	{
		var i, len = arr1.length;
		
		switch (len) {
		case 0:
			return true;
		case 1:
			return arr1[0] === arr2[0];
		case 2:
			return arr1[0] === arr2[0] && arr1[1] === arr2[1];
		default:
			for (i = 0; i < len; i++)
			{
				if (arr1[i] !== arr2[i])
					return false;
			}
			return true;
		}
	};
	
	function solArraySorter(t1, t2)
	{
		return t1.index - t2.index;
	};
	
	function findMatchingSolModifier(arr)
	{
		var i, len, u, temp, subarr;
		
		if (arr.length === 2)
		{
			if (arr[0].index > arr[1].index)
			{
				temp = arr[0];
				arr[0] = arr[1];
				arr[1] = temp;
			}
		}
		else if (arr.length > 2)
			arr.sort(solArraySorter);		// so testSolsMatch compares in same order
			
		if (arr.length >= allUniqueSolModifiers.length)
			allUniqueSolModifiers.length = arr.length + 1;
			
		if (!allUniqueSolModifiers[arr.length])
			allUniqueSolModifiers[arr.length] = [];
		
		subarr = allUniqueSolModifiers[arr.length];
		
		for (i = 0, len = subarr.length; i < len; i++)
		{
			u = subarr[i];
			
			// Matched: recycle existing sol
			if (testSolsMatch(arr, u))
				return u;
		}
		
		// Otherwise add new unique sol
		subarr.push(arr);
		return arr;
	};
	
	// Event sheet class
	function EventSheet(runtime, m)
	{
		// Runtime members
		this.runtime = runtime;
		this.triggers = {};
		this.fasttriggers = {};
        this.hasRun = false;
        this.includes = new cr.ObjectSet(); 	// all event sheets included by this sheet, at first-level indirection only
		this.deep_includes = [];				// all includes from this sheet recursively, in trigger order
		this.already_included_sheets = [];		// used while building deep_includes
		
		// Data model members
		this.name = m[0];
		var em = m[1];		// events model
		
		// For profiling
		/**PREVIEWONLY**/this.profile_sum = 0;
		/**PREVIEWONLY**/this.profile_last = 0;
		/**PREVIEWONLY**/this.sub_groups = [];
		/**PREVIEWONLY**/this.next_event_number = 1;
		/**PREVIEWONLY**/this.events_by_number = [null];
		
		// Iterate events and initialise them
		this.events = [];       // triggers won't make it to this array

		var i, len;
		for (i = 0, len = em.length; i < len; i++)
			this.init_event(em[i], null, this.events);
	};

    EventSheet.prototype.toString = function ()
    {
        return this.name;
    };

	EventSheet.prototype.init_event = function (m, parent, nontriggers)
	{
		switch (m[0]) {
		case 0:	// event block
		{
			// Create a new event block object
			var block = new cr.eventblock(this, parent, m);
			cr.seal(block);

			// Treat OR blocks as ordinary events, but register each triggered condition separately
			if (block.orblock)
			{
				nontriggers.push(block);
				
				var i, len;
				for (i = 0, len = block.conditions.length; i < len; i++)
				{
					if (block.conditions[i].trigger)
						this.init_trigger(block, i);
				}
			}
			else
			{
				// Initialise and store triggers separately
				if (block.is_trigger())
					this.init_trigger(block, 0);
				else
					nontriggers.push(block);
			}
			break;
		}
		case 1: // variable
		{
			var v = new cr.eventvariable(this, parent, m);
			cr.seal(v);
			nontriggers.push(v);
			break;
		}
        case 2:	// include
        {
            var inc = new cr.eventinclude(this, parent, m);
			cr.seal(inc);
            nontriggers.push(inc);
			break;
        }
		default:
			assert2(false, "Event has unknown type: " + m[0]);
		}
	};

	EventSheet.prototype.postInit = function ()
	{
		var i, len;
		for (i = 0, len = this.events.length; i < len; i++)
		{
			this.events[i].postInit(i < len - 1 && this.events[i + 1].is_else_block);
		}
	};
	
	EventSheet.prototype.updateDeepIncludes = function ()
	{
		cr.clearArray(this.deep_includes);
		cr.clearArray(this.already_included_sheets);
		
		this.addDeepIncludes(this);
		
		cr.clearArray(this.already_included_sheets);
	};
	
	EventSheet.prototype.addDeepIncludes = function (root_sheet)
	{
		var i, len, inc, sheet;
		var deep_includes = root_sheet.deep_includes;
		var already_included_sheets = root_sheet.already_included_sheets;
		var arr = this.includes.valuesRef();
		
		for (i = 0, len = arr.length; i < len; ++i)
		{
			inc = arr[i];
			sheet = inc.include_sheet;
			
			if (!inc.isActive() || root_sheet === sheet || already_included_sheets.indexOf(sheet) > -1)
				continue;
			
			// The order trigger sheets appear must be deepest-include first, but we still must
			// not add each include more than once. To maintain both requirements, we add to the
			// already-included list immediately, but wait until after recursing to add it to the
			// deep_includes list.
			already_included_sheets.push(sheet);
			sheet.addDeepIncludes(root_sheet);
			deep_includes.push(sheet);
		}
	};

	// Run event sheet
	EventSheet.prototype.run = function (from_include)
	{
		/**PREVIEWONLY**/var start_time = cr.performance_now();
		
		if (!this.runtime.resuming_breakpoint)
		{
			this.hasRun = true;
			
			if (!from_include)
				this.runtime.isRunningEvents = true;
		}

		// Run each event
		var i, len;
		for (i = 0, len = this.events.length; i < len; i++)
		{
			var ev = this.events[i];

			ev.run();
			
			// Note revert hasRun on breakpoint so we can resume when inside an included sheet
			/**PREVIEWONLY**/if (this.runtime.hit_breakpoint) { this.hasRun = false; return; }

			/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
			
				// Clear modified SOLs between every event
				this.runtime.clearSol(ev.solModifiers);
				
				// Clear death row between top-level events
				if (this.runtime.hasPendingInstances)
					this.runtime.ClearDeathRow();
			
			/**PREVIEWONLY**/}
		}
		
		/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {

			if (!from_include)
				this.runtime.isRunningEvents = false;

		/**PREVIEWONLY**/}
		
		/**PREVIEWONLY**/this.profile_sum += cr.performance_now() - start_time;
	};
	
	function isPerformanceSensitiveTrigger(method)
	{
		// 'On frame changed' trigger has turned up in profiles as performance sensitive
		if (cr.plugins_.Sprite && method === cr.plugins_.Sprite.prototype.cnds.OnFrameChanged)
		{
			return true;
		}
		
		return false;
	};
	
	// Add trigger to the sheet map
	EventSheet.prototype.init_trigger = function (trig, index)
	{
		if (!trig.orblock)
			this.runtime.triggers_to_postinit.push(trig);	// needs to be postInit'd later

		var i, len;
		var cnd = trig.conditions[index];
		
		// Add to the trigger map organised as such:
		// this.triggers[object name][n] = {method, [[ev1, 0], [ev2, 0]... [evN, x]]}
		
		// If a fast trigger, add in this format instead:
		// this.fasttriggers[object name][n] = {method, {"param1": [[ev1, 0]...], "param2": [[ev1, 0]...], ...}}

		// Get object type name
		var type_name;

		if (cnd.type)
			type_name = cnd.type.name;
		else
			type_name = "system";
			
		var fasttrigger = cnd.fasttrigger;
		
		var triggers = (fasttrigger ? this.fasttriggers : this.triggers);

		// Ensure object name entry created
		if (!triggers[type_name])
			triggers[type_name] = [];

		var obj_entry = triggers[type_name];

		// Ensure method name entry created
		var method = cnd.func;
		
		if (fasttrigger)
		{
			// Check this condition is fast-triggerable
			if (!cnd.parameters.length)				// no parameters
				return;
			
			var firstparam = cnd.parameters[0];
			
			if (firstparam.type !== 1 ||			// not a string param
				firstparam.expression.type !== 2)	// not a string literal node
			{
				return;
			}
			
			var fastevs;
			var firstvalue = firstparam.expression.value.toLowerCase();

			var i, len;
			for (i = 0, len = obj_entry.length; i < len; i++)
			{
				// found matching method
				if (obj_entry[i].method == method)
				{
					fastevs = obj_entry[i].evs;
					
					if (!fastevs[firstvalue])
						fastevs[firstvalue] = [[trig, index]];
					else
						fastevs[firstvalue].push([trig, index]);
					
					return;
				}
			}
			
			// Wasn't found: add new entry
			fastevs = {};
			fastevs[firstvalue] = [[trig, index]];
			obj_entry.push({ method: method, evs: fastevs });
		}
		else
		{
			for (i = 0, len = obj_entry.length; i < len; i++)
			{
				// found matching method
				if (obj_entry[i].method == method)
				{
					obj_entry[i].evs.push([trig, index]);
					return;
				}
			}
			
			// Wasn't found: add new entry. If performance sensitive, add to beginning
			// of array so it is always found first.
			if (isPerformanceSensitiveTrigger(method))
				obj_entry.unshift({ method: method, evs: [[trig, index]]});
			else
				obj_entry.push({ method: method, evs: [[trig, index]]});
		}
	};
	
	cr.eventsheet = EventSheet;

	// SOL
	function Selection(type)
	{
		this.type = type;
		this.instances = [];        // subset of picked instances
		this.else_instances = [];	// subset of unpicked instances
		this.select_all = true;
	};

	Selection.prototype.hasObjects = function ()
	{
		if (this.select_all)
			return this.type.instances.length;
		else
			return this.instances.length;
	};

	Selection.prototype.getObjects = function ()
	{
		if (this.select_all)
			return this.type.instances;
		else
			return this.instances;
	};

	/*
	Selection.prototype.ensure_picked = function (inst, skip_siblings)
	{
		var i, len;
		var orblock = inst.runtime.getCurrentEventStack().current_event.orblock;

		if (this.select_all)
		{
			this.select_all = false;
			
			if (orblock)
			{
				cr.shallowAssignArray(this.else_instances, inst.type.instances);
				cr.arrayFindRemove(this.else_instances, inst);
			}

			this.instances.length = 1;
			this.instances[0] = inst;
		}
		else
		{
			if (orblock)
			{
				i = this.else_instances.indexOf(inst);
				
				if (i !== -1)
				{
					this.instances.push(this.else_instances[i]);
					this.else_instances.splice(i, 1);
				}
			}
			else
			{
				if (this.instances.indexOf(inst) === -1)
					this.instances.push(inst);
			}
		}
		
		// Also pick instances
		if (!skip_siblings)
		{
			// todo...
		}
	};
	*/
	
	// for static conditions to set the selection to a single instance, but also
	// supports appending the object to the current selection if an OR block
	Selection.prototype.pick_one = function (inst)
	{
		if (!inst)
			return;
			
		// is or block: add to SOL if not already in it (and remove from else_instances)
		if (inst.runtime.getCurrentEventStack().current_event.orblock)
		{
			if (this.select_all)
			{
				// Dump all instances in to else_instances, following code will pluck out our one instance
				cr.clearArray(this.instances);
				cr.shallowAssignArray(this.else_instances, inst.type.instances);
				this.select_all = false;
			}
			
			// Find instance in else_instances and add it to instances
			// If not found, assume it's already in instances
			var i = this.else_instances.indexOf(inst);
			
			if (i !== -1)
			{
				this.instances.push(this.else_instances[i]);
				this.else_instances.splice(i, 1);
			}
		}
		// otherwise just set the selection to this instance
		else
		{
			this.select_all = false;
			cr.clearArray(this.instances);
			this.instances[0] = inst;
		}
	};
	
	cr.selection = Selection;

	// Event class
	function EventBlock(sheet, parent, m)
	{
		// Runtime members
		this.sheet = sheet;
		this.parent = parent;
		this.runtime = sheet.runtime;
		this.solModifiers = [];
		this.solModifiersIncludingParents = [];
		this.solWriterAfterCnds = false;	// block does not change SOL after running its conditions
		this.group = false;					// is group of events
		this.initially_activated = false;	// if a group, is active on startup
		this.toplevelevent = false;			// is an event block parented only by a top-level group
		this.toplevelgroup = false;			// is parented only by other groups or is top-level (i.e. not in a subevent)
		this.has_else_block = false;		// is followed by else
		//this.prev_block = null;			// reference to previous sibling block if any (for else)
		//this.is_logical = false;			// contains a logic condition (for else)
		//this.cndReferences = [];			// like solModifiers but only based on types referenced in conditions (for else)
		
		// Data members + initialisation
		assert2(m[0] === 0, "Constructing event block for non-block event type");
		this.conditions = [];
		this.actions = [];
		this.subevents = [];
		
		/**PREVIEWONLY**/this.sub_groups = [];
		
		this.group_name = "";
		this.group = false;
		this.initially_activated = false;
		this.group_active = false;
		this.contained_includes = null;
		
		/**BEGIN-PREVIEWONLY**/
		this.profile_sum = 0;
		this.profile_last = 0;
		/**END-PREVIEWONLY**/

        // Is a group
        if (m[1])
        {
			// [active_on_start, "name"]
			this.group_name = m[1][1].toLowerCase();
			this.group = true;
			this.initially_activated = !!m[1][0];
			this.contained_includes = [];
			this.group_active = this.initially_activated;
			
			this.runtime.allGroups.push(this);
            this.runtime.groups_by_name[this.group_name] = this;
			
			// For performance profiling
			/**BEGIN-PREVIEWONLY**/
			// follow parents until we find another group, and add to sub-groups list of that group.
			// otherwise add to top level again
			var pg = this.parent;
			
			while (pg && !pg.group)
				pg = pg.parent;
			
			if (pg)
				pg.sub_groups.push(this);
			else
				this.sheet.sub_groups.push(this);
			/**END-PREVIEWONLY**/
        }
		
		this.orblock = m[2];
		/**BEGIN-PREVIEWONLY**/
		this.display_number = m[3][1];
		this.is_breakable = m[3][2];
		this.is_breakpoint = this.runtime.isDebug && this.is_breakable && m[3][0];
		this.sheet.events_by_number[this.display_number] = this;
		/**END-PREVIEWONLY**/
		this.sid = m[4];
		
		if (!this.group)
			this.runtime.blocksBySid[this.sid.toString()] = this;

		// Initialise conditions
		var i, len;
		var cm = m[5];
		
		for (i = 0, len = cm.length; i < len; i++)
		{
			var cnd = new cr.condition(this, cm[i]);
			cnd.index = i;
			cr.seal(cnd);
			this.conditions.push(cnd);
			
			/*
			if (cnd.is_logical())
				this.is_logical = true;
				
			if (cnd.type && !cnd.type.plugin.singleglobal && this.cndReferences.indexOf(cnd.type) === -1)
				this.cndReferences.push(cnd.type);
			*/

			// Add condition's type to SOL modifiers
			this.addSolModifier(cnd.type);
		}

		// Initialise actions
		var am = m[6];
		
		for (i = 0, len = am.length; i < len; i++)
		{
			var act = new cr.action(this, am[i]);
			act.index = i;
			cr.seal(act);
			this.actions.push(act);
		}

		// Initialise subevents if any (item 4)
		if (m.length === 8)
		{
			var em = m[7];
			
			for (i = 0, len = em.length; i < len; i++)
				this.sheet.init_event(em[i], this, this.subevents);
		}
		
		this.is_else_block = false;
		
		if (this.conditions.length)
		{
			this.is_else_block = (this.conditions[0].type == null && this.conditions[0].func == cr.system_object.prototype.cnds.Else);
		}
	};
	
	/*{{{c2hash}}}*/
	
	EventBlock.prototype.postInit = function (hasElse/*, prevBlock_*/)
	{
		var i, len;
		
		// Work out if this is a top-level group
		var p = this.parent;
		
		if (this.group)
		{
			this.toplevelgroup = true;
			
			while (p)
			{
				if (!p.group)
				{
					this.toplevelgroup = false;
					break;
				}
				
				p = p.parent;
			}
		}
		
		// Don't count triggers as top level events - handle ClearDeathRow in the trigger function instead
		this.toplevelevent = !this.is_trigger() && (!this.parent || (this.parent.group && this.parent.toplevelgroup));
		
		this.has_else_block = !!hasElse;
		//this.prev_block = prevBlock_;
		
		// Determine SOL modifier list including all parent blocks (used for triggers)
		this.solModifiersIncludingParents = this.solModifiers.slice(0);
		
		p = this.parent;
		
		while (p)
		{
			for (i = 0, len = p.solModifiers.length; i < len; i++)
				this.addParentSolModifier(p.solModifiers[i]);
			
			p = p.parent;
		}
		
		this.solModifiers = findMatchingSolModifier(this.solModifiers);
		this.solModifiersIncludingParents = findMatchingSolModifier(this.solModifiersIncludingParents);
		
		var i, len/*, s*/;
		for (i = 0, len = this.conditions.length; i < len; i++)
			this.conditions[i].postInit();

		for (i = 0, len = this.actions.length; i < len; i++)
			this.actions[i].postInit();

		for (i = 0, len = this.subevents.length; i < len; i++)
		{
			this.subevents[i].postInit(i < len - 1 && this.subevents[i + 1].is_else_block);
		}
			
		/*
		// If this is an else block, merge the previous block's SOL modifiers
		if (this.is_else_block && this.prev_block)
		{
			for (i = 0, len = this.prev_block.solModifiers.length; i < len; i++)
			{
				s = this.prev_block.solModifiers[i];
				
				if (this.solModifiers.indexOf(s) === -1)
					this.solModifiers.push(s);
			}
		}
		*/
	};
	
	EventBlock.prototype.setGroupActive = function (a)
	{
		if (this.group_active === !!a)
			return;		// same state
			
		this.group_active = !!a;
		
		// Update all include states
		var i, len;
		for (i = 0, len = this.contained_includes.length; i < len; ++i)
		{
			this.contained_includes[i].updateActive();
		}
		
		// Pre-computed deep includes list may have changed if any includes
		// contained in this group
		if (len > 0 && this.runtime.running_layout.event_sheet)
			this.runtime.running_layout.event_sheet.updateDeepIncludes();
	};
	
	function addSolModifierToList(type, arr)
	{
		var i, len, t;
		
		if (!type)
			return;
			
		// Add to list if not already present
		if (arr.indexOf(type) === -1)
			arr.push(type);
		
		// Add any container types
		if (type.is_contained)
		{
			for (i = 0, len = type.container.length; i < len; i++)
			{
				t = type.container[i];
				
				if (type === t)
					continue;		// already handled
					
				// Add if not already present
				if (arr.indexOf(t) === -1)
					arr.push(t);
			}
		}
	};

	EventBlock.prototype.addSolModifier = function (type)
	{
		addSolModifierToList(type, this.solModifiers);
	};
	
	EventBlock.prototype.addParentSolModifier = function (type)
	{
		addSolModifierToList(type, this.solModifiersIncludingParents);
	};
	
	EventBlock.prototype.setSolWriterAfterCnds = function ()
	{
		this.solWriterAfterCnds = true;
		
		// Recurse up chain
		if (this.parent)
			this.parent.setSolWriterAfterCnds();
	};

	EventBlock.prototype.is_trigger = function ()
	{
		if (!this.conditions.length)    // no conditions
			return false;
		else
			return this.conditions[0].trigger;
	};

	EventBlock.prototype.run = function ()
	{
		var i, len, c, any_true = false, cnd_result;
		
		var runtime = this.runtime;
		
		var evinfo = this.runtime.getCurrentEventStack();
		evinfo.current_event = this;
		
		var conditions = this.conditions;
		
		/**BEGIN-PREVIEWONLY**/
		var resume_condition = false;
		
		// Check for debug breakpoint; exit and suspend if encountered
		if (runtime.resuming_breakpoint)
		{
			// This is the block to resume: continue execution as normal
			if (this == runtime.breakpoint_event)
			{
				// Resuming on condition
				if (runtime.breakpoint_condition)
				{
					resume_condition = true;
				}
				else if (runtime.breakpoint_action)
				{
					this.resume_actions_and_subevents();
					this.end_run(evinfo);
					return;
				}
				// Resuming on this block itself
				else
				{
					runtime.resuming_breakpoint = false;
					runtime.breakpoint_event = null;
				}
			}
			else
			{
				// Propagate in to subevents
				this.run_subevents();
				
				// A subevent resumed: run end-of-block code
				if (!runtime.resuming_breakpoint)
					this.end_run(evinfo);
				
				return;
			}
		}
		else
		{
			if ((this.is_breakpoint || runtime.step_break) && this.is_breakable && runtime.trigger_depth === 0)
			{
				runtime.breakpoint_event = this;
				runtime.breakpoint_condition = null;
				runtime.breakpoint_action = null;
				runtime.debugBreak();
				return;
			}
		}
		
		// Performance profiling for groups
		var start_time;
		
		if (this.group)
			start_time = cr.performance_now();
		/**END-PREVIEWONLY**/
		
		/**PREVIEWONLY**/if (!resume_condition) {
		
			if (!this.is_else_block)
				evinfo.else_branch_ran = false;
				
		/**PREVIEWONLY**/}

		if (this.orblock)
		{
			if (conditions.length === 0)
				any_true = true;		// be sure to run if empty block
			
			/**PREVIEWONLY**/if (resume_condition) any_true = evinfo.any_true_state; else {
			
				evinfo.cndindex = 0
				
			/**PREVIEWONLY**/}
			
			for (len = conditions.length; evinfo.cndindex < len; evinfo.cndindex++)
			{
				c = conditions[evinfo.cndindex];
				
				if (c.trigger)		// skip triggers when running OR block
					continue;
				
				cnd_result = c.run();
				
				// Need to back up state of any_true in to the event stack frame so it can be resumed
				/**PREVIEWONLY**/if (runtime.hit_breakpoint) { evinfo.any_true_state = any_true; return; }
				
				if (cnd_result)			// make sure all conditions run and run if any were true
					any_true = true;
			}
			
			evinfo.last_event_true = any_true;
			
			if (any_true)
				this.run_actions_and_subevents();
		}
		else
		{
			/**PREVIEWONLY**/if (!resume_condition) {
			
				evinfo.cndindex = 0
				
			/**PREVIEWONLY**/}
			
			// Run each condition (keep the index in the event stack so the current condition can be found)
			for (len = conditions.length; evinfo.cndindex < len; evinfo.cndindex++)
			{
				cnd_result = conditions[evinfo.cndindex].run();
				
				/**PREVIEWONLY**/if (runtime.hit_breakpoint) return;
				
				if (!cnd_result)    // condition failed
				{
					evinfo.last_event_true = false;
					
					// Clear death row between top-level events
					// Check even if the condition failed so loops in groups correctly create objects
					if (this.toplevelevent && runtime.hasPendingInstances)
						runtime.ClearDeathRow();
			
					/**PREVIEWONLY**/if (this.group) this.profile_sum += cr.performance_now() - start_time;
					
					return;		// bail out now
				}
			}
			
			evinfo.last_event_true = true;
			this.run_actions_and_subevents();
		}
		
		/**PREVIEWONLY**/if (runtime.hit_breakpoint) return;
		
		this.end_run(evinfo);
		
		/**PREVIEWONLY**/if (this.group) this.profile_sum += cr.performance_now() - start_time;
	};
	
	EventBlock.prototype.end_run = function (evinfo)
	{
		// If has an else block, make sure else branch marked as ran
		if (evinfo.last_event_true && this.has_else_block)
			evinfo.else_branch_ran = true;
			
		// Clear death row between top-level events
		if (this.toplevelevent && this.runtime.hasPendingInstances)
			this.runtime.ClearDeathRow();
	};
	
	EventBlock.prototype.run_orblocktrigger = function (index)
	{
		var evinfo = this.runtime.getCurrentEventStack();
		evinfo.current_event = this;
		
		// Execute the triggered condition only, and if true, run the event
		if (this.conditions[index].run())
		{
			this.run_actions_and_subevents();
			
			this.runtime.getCurrentEventStack().last_event_true = true;
		}
	};

	EventBlock.prototype.run_actions_and_subevents = function ()
	{
		var evinfo = this.runtime.getCurrentEventStack();
		var len;
		
		// Run each action
		for (evinfo.actindex = 0, len = this.actions.length; evinfo.actindex < len; evinfo.actindex++)
		{
			if (this.actions[evinfo.actindex].run())
				return;
		}

		this.run_subevents();
	};
	
	// used by the wait action to call a scheduled event
	EventBlock.prototype.resume_actions_and_subevents = function ()
	{
		var evinfo = this.runtime.getCurrentEventStack();
		var len;
		
		// Run each action.  Don't set evinfo.actindex, it's been set already.
		for (len = this.actions.length; evinfo.actindex < len; evinfo.actindex++)
		{
			if (this.actions[evinfo.actindex].run())
				return;
		}

		this.run_subevents();
	};
	
	EventBlock.prototype.run_subevents = function ()
	{
		if (!this.subevents.length)
			return;
			
		var i, len, subev, pushpop/*, skipped_pop = false, pop_modifiers = null*/;
		var last = this.subevents.length - 1;
		
		/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
		
			this.runtime.pushEventStack(this);
		
		/**PREVIEWONLY**/}
		
		if (this.solWriterAfterCnds)
		{
			for (i = 0, len = this.subevents.length; i < len; i++)
			{
				subev = this.subevents[i];

				// Pushing and popping SOLs is relatively expensive.  However, top-level groups (i.e. either at the root level
				// or with only other groups as parents) only need to clear SOLs between subevents since there is nothing to
				// inherit, which helps avoid the push/pop overhead.  Also, the last subevent of a block can re-use the
				// parent SOL directly (without push/pop to copy), since nothing else needs to re-use it, which is another
				// way to avoid the push/pop overhead.
				// (But!) Else events cause two exceptions: [not yet implemented]
				// - if this (parent) event has an else event, it must push/pop for every subevent, to ensure the SOL
				//   is properly preserved for the following else event.
				// - if one of the subevents has an else event, it must not pop until after the following else event,
				//   for the same reason (keep the SOL intact).
				//   Since else events merge their solModifiers with the previous event, its solModifiers are the ones
				//   that must be pushed and popped.  (Otherwise different solModifiers could be popped, causing a leak.)
				
				/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
				
					pushpop = (!this.toplevelgroup || (!this.group && i < last));
					
					if (pushpop)
						this.runtime.pushCopySol(subev.solModifiers);
				
				/**PREVIEWONLY**/}
				
				subev.run();
				
				// If hit a breakpoint, return all the way back to the event loop and exit in to suspend
				/**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;
				
				/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
				
					if (pushpop)
						this.runtime.popSol(subev.solModifiers);
					else
						this.runtime.clearSol(subev.solModifiers);
						
				/**PREVIEWONLY**/}
			}
		}
		else
		{
			// This event block never modifies the SOL after running its conditions.
			// The conditions have already been run, so we know there are guaranteed
			// to be no SOL changes from here on.  This means we can save the overhead
			// of ever pushing, popping or clearing the SOL.
			for (i = 0, len = this.subevents.length; i < len; i++)
			{
				this.subevents[i].run();
				
				// If hit a breakpoint, return all the way back to the event loop and exit in to suspend
				/**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;
			}
		}
		
		/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
		
			this.runtime.popEventStack();
		
		/**PREVIEWONLY**/}
	};

	EventBlock.prototype.run_pretrigger = function ()
	{
		// When an event is triggered, the parent events preceding the trigger are run
		// in this mode, in top to bottom.
		// All that's necessary is to run the conditions alone, to set up the SOL.
		var evinfo = this.runtime.getCurrentEventStack();
		evinfo.current_event = this;
		var any_true = false;
		
		var i, len;
		for (evinfo.cndindex = 0, len = this.conditions.length; evinfo.cndindex < len; evinfo.cndindex++)
		{
			// Don't run looping conditions - they don't work pre-trigger
			assert2(!this.conditions[evinfo.cndindex].looping, "Trigger found as subevent to a loop - this is not allowed, IDE will prevent this setup in future");

			if (this.conditions[evinfo.cndindex].run())
				any_true = true;
			else if (!this.orblock)			// condition failed (let OR blocks run all conditions anyway)
				return false;               // bail out
		}

		// No need to run subevents - trigger has worked out all parents
		return this.orblock ? any_true : true;
	};

	// Running retriggered for a looping condition
	EventBlock.prototype.retrigger = function ()
	{
		// Hack for Sprite's Spawn an Object to pick properly.
		this.runtime.execcount++;
		
		// Start iterating one beyond the current condition
		var prevcndindex = this.runtime.getCurrentEventStack().cndindex;
		var len;

		// This is recursing, so push to the event stack
		var evinfo = this.runtime.pushEventStack(this);

		// Running from the condition routine of a trigger.  Continue the event from
		// the condition immediately following the current condition, unless this is an
		// or block, in which case just skip to running the actions and subevents.
		if (!this.orblock)
		{
			for (evinfo.cndindex = prevcndindex + 1, len = this.conditions.length; evinfo.cndindex < len; evinfo.cndindex++)
			{
				if (!this.conditions[evinfo.cndindex].run())    // condition failed
				{
					this.runtime.popEventStack();               // moving up level of recursion
					return false;                               // bail out
				}
			}
		}

		this.run_actions_and_subevents();

		// Done with this level of recursion
		this.runtime.popEventStack();
		
		return true;		// ran an iteration
	};
	
	EventBlock.prototype.isFirstConditionOfType = function (cnd)
	{
		var cndindex = cnd.index;
		
		if (cndindex === 0)
			return true;
		
		--cndindex;
		
		for ( ; cndindex >= 0; --cndindex)
		{
			if (this.conditions[cndindex].type === cnd.type)
				return false;
		}
		
		return true;
	};
	
	cr.eventblock = EventBlock;

	// Event condition class
	function Condition(block, m)
	{
		// Runtime members
		this.block = block;
		this.sheet = block.sheet;
		this.runtime = block.runtime;
		this.parameters = [];
		this.results = [];
		this.extra = {};		// for plugins to stow away some custom info
		this.index = -1;
		
		this.anyParamVariesPerInstance = false;
		
		// Data model & initialisation
		this.func = this.runtime.GetObjectReference(m[1]);
		assert2(this.func, "Condition method appears to be missing, check ACE table names match script names");

		this.trigger = (m[3] > 0);
		this.fasttrigger = (m[3] === 2);
		this.looping = m[4];
		this.inverted = m[5];
		this.isstatic = m[6];
		this.sid = m[7];
		/**PREVIEWONLY**/this.is_breakpoint = this.runtime.isDebug && m[8];
		this.runtime.cndsBySid[this.sid.toString()] = this;
		
		if (m[0] === -1)		// system object
		{
			this.type = null;
			this.run = this.run_system;
			this.behaviortype = null;
			this.beh_index = -1;
		}
		else
		{
			// Get object type
			this.type = this.runtime.types_by_index[m[0]];
			assert2(this.type, "Cannot find object type for condition '" + m[0] + "'");

			if (this.isstatic)
				this.run = this.run_static;
			else
				this.run = this.run_object;

			// Behavior condition
			if (m[2])
			{
				this.behaviortype = this.type.getBehaviorByName(m[2]);
				assert2(this.behaviortype, "Cannot find behavior '" + m[2] + "' for '" + m[0] + "'");
				
				this.beh_index = this.type.getBehaviorIndexByName(m[2]);
				assert2(this.beh_index > -1, "Could not find behavior index by name");
			}
			// Ordinary object condition
			else
			{
				this.behaviortype = null;
				this.beh_index = -1;
			}
			
			// Since this is an object condition and therefore changes the SOL,
			// make sure the parent is aware it writes to the SOL after its own conditions.
			if (this.block.parent)
				this.block.parent.setSolWriterAfterCnds();
		}
		
		// If a fast trigger just set the run function to return true; the fact
		// the condition is running implies it has already met the condition
		if (this.fasttrigger)
			this.run = this.run_true;

		// Initialise each parameter (if any)
		if (m.length === 10)
		{
			var i, len;
			var em = m[9];
			
			for (i = 0, len = em.length; i < len; i++)
			{
				var param = new cr.parameter(this, em[i]);
				cr.seal(param);
				this.parameters.push(param);
			}

			// For evaluating parameters
			this.results.length = em.length;
		}
	};

	Condition.prototype.postInit = function ()
	{
		var i, len, p;
		for (i = 0, len = this.parameters.length; i < len; i++)
		{
			p = this.parameters[i];
			p.postInit();
			
			if (p.variesPerInstance)
				this.anyParamVariesPerInstance = true;
		}
	};
	
	/*
	Condition.prototype.is_logical = function ()
	{
		// Logical conditions are system or singleglobal object conditions
		return !this.type || this.type.plugin.singleglobal;
	};
	*/
	
	// for fast triggers
	Condition.prototype.run_true = function ()
	{
		return true;
	};

	Condition.prototype.run_system = function ()
	{
		/**BEGIN-PREVIEWONLY**/
		if (this.runtime.resuming_breakpoint)
		{
			// Resuming from this condition
			if (this == this.runtime.breakpoint_condition)
			{
				this.runtime.resuming_breakpoint = false;
				this.runtime.breakpoint_event = null;
				this.runtime.breakpoint_condition = null;
				this.runtime.breakpoint_action = null;
			}
		}
		else
		{
			if ((this.is_breakpoint || this.runtime.step_break) && this.block.is_breakable && !this.block.group && this.runtime.trigger_depth === 0)
			{
				this.runtime.breakpoint_event = this.runtime.getCurrentEventStack().current_event;
				this.runtime.breakpoint_condition = this;
				this.runtime.breakpoint_action = null;
				this.runtime.debugBreak();
				return false;
			}
		}
		/**END-PREVIEWONLY**/
		
		var i, len;

		// Evaluate all parameters
		for (i = 0, len = this.parameters.length; i < len; i++)
			this.results[i] = this.parameters[i].get();

		// Apply method with this = system object.
		return cr.xor(this.func.apply(this.runtime.system, this.results), this.inverted);
	};

	Condition.prototype.run_static = function ()
	{
		/**BEGIN-PREVIEWONLY**/
		if (this.runtime.resuming_breakpoint)
		{
			// Resuming from this condition
			if (this == this.runtime.breakpoint_condition)
			{
				this.runtime.resuming_breakpoint = false;
				this.runtime.breakpoint_event = null;
				this.runtime.breakpoint_condition = null;
				this.runtime.breakpoint_action = null;
			}
		}
		else
		{
			if ((this.is_breakpoint || this.runtime.step_break) && this.block.is_breakable && this.runtime.trigger_depth === 0)
			{
				this.runtime.breakpoint_event = this.runtime.getCurrentEventStack().current_event;
				this.runtime.breakpoint_condition = this;
				this.runtime.breakpoint_action = null;
				this.runtime.debugBreak();
				return false;
			}
		}
		/**END-PREVIEWONLY**/
		
		var i, len;

		// Evaluate all parameters
		for (i = 0, len = this.parameters.length; i < len; i++)
			this.results[i] = this.parameters[i].get();

		// Apply object method, but with the object type as 'this'.  Don't process invert
		// on the result!  Trust that the method takes in to account invert.
		var ret = this.func.apply(this.behaviortype ? this.behaviortype : this.type, this.results);
		this.type.applySolToContainer();
		return ret;
	};

	Condition.prototype.run_object = function ()
	{		
		/**BEGIN-PREVIEWONLY**/
		var runtime = this.runtime;
		
		if (runtime.resuming_breakpoint)
		{
			// Resuming from this condition
			if (this == runtime.breakpoint_condition)
			{
				runtime.resuming_breakpoint = false;
				runtime.breakpoint_event = null;
				runtime.breakpoint_condition = null;
				runtime.breakpoint_action = null;
			}
		}
		else
		{
			if ((this.is_breakpoint || runtime.step_break) && this.block.is_breakable && runtime.trigger_depth === 0)
			{
				runtime.breakpoint_event = runtime.getCurrentEventStack().current_event;
				runtime.breakpoint_condition = this;
				runtime.breakpoint_action = null;
				runtime.debugBreak();
				return false;
			}
		}
		/**END-PREVIEWONLY**/
		
		var i, j, k, leni, lenj, p, ret, met, inst, s, sol2;
		//var has_else = this.block.has_else_block;
		
		var type = this.type;
		var sol = type.getCurrentSol();
		var is_orblock = this.block.orblock && !this.trigger;		// triggers in OR blocks need to work normally
		var offset = 0;
		var is_contained = type.is_contained;
		var is_family = type.is_family;
		var family_index = type.family_index;
		var beh_index = this.beh_index;
		var is_beh = (beh_index > -1);
		var params_vary = this.anyParamVariesPerInstance;
		var parameters = this.parameters;
		var results = this.results;
		var inverted = this.inverted;
		var func = this.func;
		var arr, container;
		
		if (params_vary)
		{
			// If parameters could vary per-instance, we can still evaluate any individual parameters that
			// don't vary up-front, and only evaluate the varying parameters per-instance.
			for (j = 0, lenj = parameters.length; j < lenj; ++j)
			{
				p = parameters[j];
				
				if (!p.variesPerInstance)
					results[j] = p.get(0);
			}
		}
		else
		{
			// Parameters for this action can be fully evaluated in advance without needing per-instance
			// re-evaluation.
			for (j = 0, lenj = parameters.length; j < lenj; ++j)
				results[j] = parameters[j].get(0);
		}

		// All selected: iterate instances and push results to selection
		if (sol.select_all) {
			cr.clearArray(sol.instances);       // clear contents
			cr.clearArray(sol.else_instances);
			arr = type.instances;

			for (i = 0, leni = arr.length; i < leni; ++i)
			{
				inst = arr[i];
				assert2(inst, "Invalid instance tested in condition (1)");

				// Evaluate parameters
				if (params_vary)
				{
					for (j = 0, lenj = parameters.length; j < lenj; ++j)
					{
						p = parameters[j];
						
						if (p.variesPerInstance)
							results[j] = p.get(i);        // default SOL index is current object
					}
				}

				// Behavior condition
				if (is_beh)
				{
					// Offset if using family behaviors
					offset = 0;
					
					if (is_family)
					{
						offset = inst.type.family_beh_map[family_index];
					}
				
					ret = func.apply(inst.behavior_insts[beh_index + offset], results);
				}
				// Else ordinary condition
				else
					ret = func.apply(inst, results);

				// Apply invert and select
				met = cr.xor(ret, inverted);
				
				if (met)
					sol.instances.push(inst);
				else if (is_orblock)					// in OR blocks, keep the instances not meeting the condition for subsequent testing
					sol.else_instances.push(inst);
			}
			
			if (type.finish)
				type.finish(true);
			
			sol.select_all = false;
			type.applySolToContainer();
			return sol.hasObjects();
		}
		else {
			k = 0;
			
			// Note: don't use applySolToContainer() here, because its use could be inefficient when
			// lots of conditions are used in a cascade (it will clear and re-fill the entire array every time).
			
			// OR blocks only need to test instances not meeting any prior condition, stored in else_instances.
			// Note if this is the first condition in an OR block which is a sub-event to an ordinary block,
			// we still must look in instances instead of else_instances.
			var using_else_instances = (is_orblock && !this.block.isFirstConditionOfType(this));
			arr = (using_else_instances ? sol.else_instances : sol.instances);
			var any_true = false;

			// Not all selected: filter those which meet the condition
			for (i = 0, leni = arr.length; i < leni; ++i)
			{
				inst = arr[i];
				assert2(inst, "Invalid instance tested in condition (2)");

				// Evaluate parameters
				if (params_vary)
				{
					for (j = 0, lenj = parameters.length; j < lenj; ++j)
					{
						p = parameters[j];
						
						if (p.variesPerInstance)
							results[j] = p.get(i);        // default SOL index is current object
					}
				}

				// Behavior condition
				if (is_beh)
				{
					// Offset if using family behaviors
					offset = 0;
					
					if (is_family)
					{
						offset = inst.type.family_beh_map[family_index];
					}
					
					ret = func.apply(inst.behavior_insts[beh_index + offset], results);
				}
				// Else ordinary condition
				else
					ret = func.apply(inst, results);

				// Test if condition true for this instance
				if (cr.xor(ret, inverted))
				{
					any_true = true;
					
					// OR block: erase from arr (by not incrementing k) and append to picked instances
					if (using_else_instances)
					{
						sol.instances.push(inst);
						
						// Apply to container
						if (is_contained)
						{
							for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
							{
								s = inst.siblings[j];
								s.type.getCurrentSol().instances.push(s);
							}
						}
					}
					// Otherwise keep this instance (by incrementing k)
					else
					{
						arr[k] = inst;
						
						// Apply to container
						if (is_contained)
						{
							for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
							{
								s = inst.siblings[j];
								s.type.getCurrentSol().instances[k] = s;
							}
						}
						
						k++;
					}
				}
				// Condition not true
				else
				{
					// In an OR block, we're iterating else_instances.  So make sure we leave the instance there (by incrementing k).
					if (using_else_instances)
					{
						arr[k] = inst;
						
						// Apply to container
						if (is_contained)
						{
							for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
							{
								s = inst.siblings[j];
								s.type.getCurrentSol().else_instances[k] = s;
							}
						}
						
						k++;
					}
					else if (is_orblock)
					{
						sol.else_instances.push(inst);
						
						// Apply to container
						if (is_contained)
						{
							for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
							{
								s = inst.siblings[j];
								s.type.getCurrentSol().else_instances.push(s);
							}
						}
					}
				}
			}

			// Truncate array to only those meeting condition.
			cr.truncateArray(arr, k);
			
			// Apply same to container
			if (is_contained)
			{
				container = type.container;
				
				for (i = 0, leni = container.length; i < leni; i++)
				{
					sol2 = container[i].getCurrentSol();
					
					if (using_else_instances)
						cr.truncateArray(sol2.else_instances, k);
					else
						cr.truncateArray(sol2.instances, k);
				}
			}
			
			var pick_in_finish = any_true;		// don't pick in finish() if we're only doing the logic test below
			
			// If an OR block and any_true is false, we only checked else_instances.
			// We still need to flag the event as true if any instances in the main
			// instances list meet the condition.  So to a non-picking logic only
			// test.
			if (using_else_instances && !any_true)
			{
				for (i = 0, leni = sol.instances.length; i < leni; i++)
				{
					inst = sol.instances[i];

					// Evaluate parameters
					if (params_vary)
					{
						for (j = 0, lenj = parameters.length; j < lenj; j++)
						{
							p = parameters[j];
							
							if (p.variesPerInstance)
								results[j] = p.get(i);
						}
					}

					// Behavior condition
					if (is_beh)
						ret = func.apply(inst.behavior_insts[beh_index], results);
					// Else ordinary condition
					else
						ret = func.apply(inst, results);

					// Test if condition true for this instance
					if (cr.xor(ret, inverted))
					{
						any_true = true;
						break;		// got our flag, don't need to test any more
					}
				}
			}
			
			if (type.finish)
				type.finish(pick_in_finish || is_orblock);
			
			// Return true if any objects in SOL, but 'OR' blocks need to return false
			// if no conditions ran even if there are instances in the SOL
			return is_orblock ? any_true : sol.hasObjects();
		}
	};
	
	cr.condition = Condition;

	// Event action class
	function Action(block, m)
	{
		// Runtime members
		this.block = block;
		this.sheet = block.sheet;
		this.runtime = block.runtime;
		this.parameters = [];
		this.results = [];
		this.extra = {};		// for plugins to stow away some custom info
		this.index = -1;
		
		this.anyParamVariesPerInstance = false;
		
		// Data model & initialisation
		this.func = this.runtime.GetObjectReference(m[1]);
		assert2(this.func, "Action method appears to be missing, check ACE table names match script names");
		
		if (m[0] === -1)	// system
		{
			this.type = null;
			this.run = this.run_system;
			this.behaviortype = null;
			this.beh_index = -1;
		}
		else
		{
			this.type = this.runtime.types_by_index[m[0]];
			assert2(this.type, "Cannot find type for action '" + m[0] + "'");
			this.run = this.run_object;

			// Behavior action
			if (m[2])
			{
				this.behaviortype = this.type.getBehaviorByName(m[2]);
				assert2(this.behaviortype, "Cannot find behavior type '" + m[2] + "'");
				
				this.beh_index = this.type.getBehaviorIndexByName(m[2]);
				assert2(this.beh_index > -1, "Could not find behavior by name");
			}
			else
			{
				this.behaviortype = null;
				this.beh_index = -1;
			}
		}
		
		this.sid = m[3];
		/**PREVIEWONLY**/this.is_breakpoint = this.runtime.isDebug && m[4];
		this.runtime.actsBySid[this.sid.toString()] = this;

		// Initialise parameters
		if (m.length === 6)
		{
			var i, len;
			var em = m[5];
			
			for (i = 0, len = em.length; i < len; i++)
			{
				var param = new cr.parameter(this, em[i]);
				cr.seal(param);
				this.parameters.push(param);
			}

			// For evaluating parameters
			this.results.length = em.length;
		}
	};

	Action.prototype.postInit = function ()
	{
		var i, len, p;
		for (i = 0, len = this.parameters.length; i < len; i++)
		{
			p = this.parameters[i];
			p.postInit();
			
			if (p.variesPerInstance)
				this.anyParamVariesPerInstance = true;
		}
	};

	Action.prototype.run_system = function ()
	{
		var runtime = this.runtime;
		
		/**BEGIN-PREVIEWONLY**/		
		if (runtime.resuming_breakpoint)
		{
			// Resuming from this action
			if (this == runtime.breakpoint_action)
			{
				runtime.resuming_breakpoint = false;
				runtime.breakpoint_event = null;
				runtime.breakpoint_condition = null;
				runtime.breakpoint_action = null;
			}
			// Otherwise keep skipping till we reach the action to resume from
			else
			{
				return false;
			}
		}
		else
		{
			if ((this.is_breakpoint || runtime.step_break) && this.block.is_breakable && runtime.trigger_depth === 0)
			{
				runtime.breakpoint_event = runtime.getCurrentEventStack().current_event;
				runtime.breakpoint_condition = null;
				runtime.breakpoint_action = this;
				runtime.debugBreak();
				return true;	// make action loop also return
			}
		}
		/**END-PREVIEWONLY**/
		
		var i, len;
		var parameters = this.parameters;
		var results = this.results;

		// Evaluate parameters
		for (i = 0, len = parameters.length; i < len; ++i)
			results[i] = parameters[i].get();

		return this.func.apply(runtime.system, results);
	};

	Action.prototype.run_object = function ()
	{
		/**BEGIN-PREVIEWONLY**/
		var runtime = this.runtime;
		
		if (runtime.resuming_breakpoint)
		{
			// Resuming from this action
			if (this == runtime.breakpoint_action)
			{
				runtime.resuming_breakpoint = false;
				runtime.breakpoint_event = null;
				runtime.breakpoint_condition = null;
				runtime.breakpoint_action = null;
			}
			// Otherwise keep skipping till we reach the action to resume from
			else
			{
				return false;
			}
		}
		else
		{
			if ((this.is_breakpoint || runtime.step_break) && this.block.is_breakable && runtime.trigger_depth === 0)
			{
				runtime.breakpoint_event = runtime.getCurrentEventStack().current_event;
				runtime.breakpoint_condition = null;
				runtime.breakpoint_action = this;
				runtime.debugBreak();
				return true;	// make action loop also return
			}
		}
		/**END-PREVIEWONLY**/
		
		// Get the instances to execute on
		var type = this.type;
		var beh_index = this.beh_index;
		var family_index = type.family_index;
		var params_vary = this.anyParamVariesPerInstance;
		var parameters = this.parameters;
		var results = this.results;
		var func = this.func;
		var instances = type.getCurrentSol().getObjects();
		var is_family = type.is_family;
		var is_beh = (beh_index > -1);
		
		var i, j, leni, lenj, p, inst, offset;
		
		if (params_vary)
		{
			// If parameters could vary per-instance, we can still evaluate any individual parameters that
			// don't vary up-front, and only evaluate the varying parameters per-instance.
			for (j = 0, lenj = parameters.length; j < lenj; ++j)
			{
				p = parameters[j];
				
				if (!p.variesPerInstance)
					results[j] = p.get(0);
			}
		}
		else
		{
			// Parameters for this action can be fully evaluated in advance without needing per-instance
			// re-evaluation.
			for (j = 0, lenj = parameters.length; j < lenj; ++j)
				results[j] = parameters[j].get(0);
		}

		for (i = 0, leni = instances.length; i < leni; ++i)
		{
			inst = instances[i];
			
			// Evaluate parameters for this instance if we couldn't evaluate them all up-front
			if (params_vary)
			{
				for (j = 0, lenj = parameters.length; j < lenj; ++j)
				{
					// Only evaluate the specific parameters that vary per-instance. If 
					p = parameters[j];
					
					if (p.variesPerInstance)
						results[j] = p.get(i);    // pass i to use as default SOL index
				}
			}

			// Behavior action: call routine on corresponding behavior instance
			if (is_beh)
			{
				// Offset if using family behaviors
				offset = 0;
				
				if (is_family)
				{
					offset = inst.type.family_beh_map[family_index];
				}
			
				func.apply(inst.behavior_insts[beh_index + offset], results);
			}
			// Otherwise ordinary action call
			else
				func.apply(inst, results);
		}
		
		return false;
	};
	
	cr.action = Action;
	
	// temporary return values to support expression evaluation in recursive functions
	var tempValues = [];
	var tempValuesPtr = -1;
	
	function pushTempValue()
	{
		tempValuesPtr++;
		
		if (tempValues.length === tempValuesPtr)
			tempValues.push(new cr.expvalue());
			
		return tempValues[tempValuesPtr];
	};
	
	function popTempValue()
	{
		tempValuesPtr--;
	};

	// Parameter class
	function Parameter(owner, m)
	{
		// Runtime members
		this.owner = owner;
		this.block = owner.block;
		this.sheet = owner.sheet;
		this.runtime = owner.runtime;
		
		// Data members & initialisation
		this.type = m[0];
		
		this.expression = null;
		this.solindex = 0;
		this.get = null;
		this.combosel = 0;
		this.layout = null;
		this.key = 0;
		this.object = null;
		this.index = 0;
		this.varname = null;
		this.eventvar = null;
		this.fileinfo = null;
		this.subparams = null;
		this.variadicret = null;
		this.subparams = null;
		this.variadicret = null;
		
		// Indicates evaluated value could change between instances. If true, parameter must be
		// repeatedly evaluated for each instance, but if false, can be evaluated once and the value shared
		// for all instances, which is faster.
		this.variesPerInstance = false;
		
		var i, len, param;
		
		switch (m[0])
		{
			case 0:		// number
			case 7:		// any
				this.expression = new cr.expNode(this, m[1]);
				this.solindex = 0;
				this.get = this.get_exp;
				break;
			case 1:		// string
				this.expression = new cr.expNode(this, m[1]);
				this.solindex = 0;
				this.get = this.get_exp_str;
				break;
			case 5:		// layer
				// As with the expression, but automatically converts result to a layer
				this.expression = new cr.expNode(this, m[1]);
				this.solindex = 0;
				this.get = this.get_layer;
				break;
			case 3:		// combo
			case 8:		// cmp
				this.combosel = m[1];
				this.get = this.get_combosel;
				break;
			case 6:		// layout
				// Get the layout by name
				this.layout = this.runtime.layouts[m[1]];
				assert2(this.layout, "Can't find layout for layout parameter: " + m[1]);
				this.get = this.get_layout;
				break;
			case 9:		// keyb
				this.key = m[1];
				this.get = this.get_key;
				break;
			case 4:		// object
				// Get the object by index
				this.object = this.runtime.types_by_index[m[1]];
				assert2(this.object, "Can't find object type for object parameter: " + m[1]);
				this.get = this.get_object;

				// To allow SOL modifications on object parameters, add to block's SOL modifiers.
				this.block.addSolModifier(this.object);
				
				// For actions, set the owner block as a SOL writer after conditions
				if (this.owner instanceof cr.action)
					this.block.setSolWriterAfterCnds();
				// For conditions, make sure any parent blocks are aware the SOL is written to after conditions
				else if (this.block.parent)
					this.block.parent.setSolWriterAfterCnds();

				break;
			case 10:	// instvar
				this.index = m[1];
				
				if (owner.type.is_family)
				{
					// Getting a family variable relies on the sol index and picked
					// objects, so always evaluate per-instance for this parameter type.
					this.get = this.get_familyvar;
					this.variesPerInstance = true;
				}
				else
					this.get = this.get_instvar;
				
				break;
			case 11:	// eventvar
				// Still in the middle of initialising the application event sheets
				// Wait until postInit() after all event variables are initialised to look up
				// the event variable we want.
				this.varname = m[1];
				this.eventvar = null;
				this.get = this.get_eventvar;
				break;
			case 2:		// audiofile	["name", ismusic]
			case 12:	// fileinfo		"name"
				this.fileinfo = m[1];
				this.get = this.get_audiofile;
				break;
			case 13:	// variadic
				this.get = this.get_variadic;
				this.subparams = [];
				this.variadicret = [];
				for (i = 1, len = m.length; i < len; i++)
				{
					param = new cr.parameter(this.owner, m[i]);
					cr.seal(param);
					this.subparams.push(param);
					this.variadicret.push(0);
				}
				break;
			default:
				assert2(false, "Unknown parameter type: " + this.type);
		}
	};

	Parameter.prototype.postInit = function ()
	{
		var i, len;
		
		if (this.type === 11)		// eventvar
		{
			// All variables have now been init()'d, so we can safely look up and cache
			// the variable by its name.
			this.eventvar = this.runtime.getEventVariableByName(this.varname, this.block.parent);
			assert2(this.eventvar, "Cannot find event variable '" + this.varname + "'");
		}
		else if (this.type === 13)	// variadic, postInit all sub-params
		{
			for (i = 0, len = this.subparams.length; i < len; i++)
				this.subparams[i].postInit();
		}
		
		// To also look up event variables in any expressions, post-init any expression
		if (this.expression)
			this.expression.postInit();
	};
	
	Parameter.prototype.maybeVaryForType = function (t)
	{
		if (this.variesPerInstance)
			return;				// already varies per instance, no need to check again
		
		if (!t)
			return;				// never vary for system type
		
		// Any reference to an object type that could have more than one instance will
		// vary per instance, since each evaluation passes the solindex and requests
		// a value from a different instance.
		if (!t.plugin.singleglobal)
		{
			this.variesPerInstance = true;
			return;
		}
	};
	
	Parameter.prototype.setVaries = function ()
	{
		this.variesPerInstance = true;
	};

	Parameter.prototype.get_exp = function (solindex)
	{
		this.solindex = solindex || 0;   // default SOL index to use
		var temp = pushTempValue();
		this.expression.get(temp);
		popTempValue();
		return temp.data;      			// return actual JS value, not expvalue
	};
	
	Parameter.prototype.get_exp_str = function (solindex)
	{
		this.solindex = solindex || 0;   // default SOL index to use
		var temp = pushTempValue();
		this.expression.get(temp);
		popTempValue();
		
		// On rare occasions non-existent objects and other corner cases can return the default integer 0
		// from what would otherwise be a string expression.  This can result in 0 being passed for a string
		// parameter, where it then throws an error (e.g. str.substr() calls 0.substr()).  To ensure this
		// never happens, check the result is really a string and return an empty string if not.
		if (cr.is_string(temp.data))
			return temp.data;
		else
			return "";
	};

	Parameter.prototype.get_object = function ()
	{
		return this.object;
	};

	Parameter.prototype.get_combosel = function ()
	{
		return this.combosel;
	};

	Parameter.prototype.get_layer = function (solindex)
	{
		// As with get expression but automatically convert result to layer
		this.solindex = solindex || 0;   // default SOL index to use
		var temp = pushTempValue();
		this.expression.get(temp);
		popTempValue();

		if (temp.is_number())
			return this.runtime.getLayerByNumber(temp.data);
		else
			return this.runtime.getLayerByName(temp.data);
	}

	Parameter.prototype.get_layout = function ()
	{
		return this.layout;
	};

	Parameter.prototype.get_key = function ()
	{
		return this.key;
	};

	Parameter.prototype.get_instvar = function ()
	{
		return this.index;
	};
	
	Parameter.prototype.get_familyvar = function (solindex_)
	{
		// Find the offset for the family variable index for the specific instance's type
		var solindex = solindex_ || 0;
		var familytype = this.owner.type;
		var realtype = null;
		var sol = familytype.getCurrentSol();
		var objs = sol.getObjects();
		
		// In OR blocks, sols can be empty - resort to else_instances if need be
		if (objs.length)
			realtype = objs[solindex % objs.length].type;
		else if (sol.else_instances.length)
			realtype = sol.else_instances[solindex % sol.else_instances.length].type;
		else if (familytype.instances.length)
			realtype = familytype.instances[solindex % familytype.instances.length].type;
		else
			return 0;

		return this.index + realtype.family_var_map[familytype.family_index];
	};

	Parameter.prototype.get_eventvar = function ()
	{
		// Return actual event variable object in the event tree.
		// This was looked up and cached in postInit()
		return this.eventvar;
	};
	
	Parameter.prototype.get_audiofile = function ()
	{
		return this.fileinfo;
	};
	
	Parameter.prototype.get_variadic = function ()
	{
		var i, len;
		for (i = 0, len = this.subparams.length; i < len; i++)
		{
			this.variadicret[i] = this.subparams[i].get();
		}
		
		return this.variadicret;
	};
	
	cr.parameter = Parameter;

	// Event variable class
	function EventVariable(sheet, parent, m)
	{
		// Runtime members
		this.sheet = sheet;
		this.parent = parent;
		this.runtime = sheet.runtime;
		this.solModifiers = [];
		
		// Data model members
		this.name = m[1];
		this.vartype = m[2];
		this.initial = m[3];
		this.is_static = !!m[4];
		this.is_constant = !!m[5];
		this.sid = m[6];
		/**PREVIEWONLY**/this.is_breakpoint = this.runtime.isDebug && m[7];
		this.runtime.varsBySid[this.sid.toString()] = this;
		this.data = this.initial;	// note: also stored in event stack frame for local nonstatic nonconst vars
		
		if (this.parent)			// local var
		{
			if (this.is_static || this.is_constant)
				this.localIndex = -1;
			else
				this.localIndex = this.runtime.stackLocalCount++;
			
			this.runtime.all_local_vars.push(this);
		}
		else						// global var
		{
			this.localIndex = -1;
			this.runtime.all_global_vars.push(this);
		}
	};

	EventVariable.prototype.postInit = function ()
	{
		this.solModifiers = findMatchingSolModifier(this.solModifiers);
	};
	
	EventVariable.prototype.setValue = function (x)
	{
		assert2(!this.is_constant, "Calling setValue on constant event variable");
		
		var lvs = this.runtime.getCurrentLocalVarStack();
		
		// global, static local variable, or no event stack: just use this.data
		if (!this.parent || this.is_static || !lvs)
			this.data = x;
		else	// local nonstatic variable: use event stack to keep value at this level of recursion
		{
			// ensure enough array entries
			if (this.localIndex >= lvs.length)
				lvs.length = this.localIndex + 1;
			
			// store in current stack frame so recursive functions get their own value
			lvs[this.localIndex] = x;
		}
	};
	
	EventVariable.prototype.getValue = function ()
	{
		var lvs = this.runtime.getCurrentLocalVarStack();
		
		// global, static local variable, or no event stack: just use this.data
		if (!this.parent || this.is_static || !lvs || this.is_constant)
			return this.data;
		else	// local nonstatic variable
		{
			// if not enough array entries, or array value is undefined, no value has been assigned yet at this stack level - just return initial
			if (this.localIndex >= lvs.length)
			{
				//log("Check: local var stack not big enough");
				return this.initial;
			}
			
			if (typeof lvs[this.localIndex] === "undefined")
			{
				//log("Check: local var stack holds undefined value");
				return this.initial;
			}
			
			return lvs[this.localIndex];
		}
	};

	EventVariable.prototype.run = function ()
	{
		/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
		
			// If not global, static or constant, reset initial value
			if (this.parent && !this.is_static && !this.is_constant)
				this.setValue(this.initial);
		
		/**PREVIEWONLY**/}
	};
	
	cr.eventvariable = EventVariable;

    // Event include class
	function EventInclude(sheet, parent, m)
	{
		// Runtime members
		this.sheet = sheet;
		this.parent = parent;
		this.runtime = sheet.runtime;
		this.solModifiers = [];
		this.include_sheet = null;		// determined in postInit
		
		// Data model members
		this.include_sheet_name = m[1];
		
		this.active = true;
		
		/**PREVIEWONLY**/this.is_breakpoint = this.runtime.isDebug && m[2];
	};
	
	EventInclude.prototype.toString = function ()
	{
		return "include:" + this.include_sheet.toString();
	};

	EventInclude.prototype.postInit = function ()
	{
		// Look up the event sheet by name, which isn't available in init() but is in postInit()
        this.include_sheet = this.runtime.eventsheets[this.include_sheet_name];
        assert2(this.include_sheet, "Cannot find event sheet '" + this.include_sheet_name + "' for include");
        assert2(this.include_sheet != this.sheet, "Event sheet include includes its own sheet");

        // Add to event sheet's list of first-level includes
        this.sheet.includes.add(this);
		
		this.solModifiers = findMatchingSolModifier(this.solModifiers);
		
		// Add to any groups that contain this
		var p = this.parent;
		
		while (p)
		{
			if (p.group)
				p.contained_includes.push(this);
			
			p = p.parent;
		}
		
		this.updateActive();
	};

	EventInclude.prototype.run = function ()
	{
		// Event sheets ought not be in subevents, but support this anyway.
        // When they're a subevent, they'll need a whole new clean SOL level for
        // all object types in the application, to ensure it won't trash the current SOL.
		/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
			if (this.parent)
				this.runtime.pushCleanSol(this.runtime.types_by_index);
		/**PREVIEWONLY**/}

        // To prevent cyclic includes, don't run an event sheet more than once per tick.
        if (!this.include_sheet.hasRun)
            this.include_sheet.run(true);			// from include
		
		// If hit a breakpoint, return all the way back to the event loop and exit in to suspend
		/**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;

		/**PREVIEWONLY**/if (!this.runtime.resuming_breakpoint) {
			if (this.parent)
				this.runtime.popSol(this.runtime.types_by_index);
		/**PREVIEWONLY**/}
	};
	
	EventInclude.prototype.updateActive = function ()
	{
		// Check is not in a disabled group
		var p = this.parent;
		
		while (p)
		{
			if (p.group && !p.group_active)
			{
				this.active = false;
				return;
			}
			
			p = p.parent;
		}
		
		this.active = true;
	};
	
	EventInclude.prototype.isActive = function ()
	{
		return this.active;
	};
	
	cr.eventinclude = EventInclude;
	
	function EventStackFrame()
	{
		this.temp_parents_arr = [];
		this.reset(null);
		cr.seal(this);
	};
	
	EventStackFrame.prototype.reset = function (cur_event)
	{
		this.current_event = cur_event;
		this.cndindex = 0;
		this.actindex = 0;
		cr.clearArray(this.temp_parents_arr);
		this.last_event_true = false;
		this.else_branch_ran = false;
		this.any_true_state = false;
	};
	
	EventStackFrame.prototype.isModifierAfterCnds = function ()
	{
		// Event's flag takes priority if set
		if (this.current_event.solWriterAfterCnds)
			return true;
		
		// Is not currently on the last condition: assume the conditions
		// that follow are SOL modifiers if the event has any SOL modifiers at all
		if (this.cndindex < this.current_event.conditions.length - 1)
			return !!this.current_event.solModifiers.length;
			
		// Otherwise we may safely assume nothing is modified from here
		return false;
	};
	
	cr.eventStackFrame = EventStackFrame;
	
}());