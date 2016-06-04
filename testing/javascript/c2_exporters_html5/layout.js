// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");

(function()
{
	// Layout class
	function Layout(runtime, m)
	{
		// Runtime members
		this.runtime = runtime;
		this.event_sheet = null;
		this.scrollX = (this.runtime.original_width / 2);
		this.scrollY = (this.runtime.original_height / 2);
		this.scale = 1.0;
		this.angle = 0;
		this.first_visit = true;
		
		// Data model values
		this.name = m[0];
		this.width = m[1];
		this.height = m[2];
		this.unbounded_scrolling = m[3];
		this.sheetname = m[4];
		this.sid = m[5];
		
		// Create layers from layers model
		var lm = m[6];
		var i, len;
		this.layers = [];
		this.initial_types = [];
		
		for (i = 0, len = lm.length; i < len; i++)
		{
			// Create real layer
			var layer = new cr.layer(this, lm[i]);
			layer.number = i;
			cr.seal(layer);
			this.layers.push(layer);
		}
		
		// Initialise nonworld instances from model
		var im = m[7];
		this.initial_nonworld = [];
		
		for (i = 0, len = im.length; i < len; i++)
		{
			var inst = im[i];

			// Lookup type index
			var type = this.runtime.types_by_index[inst[1]];
			assert2(type, "Could not find nonworld object type: " + inst.type_name);

			// If type has no default instance, make it this one
			if (!type.default_instance)
				type.default_instance = inst;
				
			this.initial_nonworld.push(inst);
			
			if (this.initial_types.indexOf(type) === -1)
				this.initial_types.push(type);
		}
		
		// Assign shaders
		this.effect_types = [];
		this.active_effect_types = [];
		this.shaders_preserve_opaqueness = true;
		this.effect_params = [];
		
		for (i = 0, len = m[8].length; i < len; i++)
		{
			this.effect_types.push({
				id: m[8][i][0],
				name: m[8][i][1],
				shaderindex: -1,
				preservesOpaqueness: false,
				active: true,
				index: i
			});
			
			this.effect_params.push(m[8][i][2].slice(0));
		}
		
		this.updateActiveEffects();
		
		this.rcTex = new cr.rect(0, 0, 1, 1);
		this.rcTex2 = new cr.rect(0, 0, 1, 1);
		
		// For persist behavior: {"type_sid": [inst, inst, inst...] }
		this.persist_data = {};
	};
	
	Layout.prototype.saveObjectToPersist = function (inst)
	{
		var sidStr = inst.type.sid.toString();
		
		if (!this.persist_data.hasOwnProperty(sidStr))
			this.persist_data[sidStr] = [];
			
		var type_persist = this.persist_data[sidStr];		
		type_persist.push(this.runtime.saveInstanceToJSON(inst));
	};
	
	Layout.prototype.hasOpaqueBottomLayer = function ()
	{
		var layer = this.layers[0];
		return !layer.transparent && layer.opacity === 1.0 && !layer.forceOwnTexture && layer.visible;
	};
	
	Layout.prototype.updateActiveEffects = function ()
	{
		cr.clearArray(this.active_effect_types);
		
		this.shaders_preserve_opaqueness = true;
		
		var i, len, et;
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			et = this.effect_types[i];
			
			if (et.active)
			{
				this.active_effect_types.push(et);
				
				if (!et.preservesOpaqueness)
					this.shaders_preserve_opaqueness = false;
			}
		}
	};
	
	Layout.prototype.getEffectByName = function (name_)
	{
		var i, len, et;
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			et = this.effect_types[i];
			
			if (et.name === name_)
				return et;
		}
		
		return null;
	};
	
	var created_instances = [];
	
	function sort_by_zindex(a, b)
	{
		return a.zindex - b.zindex;
	};
	
	var first_layout = true;

	Layout.prototype.startRunning = function ()
	{
		// Find event sheet
		if (this.sheetname)
		{
			this.event_sheet = this.runtime.eventsheets[this.sheetname];
			assert2(this.event_sheet, "Cannot find event sheet: " + this.sheetname);
			
			this.event_sheet.updateDeepIncludes();
		}

		// Mark this layout as running
		this.runtime.running_layout = this;

		// Scroll to top left
		this.scrollX = (this.runtime.original_width / 2);
		this.scrollY = (this.runtime.original_height / 2);
		
		// Shift all leftover global objects with a layer to this layout's layers instead
		var i, k, len, lenk, type, type_instances, inst, iid, t, s, p, q, type_data, layer;
		
		for (i = 0, len = this.runtime.types_by_index.length; i < len; i++)
		{
			type = this.runtime.types_by_index[i];
			
			if (type.is_family)
				continue;		// instances are only transferred for their real type
			
			type_instances = type.instances;
			
			for (k = 0, lenk = type_instances.length; k < lenk; k++)
			{
				inst = type_instances[k];
				
				if (inst.layer)
				{
					var num = inst.layer.number;
					if (num >= this.layers.length)
						num = this.layers.length - 1;
					inst.layer = this.layers[num];
					
					// Instances created when destroying objects from leaving the last layout
					// may still reside in the layer instance list. Be sure not to add twice.
					if (inst.layer.instances.indexOf(inst) === -1)
						inst.layer.instances.push(inst);
					
					inst.layer.zindices_stale = true;
				}
			}
		}
		
		// All the transferred global instances are now in whatever order they sit in their
		// instance lists, which could be jumbled up compared to their previous Z index.
		// Sort every layer's instances by their old Z indices to make an effort to preserve
		// global object's relative Z orders between layouts.
		// Don't do this on the very first layout run though, only when coming from another layout.
		if (!first_layout)
		{
			for (i = 0, len = this.layers.length; i < len; ++i)
			{
				this.layers[i].instances.sort(sort_by_zindex);
			}
		}
		
		var layer;
		cr.clearArray(created_instances);
		
		this.boundScrolling();

		// Create all the initial instances on layers
		for (i = 0, len = this.layers.length; i < len; i++)
		{
			layer = this.layers[i];
			layer.createInitialInstances();		// fills created_instances
			
			// Also reset layer view area (will not be set until next draw(), but it's better
			// than leaving it where it was from the last layout, which could be a different place)
			// Calculate the starting position, since otherwise 'Is on screen' is false for first tick
			// even for objects which are initially visible
			layer.updateViewport(null);
		}
		
		var uids_changed = false;
		
		// On second run and after, create persisted objects that were saved
		if (!this.first_visit)
		{
			for (p in this.persist_data)
			{
				if (this.persist_data.hasOwnProperty(p))
				{
					type = this.runtime.getObjectTypeBySid(parseInt(p, 10));
					
					if (!type || type.is_family || !this.runtime.typeHasPersistBehavior(type))
						continue;
					
					type_data = this.persist_data[p];
					
					for (i = 0, len = type_data.length; i < len; i++)
					{
						layer = null;
					
						if (type.plugin.is_world)
						{
							layer = this.getLayerBySid(type_data[i]["w"]["l"]);
							
							// layer's gone missing - just skip creating this instance
							if (!layer)
								continue;
						}
						
						// create an instance then load the state in to it
						// skip creating siblings; we'll link them up later
						inst = this.runtime.createInstanceFromInit(type.default_instance, layer, false, 0, 0, true);
						this.runtime.loadInstanceFromJSON(inst, type_data[i]);
						
						// createInstanceFromInit may have assigned a different UID to the one
						// loaded by loadInstanceFromJSON, so the runtime UID map may be wrong.
						// Make sure we rebuild the UID map from scratch in this case.
						uids_changed = true;
						
						created_instances.push(inst);
					}
					
					cr.clearArray(type_data);
				}
			}
			
			// Sort all layer indices to ensure Z order is restored
			for (i = 0, len = this.layers.length; i < len; i++)
			{
				this.layers[i].instances.sort(sort_by_zindex);
				this.layers[i].zindices_stale = true;		// in case of duplicates/holes
			}
		}
		
		if (uids_changed)
		{
			this.runtime.ClearDeathRow();
			this.runtime.refreshUidMap();
		}
		
		// createInstanceFromInit (via layer.createInitialInstance()s) does not create siblings for
		// containers when is_startup_instance is true, because all the instances are already in the layout.
		// Link them together now.
		for (i = 0; i < created_instances.length; i++)
		{
			inst = created_instances[i];
			
			if (!inst.type.is_contained)
				continue;
				
			iid = inst.get_iid();
				
			for (k = 0, lenk = inst.type.container.length; k < lenk; k++)
			{
				t = inst.type.container[k];
				
				if (inst.type === t)
					continue;
					
				if (t.instances.length > iid)
					inst.siblings.push(t.instances[iid]);
				else
				{
					// No initial paired instance in layout: create one
					if (!t.default_instance)
					{
						/**PREVIEWONLY**/ alert("Cannot create an instance of the object type '" + t.name + "': there are no instances of this object anywhere in the project.  Construct 2 needs at least one instance to know which properties to assign to the object.  To resolve this, add at least one instance of the object to the project, on an unused layout if necessary.");
					}
					else
					{
						s = this.runtime.createInstanceFromInit(t.default_instance, inst.layer, true, inst.x, inst.y, true);
						this.runtime.ClearDeathRow();
						t.updateIIDs();
						inst.siblings.push(s);
						created_instances.push(s);		// come back around and link up its own instances too
					}
				}
			}
		}
		
		// Create all initial non-world instances
		for (i = 0, len = this.initial_nonworld.length; i < len; i++)
		{
			inst = this.runtime.createInstanceFromInit(this.initial_nonworld[i], null, true);
			
			// Globals should not be in list; should have been created in createGlobalNonWorlds
			assert2(!inst.type.global, "Global non-world instance still in layout's initial non-world list");
		}		

		this.runtime.changelayout = null;
		
		// Create queued objects
		this.runtime.ClearDeathRow();
		
		// Canvas 2D renderer: attempt to preload all images that are used by types on this layout.
		// Since some canvas 2D browsers load images on demand, games can jank during playback as textures
		// are upload before first draw.  By drawing everything once on startup we can try to avoid this.
		// This may increase the chance devices run out of memory, but that's a problem with canvas 2D anyway.
		if (this.runtime.ctx && !this.runtime.isDomFree)
		{
			for (i = 0, len = this.runtime.types_by_index.length; i < len; i++)
			{
				t = this.runtime.types_by_index[i];
				
				// Don't preload images for family types or when no instances used
				if (t.is_family || !t.instances.length || !t.preloadCanvas2D)
					continue;
					
				t.preloadCanvas2D(this.runtime.ctx);
			}
		}
		
		/*
		// Print VRAM
		if (this.runtime.glwrap)
		{
			console.log("Estimated VRAM at layout start: " + this.runtime.glwrap.textureCount() + " textures, approx. " + Math.round(this.runtime.glwrap.estimateVRAM() / 1024) + " kb");
		}
		*/
		
		// Now every container object is created and linked, run through them all firing 'On created'.
		// Note if we are loading a savegame, this must be deferred until loading is complete.
		if (this.runtime.isLoadingState)
		{
			cr.shallowAssignArray(this.runtime.fireOnCreateAfterLoad, created_instances);
		}
		else
		{
			// Not loading: fire all "On Created" now
			for (i = 0, len = created_instances.length; i < len; i++)
			{
				inst = created_instances[i];
				this.runtime.trigger(Object.getPrototypeOf(inst.type.plugin).cnds.OnCreated, inst);
			}
		}
		
		// Clear array to drop references
		cr.clearArray(created_instances);
		
		// Trigger 'start of layout', unless we are changing layout because a savegame is loading
		if (!this.runtime.isLoadingState)
		{
			this.runtime.trigger(cr.system_object.prototype.cnds.OnLayoutStart, null);
		}
		
		// Mark persisted objects to be loaded instead of initial objects next time around
		this.first_visit = false;
	};
	
	Layout.prototype.createGlobalNonWorlds = function ()
	{
		var i, k, len, initial_inst, inst, type;
		
		// Create all initial global non-world instances
		for (i = 0, k = 0, len = this.initial_nonworld.length; i < len; i++)
		{
			initial_inst = this.initial_nonworld[i];
			type = this.runtime.types_by_index[initial_inst[1]];
			
			if (type.global)
			{
				// If the type is in a container, don't create it; it should only be created along
				// with its container instances.
				if (!type.is_contained)
				{
					inst = this.runtime.createInstanceFromInit(initial_inst, null, true);
				}
			}
			else
			{			
				// Remove globals from list
				this.initial_nonworld[k] = initial_inst;
				k++;
			}
		}
		
		cr.truncateArray(this.initial_nonworld, k);
	};

	Layout.prototype.stopRunning = function ()
	{
		assert2(this.runtime.running_layout == this, "Calling stopRunning() on a layout that is not running");
		
		/*
		// Print VRAM
		if (this.runtime.glwrap)
		{
			console.log("Estimated VRAM at layout end: " + this.runtime.glwrap.textureCount() + " textures, approx. " + Math.round(this.runtime.glwrap.estimateVRAM() / 1024) + " kb");
		}
		*/

		// Trigger 'end of layout'
		if (!this.runtime.isLoadingState)
		{
			this.runtime.trigger(cr.system_object.prototype.cnds.OnLayoutEnd, null);
		}
		
		this.runtime.isEndingLayout = true;
		
		// Clear all 'wait'-scheduled events
		cr.clearArray(this.runtime.system.waits);

		var i, leni, j, lenj;
		var layer_instances, inst, type;
		
		// Save any objects with the persist behavior. We have to do this before destroying non-global
		// objects in case objects are in a container and destroying an instance will destroy a
		// linked instance further up with the persist behavior before we get to it.
		// Also skip if the first_visit flag is set, since this is set by the "reset persistent objects"
		// system action and means we don't want to save this layout's state.
		if (!this.first_visit)
		{
			for (i = 0, leni = this.layers.length; i < leni; i++)
			{
				// ensure Z indices up to date so next layout can try to preserve relative
				// order of globals
				this.layers[i].updateZIndices();
				
				layer_instances = this.layers[i].instances;
				
				for (j = 0, lenj = layer_instances.length; j < lenj; j++)
				{
					inst = layer_instances[j];
					
					if (!inst.type.global)
					{
						if (this.runtime.typeHasPersistBehavior(inst.type))
							this.saveObjectToPersist(inst);
					}
				}
			}
		}
		
		// Destroy all non-globals
		for (i = 0, leni = this.layers.length; i < leni; i++)
		{
			layer_instances = this.layers[i].instances;
			
			for (j = 0, lenj = layer_instances.length; j < lenj; j++)
			{
				inst = layer_instances[j];
				
				if (!inst.type.global)
				{
					this.runtime.DestroyInstance(inst);
				}
			}
			
			this.runtime.ClearDeathRow();
			
			// Clear layer instances.  startRunning() picks up global objects and moves them to the new layout's layers.
			cr.clearArray(layer_instances);
			this.layers[i].zindices_stale = true;
		}
		
		// Destroy all non-global, non-world object type instances
		for (i = 0, leni = this.runtime.types_by_index.length; i < leni; i++)
		{
			type = this.runtime.types_by_index[i];
			
			// note we don't do this for families, we iterate the non-family types anyway
			if (type.global || type.plugin.is_world || type.plugin.singleglobal || type.is_family)
				continue;
				
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
				this.runtime.DestroyInstance(type.instances[j]);
				
			this.runtime.ClearDeathRow();
		}
		
		first_layout = false;
		this.runtime.isEndingLayout = false;
	};
	
	var temp_rect = new cr.rect(0, 0, 0, 0);
	
	Layout.prototype.recreateInitialObjects = function (type, x1, y1, x2, y2)
	{
		temp_rect.set(x1, y1, x2, y2);
		
		var i, len;
		for (i = 0, len = this.layers.length; i < len; i++)
		{
			this.layers[i].recreateInitialObjects(type, temp_rect);
		}
	};

	Layout.prototype.draw = function (ctx)
	{
		var layout_canvas;
		var layout_ctx = ctx;
		var ctx_changed = false;
		
		// Must render to off-screen canvas when using low-res fullscreen mode, then stretch back up
		var render_offscreen = !this.runtime.fullscreenScalingQuality;
		
		if (render_offscreen)
		{
			// Need another canvas to render to.  Ensure it is created.
			if (!this.runtime.layout_canvas)
			{
				this.runtime.layout_canvas = document.createElement("canvas");
				layout_canvas = this.runtime.layout_canvas;
				layout_canvas.width = this.runtime.draw_width;
				layout_canvas.height = this.runtime.draw_height;
				this.runtime.layout_ctx = layout_canvas.getContext("2d");
				ctx_changed = true;
			}

			layout_canvas = this.runtime.layout_canvas;
			layout_ctx = this.runtime.layout_ctx;

			// Window size has changed (browser fullscreen mode)
			if (layout_canvas.width !== this.runtime.draw_width)
			{
				layout_canvas.width = this.runtime.draw_width;
				ctx_changed = true;
			}
			if (layout_canvas.height !== this.runtime.draw_height)
			{
				layout_canvas.height = this.runtime.draw_height;
				ctx_changed = true;
			}
			
			if (ctx_changed)
			{
				layout_ctx["webkitImageSmoothingEnabled"] = this.runtime.linearSampling;
				layout_ctx["mozImageSmoothingEnabled"] = this.runtime.linearSampling;
				layout_ctx["msImageSmoothingEnabled"] = this.runtime.linearSampling;
				layout_ctx["imageSmoothingEnabled"] = this.runtime.linearSampling;
			}
		}
		
		layout_ctx.globalAlpha = 1;
		layout_ctx.globalCompositeOperation = "source-over";
		
		// Clear canvas with transparent
		if (this.runtime.alphaBackground && !this.hasOpaqueBottomLayer())
			layout_ctx.clearRect(0, 0, this.runtime.draw_width, this.runtime.draw_height);

		// Draw each layer
		var i, len, l;
		for (i = 0, len = this.layers.length; i < len; i++)
		{
			l = this.layers[i];
			
			// Blend mode 11 means effect fallback is 'hide layer'
			// Note: transparent layers with zero instances are skipped
			if (l.visible && l.opacity > 0 && l.blend_mode !== 11 && (l.instances.length || !l.transparent))
				l.draw(layout_ctx);
			else
				l.updateViewport(null);		// even if not drawing, keep viewport up to date
		}
		
		// If rendered to texture, paste to main display now at full size
		if (render_offscreen)
		{
			ctx.drawImage(layout_canvas, 0, 0, this.runtime.width, this.runtime.height);
		}
	};
	
	Layout.prototype.drawGL_earlyZPass = function (glw)
	{
		glw.setEarlyZPass(true);
		
		// render_to_texture is implied true. Ensure the texture to render to is created.
		if (!this.runtime.layout_tex)
		{
			this.runtime.layout_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
		}

		// Window size has changed (browser fullscreen mode)
		if (this.runtime.layout_tex.c2width !== this.runtime.draw_width || this.runtime.layout_tex.c2height !== this.runtime.draw_height)
		{
			glw.deleteTexture(this.runtime.layout_tex);
			this.runtime.layout_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
		}
		
		glw.setRenderingToTexture(this.runtime.layout_tex);
		
		if (!this.runtime.fullscreenScalingQuality)
		{
			glw.setSize(this.runtime.draw_width, this.runtime.draw_height);
		}
		
		// Early-pass layers in front-to-back order
		var i, l;
		for (i = this.layers.length - 1; i >= 0; --i)
		{
			l = this.layers[i];
			
			// Only early-pass render layers which preserve opaqueness
			if (l.visible && l.opacity === 1 && l.shaders_preserve_opaqueness &&
				l.blend_mode === 0 && (l.instances.length || !l.transparent))
			{
				l.drawGL_earlyZPass(glw);
			}
			else
			{
				l.updateViewport(null);		// even if not drawing, keep viewport up to date
			}
		}
		
		glw.setEarlyZPass(false);
	};
	
	Layout.prototype.drawGL = function (glw)
	{
		// Render whole layout to texture if:
		// 1) layout has effects (needs post-process)
		// 2) any background blending effects are in use (need to sample from texture during rendering)
		// 3) "Fullscreen scaling quality" is "Low" (need to render at low-res and scale up after)
		// 4) we're using front-to-back rendering mode, where we must attach the depth buffer while rendering
		//    the display to a texture
		var render_to_texture = (this.active_effect_types.length > 0 ||
								 this.runtime.uses_background_blending ||
								 !this.runtime.fullscreenScalingQuality ||
								 this.runtime.enableFrontToBack);
		
		if (render_to_texture)
		{
			// Need another canvas to render to.  Ensure it is created.
			if (!this.runtime.layout_tex)
			{
				this.runtime.layout_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
			}

			// Window size has changed (browser fullscreen mode)
			if (this.runtime.layout_tex.c2width !== this.runtime.draw_width || this.runtime.layout_tex.c2height !== this.runtime.draw_height)
			{
				glw.deleteTexture(this.runtime.layout_tex);
				this.runtime.layout_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
			}
			
			glw.setRenderingToTexture(this.runtime.layout_tex);
			
			if (!this.runtime.fullscreenScalingQuality)
			{
				glw.setSize(this.runtime.draw_width, this.runtime.draw_height);
			}
		}
		// Not rendering to texture any more. Clean up layout_tex to save memory.
		else
		{
			if (this.runtime.layout_tex)
			{
				glw.setRenderingToTexture(null);
				glw.deleteTexture(this.runtime.layout_tex);
				this.runtime.layout_tex = null;
			}
		}
		
		if (this.runtime.alphaBackground && !this.hasOpaqueBottomLayer())
			glw.clear(0, 0, 0, 0);

		// Draw each layer
		var i, len, l;
		for (i = 0, len = this.layers.length; i < len; i++)
		{
			l = this.layers[i];
			
			if (l.visible && l.opacity > 0 && (l.instances.length || !l.transparent))
				l.drawGL(glw);
			else
				l.updateViewport(null);		// even if not drawing, keep viewport up to date
		}
		
		// If rendered to texture, paste to main display now
		if (render_to_texture)
		{
			// With one effect, it still must be post-drawn in low-res fullscreen mode otherwise
			// it may use the full resolution of the backbuffer
			if (this.active_effect_types.length === 0 ||
				(this.active_effect_types.length === 1 && this.runtime.fullscreenScalingQuality))
			{
				if (this.active_effect_types.length === 1)
				{
					var etindex = this.active_effect_types[0].index;
					
					glw.switchProgram(this.active_effect_types[0].shaderindex);
					glw.setProgramParameters(null,								// backTex
											 1.0 / this.runtime.draw_width,		// pixelWidth
											 1.0 / this.runtime.draw_height,	// pixelHeight
											 0.0, 0.0,							// destStart
											 1.0, 1.0,							// destEnd
											 this.scale,						// layerScale
											 this.angle,						// layerAngle
											 0.0, 0.0,							// viewOrigin
											 this.runtime.draw_width / 2, this.runtime.draw_height / 2,	// scrollPos
											 this.runtime.kahanTime.sum,		// seconds
											 this.effect_params[etindex]);		// fx parameters
											 
					if (glw.programIsAnimated(this.active_effect_types[0].shaderindex))
						this.runtime.redraw = true;
				}
				else
					glw.switchProgram(0);
				
				if (!this.runtime.fullscreenScalingQuality)
				{
					glw.setSize(this.runtime.width, this.runtime.height);
				}
					
				glw.setRenderingToTexture(null);				// to backbuffer
				glw.setDepthTestEnabled(false);					// ignore depth buffer, copy full texture
				glw.setOpacity(1);
				glw.setTexture(this.runtime.layout_tex);
				glw.setAlphaBlend();
				glw.resetModelView();
				glw.updateModelView();
				var halfw = this.runtime.width / 2;
				var halfh = this.runtime.height / 2;
				glw.quad(-halfw, halfh, halfw, halfh, halfw, -halfh, -halfw, -halfh);
				glw.setTexture(null);
				glw.setDepthTestEnabled(true);					// turn depth test back on
			}
			else
			{
				this.renderEffectChain(glw, null, null, null);
			}
		}
	};
	
	Layout.prototype.getRenderTarget = function()
	{
		if (this.active_effect_types.length > 0 ||
				this.runtime.uses_background_blending ||
				!this.runtime.fullscreenScalingQuality ||
				this.runtime.enableFrontToBack)
		{
			return this.runtime.layout_tex;
		}
		else
		{
			return null;
		}
	};
	
	Layout.prototype.getMinLayerScale = function ()
	{
		var m = this.layers[0].getScale();
		var i, len, l;
		
		for (i = 1, len = this.layers.length; i < len; i++)
		{
			l = this.layers[i];
			
			if (l.parallaxX === 0 && l.parallaxY === 0)
				continue;
			
			if (l.getScale() < m)
				m = l.getScale();
		}
		
		return m;
	};

	Layout.prototype.scrollToX = function (x)
	{
		// Apply bounding
		if (!this.unbounded_scrolling)
		{
			var widthBoundary = (this.runtime.draw_width * (1 / this.getMinLayerScale()) / 2);
			
			if (x > this.width - widthBoundary)
				x = this.width - widthBoundary;
				
			// Note window width may be larger than layout width for browser fullscreen mode,
			// so prefer clamping to left
			if (x < widthBoundary)
				x = widthBoundary;
		}

		if (this.scrollX !== x)
		{
			this.scrollX = x;
			this.runtime.redraw = true;
		}
	};

	Layout.prototype.scrollToY = function (y)
	{		
		// Apply bounding
		if (!this.unbounded_scrolling)
		{
			var heightBoundary = (this.runtime.draw_height * (1 / this.getMinLayerScale()) / 2);
			
			if (y > this.height - heightBoundary)
				y = this.height - heightBoundary;
				
			// Note window width may be larger than layout width for browser fullscreen mode,
			// so prefer clamping to top
			if (y < heightBoundary)
				y = heightBoundary;
		}

		if (this.scrollY !== y)
		{
			this.scrollY = y;
			this.runtime.redraw = true;
		}
	};
	
	Layout.prototype.boundScrolling = function ()
	{
		this.scrollToX(this.scrollX);
		this.scrollToY(this.scrollY);
	};
	
	Layout.prototype.renderEffectChain = function (glw, layer, inst, rendertarget)
	{
		var active_effect_types = inst ?
							inst.active_effect_types :
							layer ?
								layer.active_effect_types :
								this.active_effect_types;
		
		var layerScale = 1, layerAngle = 0, viewOriginLeft = 0, viewOriginTop = 0, viewOriginRight = this.runtime.draw_width, viewOriginBottom = this.runtime.draw_height;
		
		if (inst)
		{
			layerScale = inst.layer.getScale();
			layerAngle = inst.layer.getAngle();
			viewOriginLeft = inst.layer.viewLeft;
			viewOriginTop = inst.layer.viewTop;
			viewOriginRight = inst.layer.viewRight;
			viewOriginBottom = inst.layer.viewBottom;
		}
		else if (layer)
		{
			layerScale = layer.getScale();
			layerAngle = layer.getAngle();
			viewOriginLeft = layer.viewLeft;
			viewOriginTop = layer.viewTop;
			viewOriginRight = layer.viewRight;
			viewOriginBottom = layer.viewBottom;
		}
		
		var fx_tex = this.runtime.fx_tex;
		var i, len, last, temp, fx_index = 0, other_fx_index = 1;
		var y, h;
		var windowWidth = this.runtime.draw_width;
		var windowHeight = this.runtime.draw_height;
		var halfw = windowWidth / 2;
		var halfh = windowHeight / 2;
		var rcTex = layer ? layer.rcTex : this.rcTex;
		var rcTex2 = layer ? layer.rcTex2 : this.rcTex2;
		
		var screenleft = 0, clearleft = 0;
		var screentop = 0, cleartop = 0;
		var screenright = windowWidth, clearright = windowWidth;
		var screenbottom = windowHeight, clearbottom = windowHeight;
		
		var boxExtendHorizontal = 0;
		var boxExtendVertical = 0;
		var inst_layer_angle = inst ? inst.layer.getAngle() : 0;
		
		if (inst)
		{
			// Determine total box extension
			for (i = 0, len = active_effect_types.length; i < len; i++)
			{
				boxExtendHorizontal += glw.getProgramBoxExtendHorizontal(active_effect_types[i].shaderindex);
				boxExtendVertical += glw.getProgramBoxExtendVertical(active_effect_types[i].shaderindex);
			}
		
			// Project instance to screen
			var bbox = inst.bbox;
			screenleft = layer.layerToCanvas(bbox.left, bbox.top, true, true);
			screentop = layer.layerToCanvas(bbox.left, bbox.top, false, true);
			screenright = layer.layerToCanvas(bbox.right, bbox.bottom, true, true);
			screenbottom = layer.layerToCanvas(bbox.right, bbox.bottom, false, true);
			
			// Take in to account layer rotation if any
			if (inst_layer_angle !== 0)
			{
				var screentrx = layer.layerToCanvas(bbox.right, bbox.top, true, true);
				var screentry = layer.layerToCanvas(bbox.right, bbox.top, false, true);
				var screenblx = layer.layerToCanvas(bbox.left, bbox.bottom, true, true);
				var screenbly = layer.layerToCanvas(bbox.left, bbox.bottom, false, true);
				temp = Math.min(screenleft, screenright, screentrx, screenblx);
				screenright = Math.max(screenleft, screenright, screentrx, screenblx);
				screenleft = temp;
				temp = Math.min(screentop, screenbottom, screentry, screenbly);
				screenbottom = Math.max(screentop, screenbottom, screentry, screenbly);
				screentop = temp;
			}
			
			screenleft -= boxExtendHorizontal;
			screentop -= boxExtendVertical;
			screenright += boxExtendHorizontal;
			screenbottom += boxExtendVertical;
			
			// Unclamped texture coords
			rcTex2.left = screenleft / windowWidth;
			rcTex2.top = 1 - screentop / windowHeight;
			rcTex2.right = screenright / windowWidth;
			rcTex2.bottom = 1 - screenbottom / windowHeight;
			
			clearleft = screenleft = cr.floor(screenleft);
			cleartop = screentop = cr.floor(screentop);
			clearright = screenright = cr.ceil(screenright);
			clearbottom = screenbottom = cr.ceil(screenbottom);
			
			// Extend clear area by box extension again to prevent sampling nonzero pixels outside the box area
			// (especially for blur).
			clearleft -= boxExtendHorizontal;
			cleartop -= boxExtendVertical;
			clearright += boxExtendHorizontal;
			clearbottom += boxExtendVertical;
			
			if (screenleft < 0)					screenleft = 0;
			if (screentop < 0)					screentop = 0;
			if (screenright > windowWidth)		screenright = windowWidth;
			if (screenbottom > windowHeight)	screenbottom = windowHeight;
			if (clearleft < 0)					clearleft = 0;
			if (cleartop < 0)					cleartop = 0;
			if (clearright > windowWidth)		clearright = windowWidth;
			if (clearbottom > windowHeight)		clearbottom = windowHeight;
			
			// Clamped texture coords
			rcTex.left = screenleft / windowWidth;
			rcTex.top = 1 - screentop / windowHeight;
			rcTex.right = screenright / windowWidth;
			rcTex.bottom = 1 - screenbottom / windowHeight;
		}
		else
		{
			rcTex.left = rcTex2.left = 0;
			rcTex.top = rcTex2.top = 0;
			rcTex.right = rcTex2.right = 1;
			rcTex.bottom = rcTex2.bottom = 1;
		}
		
		// Check if we need to pre-draw the object to the first render surface, with no effect.
		// This is to allow:
		// - rotated or spritesheeted objects using blending to properly blend with the background
		// - bounding boxes to be extended when the effect requires it
		// - instance or layer opacity to be taken in to account if not 100%
		var pre_draw = (inst && (glw.programUsesDest(active_effect_types[0].shaderindex) || boxExtendHorizontal !== 0 || boxExtendVertical !== 0 || inst.opacity !== 1 || inst.type.plugin.must_predraw)) || (layer && !inst && layer.opacity !== 1);
		
		// Save composite mode until last draw
		glw.setAlphaBlend();
		
		if (pre_draw)
		{
			// Not yet created this effect surface
			if (!fx_tex[fx_index])
			{
				fx_tex[fx_index] = glw.createEmptyTexture(windowWidth, windowHeight, this.runtime.linearSampling);
			}

			// Window size has changed (browser fullscreen mode)
			if (fx_tex[fx_index].c2width !== windowWidth || fx_tex[fx_index].c2height !== windowHeight)
			{
				glw.deleteTexture(fx_tex[fx_index]);
				fx_tex[fx_index] = glw.createEmptyTexture(windowWidth, windowHeight, this.runtime.linearSampling);
			}
			
			glw.switchProgram(0);
			glw.setRenderingToTexture(fx_tex[fx_index]);
			
			// Clear target rectangle
			h = clearbottom - cleartop;
			y = (windowHeight - cleartop) - h;
			glw.clearRect(clearleft, y, clearright - clearleft, h);
			
			// Draw the inst or layer
			if (inst)
			{
				inst.drawGL(glw);
			}
			else
			{
				glw.setTexture(this.runtime.layer_tex);
				glw.setOpacity(layer.opacity);
				glw.resetModelView();
				glw.translate(-halfw, -halfh);
				glw.updateModelView();
				glw.quadTex(screenleft, screenbottom, screenright, screenbottom, screenright, screentop, screenleft, screentop, rcTex);
			}
			
			// Set destination range to entire surface
			rcTex2.left = rcTex2.top = 0;
			rcTex2.right = rcTex2.bottom = 1;
			
			if (inst)
			{
				temp = rcTex.top;
				rcTex.top = rcTex.bottom;
				rcTex.bottom = temp;
			}
			
			// Exchange the fx surfaces
			fx_index = 1;
			other_fx_index = 0;
		}
		
		glw.setOpacity(1);
		
		var last = active_effect_types.length - 1;
		
		// If last effect uses cross-sampling or needs pre-drawing it cannot be rendered direct to target -
		// must render one more time to offscreen then copy in afterwards. Additionally, layout effects in
		// low-res fullscreen mode must post draw so they render at the draw size, then stretch up to the
		// backbuffer size afterwards.
		var post_draw = glw.programUsesCrossSampling(active_effect_types[last].shaderindex) ||
						(!layer && !inst && !this.runtime.fullscreenScalingQuality);
		
		var etindex = 0;
		
		// For each effect to render
		for (i = 0, len = active_effect_types.length; i < len; i++)
		{
			// Not yet created this effect surface
			if (!fx_tex[fx_index])
			{
				fx_tex[fx_index] = glw.createEmptyTexture(windowWidth, windowHeight, this.runtime.linearSampling);
			}

			// Window size has changed (browser fullscreen mode)
			if (fx_tex[fx_index].c2width !== windowWidth || fx_tex[fx_index].c2height !== windowHeight)
			{
				glw.deleteTexture(fx_tex[fx_index]);
				fx_tex[fx_index] = glw.createEmptyTexture(windowWidth, windowHeight, this.runtime.linearSampling);
			}
			
			// Set the shader program to use
			glw.switchProgram(active_effect_types[i].shaderindex);
			etindex = active_effect_types[i].index;
			
			if (glw.programIsAnimated(active_effect_types[i].shaderindex))
				this.runtime.redraw = true;
			
			// First effect and not pre-drawn: render instance to first effect surface
			if (i == 0 && !pre_draw)
			{
				glw.setRenderingToTexture(fx_tex[fx_index]);
				
				// Clear target rectangle
				h = clearbottom - cleartop;
				y = (windowHeight - cleartop) - h;
				glw.clearRect(clearleft, y, clearright - clearleft, h);
				
				if (inst)
				{
					glw.setProgramParameters(rendertarget,					// backTex
											 1.0 / inst.width,				// pixelWidth
											 1.0 / inst.height,				// pixelHeight
											 rcTex2.left, rcTex2.top,		// destStart
											 rcTex2.right, rcTex2.bottom,	// destEnd
											 layerScale,
											 layerAngle,
											 viewOriginLeft, viewOriginTop,
											 (viewOriginLeft + viewOriginRight) / 2, (viewOriginTop + viewOriginBottom) / 2,
											 this.runtime.kahanTime.sum,
											 inst.effect_params[etindex]);	// fx params
					
					inst.drawGL(glw);
				}
				else
				{
					glw.setProgramParameters(rendertarget,					// backTex
											 1.0 / windowWidth,				// pixelWidth
											 1.0 / windowHeight,			// pixelHeight
											 0.0, 0.0,						// destStart
											 1.0, 1.0,						// destEnd
											 layerScale,
											 layerAngle,
											 viewOriginLeft, viewOriginTop,
											 (viewOriginLeft + viewOriginRight) / 2, (viewOriginTop + viewOriginBottom) / 2,
											 this.runtime.kahanTime.sum,
											 layer ?						// fx params
												layer.effect_params[etindex] :
												this.effect_params[etindex]);
					
					glw.setTexture(layer ? this.runtime.layer_tex : this.runtime.layout_tex);
					glw.resetModelView();
					glw.translate(-halfw, -halfh);
					glw.updateModelView();
					glw.quadTex(screenleft, screenbottom, screenright, screenbottom, screenright, screentop, screenleft, screentop, rcTex);
				}
				
				// Destination range now takes in to account entire surface
				rcTex2.left = rcTex2.top = 0;
				rcTex2.right = rcTex2.bottom = 1;
				
				if (inst && !post_draw)
				{
					temp = screenbottom;
					screenbottom = screentop;
					screentop = temp;
				}
			}
			// Not first effect
			else
			{
				glw.setProgramParameters(rendertarget,						// backTex
										 1.0 / windowWidth,					// pixelWidth
										 1.0 / windowHeight,				// pixelHeight
										 rcTex2.left, rcTex2.top,			// destStart
										 rcTex2.right, rcTex2.bottom,		// destEnd
										 layerScale,
										 layerAngle,
										 viewOriginLeft, viewOriginTop,
										 (viewOriginLeft + viewOriginRight) / 2, (viewOriginTop + viewOriginBottom) / 2,
										 this.runtime.kahanTime.sum,
										 inst ?								// fx params
											inst.effect_params[etindex] :
											layer ? 
												layer.effect_params[etindex] :
												this.effect_params[etindex]);
				
				// Avoid having the render target and current texture set at same time
				glw.setTexture(null);
										 
				// The last effect renders direct to display.  Otherwise render to the current effect surface
				if (i === last && !post_draw)
				{
					// Use instance or layer blend mode for last step
					if (inst)
						glw.setBlend(inst.srcBlend, inst.destBlend);
					else if (layer)
						glw.setBlend(layer.srcBlend, layer.destBlend);
						
					glw.setRenderingToTexture(rendertarget);
				}
				else
				{
					glw.setRenderingToTexture(fx_tex[fx_index]);
					
					// Clear target rectangle
					h = clearbottom - cleartop;
					y = (windowHeight - cleartop) - h;
					glw.clearRect(clearleft, y, clearright - clearleft, h);
				}
				
				// Render with the shader
				glw.setTexture(fx_tex[other_fx_index]);
				glw.resetModelView();
				glw.translate(-halfw, -halfh);
				glw.updateModelView();
				glw.quadTex(screenleft, screenbottom, screenright, screenbottom, screenright, screentop, screenleft, screentop, rcTex);
				
				if (i === last && !post_draw)
					glw.setTexture(null);
			}
			
			// Alternate fx_index between 0 and 1
			fx_index = (fx_index === 0 ? 1 : 0);
			other_fx_index = (fx_index === 0 ? 1 : 0);		// will be opposite to fx_index since it was just assigned
		}
		
		// If the last effect needs post-drawing, it is still on an effect surface and not yet drawn
		// to display.  Copy it to main display now.
		if (post_draw)
		{
			glw.switchProgram(0);
			
			// Use instance or layer blend mode for last step
			if (inst)
				glw.setBlend(inst.srcBlend, inst.destBlend);
			else if (layer)
				glw.setBlend(layer.srcBlend, layer.destBlend);
			else
			{
				// Post-drawing layout effect to backbuffer: restore full viewport and stretch up last texture
				if (!this.runtime.fullscreenScalingQuality)
				{
					glw.setSize(this.runtime.width, this.runtime.height);
					halfw = this.runtime.width / 2;
					halfh = this.runtime.height / 2;
					screenleft = 0;
					screentop = 0;
					screenright = this.runtime.width;
					screenbottom = this.runtime.height;
				}
			}
			
			glw.setRenderingToTexture(rendertarget);
			glw.setTexture(fx_tex[other_fx_index]);
			glw.resetModelView();
			glw.translate(-halfw, -halfh);
			glw.updateModelView();
			
			if (inst && active_effect_types.length === 1 && !pre_draw)
				glw.quadTex(screenleft, screentop, screenright, screentop, screenright, screenbottom, screenleft, screenbottom, rcTex);
			else
				glw.quadTex(screenleft, screenbottom, screenright, screenbottom, screenright, screentop, screenleft, screentop, rcTex);
			
			glw.setTexture(null);
		}
	};
	
	Layout.prototype.getLayerBySid = function (sid_)
	{
		var i, len;
		for (i = 0, len = this.layers.length; i < len; i++)
		{
			if (this.layers[i].sid === sid_)
				return this.layers[i];
		}
		
		return null;
	};
	
	Layout.prototype.saveToJSON = function ()
	{
		var i, len, layer, et;
		
		var o = {
			"sx": this.scrollX,
			"sy": this.scrollY,
			"s": this.scale,
			"a": this.angle,
			"w": this.width,
			"h": this.height,
			"fv": this.first_visit,			// added r127
			"persist": this.persist_data,
			"fx": [],
			"layers": {}
		};
		
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			et = this.effect_types[i];
			o["fx"].push({"name": et.name, "active": et.active, "params": this.effect_params[et.index] });
		}
		
		for (i = 0, len = this.layers.length; i < len; i++)
		{
			layer = this.layers[i];
			o["layers"][layer.sid.toString()] = layer.saveToJSON();
		}
		
		return o;
	};
	
	Layout.prototype.loadFromJSON = function (o)
	{
		var i, j, len, fx, p, layer;
		
		this.scrollX = o["sx"];
		this.scrollY = o["sy"];
		this.scale = o["s"];
		this.angle = o["a"];
		this.width = o["w"];
		this.height = o["h"];
		this.persist_data = o["persist"];
		
		// first visit added r127, check it exists before loading
		if (typeof o["fv"] !== "undefined")
			this.first_visit = o["fv"];
		
		// Load active effects and effect parameters
		var ofx = o["fx"];
		
		for (i = 0, len = ofx.length; i < len; i++)
		{
			fx = this.getEffectByName(ofx[i]["name"]);
			
			if (!fx)
				continue;		// must've gone missing
				
			fx.active = ofx[i]["active"];
			this.effect_params[fx.index] = ofx[i]["params"];
		}
		
		this.updateActiveEffects();
		
		// Load layers
		var olayers = o["layers"];
		
		for (p in olayers)
		{
			if (olayers.hasOwnProperty(p))
			{
				layer = this.getLayerBySid(parseInt(p, 10));
				
				if (!layer)
					continue;		// must've gone missing
					
				layer.loadFromJSON(olayers[p]);
			}
		}
	};
	
	cr.layout = Layout;

	// Layer class
	function Layer(layout, m)
	{
		// Runtime members
		this.layout = layout;
		this.runtime = layout.runtime;
		this.instances = [];        // running instances
		this.scale = 1.0;
		this.angle = 0;
		this.disableAngle = false;
		
		this.tmprect = new cr.rect(0, 0, 0, 0);
		this.tmpquad = new cr.quad();
		
		this.viewLeft = 0;
		this.viewRight = 0;
		this.viewTop = 0;
		this.viewBottom = 0;
		
		//this.number assigned by layout when created
		
		// Lazy-assigned instance Z indices
		this.zindices_stale = false;
		this.zindices_stale_from = -1;		// first index that has changed, or -1 if no bound
		
		this.clear_earlyz_index = 0;
		
		// Data model values
		this.name = m[0];
		this.index = m[1];
		this.sid = m[2];
		this.visible = m[3];		// initially visible
		this.background_color = m[4];
		this.transparent = m[5];
		this.parallaxX = m[6];
		this.parallaxY = m[7];
		this.opacity = m[8];
		this.forceOwnTexture = m[9];
		this.useRenderCells = m[10];
		this.zoomRate = m[11];
		this.blend_mode = m[12];
		this.effect_fallback = m[13];
		this.compositeOp = "source-over";
		this.srcBlend = 0;
		this.destBlend = 0;
		
		// If using render cells, create a RenderGrid to sort instances in to and a set of instances
		// needing bounding box updates
		this.render_grid = null;
		
		// Last render list in case not changed
		this.last_render_list = alloc_arr();
		this.render_list_stale = true;
		this.last_render_cells = new cr.rect(0, 0, -1, -1);
		this.cur_render_cells = new cr.rect(0, 0, -1, -1);
		
		if (this.useRenderCells)
		{
			this.render_grid = new cr.RenderGrid(this.runtime.original_width, this.runtime.original_height);
		}
		
		this.render_offscreen = false;
		
		// Initialise initial instances
		var im = m[14];
		var i, len;
		this.startup_initial_instances = [];		// for restoring initial_instances after load
		this.initial_instances = [];
		this.created_globals = [];		// global object UIDs already created - for save/load to avoid recreating
		
		for (i = 0, len = im.length; i < len; i++)
		{
			var inst = im[i];
			var type = this.runtime.types_by_index[inst[1]];
			assert2(type, "Could not find object type: " + inst.type_name);
			
			// If type has no default instance properties, make it this one
			if (!type.default_instance)
			{
				type.default_instance = inst;
				type.default_layerindex = this.index;
			}
				
			this.initial_instances.push(inst);
			
			if (this.layout.initial_types.indexOf(type) === -1)
				this.layout.initial_types.push(type);
		}
		
		cr.shallowAssignArray(this.startup_initial_instances, this.initial_instances);
		
		// Assign shaders
		this.effect_types = [];
		this.active_effect_types = [];
		this.shaders_preserve_opaqueness = true;
		this.effect_params = [];
		
		for (i = 0, len = m[15].length; i < len; i++)
		{
			this.effect_types.push({
				id: m[15][i][0],
				name: m[15][i][1],
				shaderindex: -1,
				preservesOpaqueness: false,
				active: true,
				index: i
			});
			
			this.effect_params.push(m[15][i][2].slice(0));
		}
		
		this.updateActiveEffects();
		
		this.rcTex = new cr.rect(0, 0, 1, 1);
		this.rcTex2 = new cr.rect(0, 0, 1, 1);
	};
	
	Layer.prototype.updateActiveEffects = function ()
	{
		cr.clearArray(this.active_effect_types);
		
		this.shaders_preserve_opaqueness = true;
		
		var i, len, et;
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			et = this.effect_types[i];
			
			if (et.active)
			{
				this.active_effect_types.push(et);
				
				if (!et.preservesOpaqueness)
					this.shaders_preserve_opaqueness = false;
			}
		}
	};
	
	Layer.prototype.getEffectByName = function (name_)
	{
		var i, len, et;
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			et = this.effect_types[i];
			
			if (et.name === name_)
				return et;
		}
		
		return null;
	};

	Layer.prototype.createInitialInstances = function ()
	{
		var i, k, len, inst, initial_inst, type, keep, hasPersistBehavior;
		for (i = 0, k = 0, len = this.initial_instances.length; i < len; i++)
		{
			initial_inst = this.initial_instances[i];
			type = this.runtime.types_by_index[initial_inst[1]];
			assert2(type, "Null type in initial instance");
			
			hasPersistBehavior = this.runtime.typeHasPersistBehavior(type);
			keep = true;
			
			// Only create objects with the persist behavior on the first visit
			if (!hasPersistBehavior || this.layout.first_visit)
			{
				inst = this.runtime.createInstanceFromInit(initial_inst, this, true);
				
				if (!inst)
					continue;		// may have skipped creation due to fallback effect "destroy"
				
				created_instances.push(inst);
				
				// Remove global objects from the initial instances list
				if (inst.type.global)
				{
					keep = false;
					this.created_globals.push(inst.uid);
				}
			}
			
			if (keep)
			{
				this.initial_instances[k] = this.initial_instances[i];
				k++;
			}
		}
		
		this.initial_instances.length = k;
		
		this.runtime.ClearDeathRow();		// flushes creation row so IIDs will be correct
		
		// Set the blend mode if fallback requires
		if (!this.runtime.glwrap && this.effect_types.length)	// no WebGL renderer and shaders used
			this.blend_mode = this.effect_fallback;				// use fallback blend mode
		
		// Set the blend mode variables
		this.compositeOp = cr.effectToCompositeOp(this.blend_mode);
		
		if (this.runtime.gl)
			cr.setGLBlend(this, this.blend_mode, this.runtime.gl);
		
		this.render_list_stale = true;
	};
	
	Layer.prototype.recreateInitialObjects = function (only_type, rc)
	{
		var i, len, initial_inst, type, wm, x, y, inst, j, lenj, s;
		var types_by_index = this.runtime.types_by_index;
		var only_type_is_family = only_type.is_family;
		var only_type_members = only_type.members;
		
		for (i = 0, len = this.initial_instances.length; i < len; ++i)
		{
			initial_inst = this.initial_instances[i];
			
			// Check initial_inst origin is within rectangle
			wm = initial_inst[0];
			x = wm[0];
			y = wm[1];
			
			if (!rc.contains_pt(x, y))
				continue;		// not in the given area
			
			type = types_by_index[initial_inst[1]];
			
			if (type !== only_type)
			{
				if (only_type_is_family)
				{
					// 'type' is not in the family 'only_type'
					if (only_type_members.indexOf(type) < 0)
						continue;
				}
				else
					continue;		// only_type is not a family, and the initial inst type does not match
			}
			
			// OK to create it
			inst = this.runtime.createInstanceFromInit(initial_inst, this, false);
			
			// Fire 'On created' for this instance
			this.runtime.isInOnDestroy++;
		
			this.runtime.trigger(Object.getPrototypeOf(type.plugin).cnds.OnCreated, inst);
			
			if (inst.is_contained)
			{
				for (j = 0, lenj = inst.siblings.length; j < lenj; j++)
				{
					s = inst.siblings[i];
					this.runtime.trigger(Object.getPrototypeOf(s.type.plugin).cnds.OnCreated, s);
				}
			}
			
			this.runtime.isInOnDestroy--;
		}
	};
	
	Layer.prototype.removeFromInstanceList = function (inst, remove_from_grid)
	{
		var index = cr.fastIndexOf(this.instances, inst);
		
		if (index < 0)
			return;		// not found
		
		// When using render cells, if remove_from_grid is specified then also remove it from
		// the layer render grid. Skip this if right < left, since that means it's not in the grid.
		if (remove_from_grid && this.useRenderCells && inst.rendercells && inst.rendercells.right >= inst.rendercells.left)
		{
			inst.update_bbox();											// make sure actually in its current rendercells
			this.render_grid.update(inst, inst.rendercells, null);		// no new range provided - remove only
			inst.rendercells.set(0, 0, -1, -1);							// set to invalid state to indicate not inserted
		}
		
		// If instance is at top of list, we can pop it off without making the Z indices stale
		if (index === this.instances.length - 1)
			this.instances.pop();
		else
		{	
			// otherwise have to splice it out
			cr.arrayRemove(this.instances, index);
			this.setZIndicesStaleFrom(index);
		}
		
		this.render_list_stale = true;
	};
	
	Layer.prototype.appendToInstanceList = function (inst, add_to_grid)
	{
		assert2(inst.layer === this, "Adding instance to wrong layer");
		
		// Since we know the instance is going to the top we can assign its Z index
		// without making all Z indices stale
		inst.zindex = this.instances.length;
		this.instances.push(inst);
		
		if (add_to_grid && this.useRenderCells && inst.rendercells)
		{
			inst.set_bbox_changed();		// will cause immediate update and new insertion to grid
		}
		
		this.render_list_stale = true;
	};
	
	Layer.prototype.prependToInstanceList = function (inst, add_to_grid)
	{
		assert2(inst.layer === this, "Adding instance to wrong layer");
		
		this.instances.unshift(inst);
		this.setZIndicesStaleFrom(0);
		
		if (add_to_grid && this.useRenderCells && inst.rendercells)
		{
			inst.set_bbox_changed();		// will cause immediate update and new insertion to grid
		}
	};
	
	Layer.prototype.moveInstanceAdjacent = function (inst, other, isafter)
	{
		assert2(inst.layer === this && other.layer === this, "Can't arrange Z order unless both objects on this layer");
		
		// Now both objects are definitely on the same layer: move in the Z order.
		var myZ = inst.get_zindex();
		var insertZ = other.get_zindex();
		
		cr.arrayRemove(this.instances, myZ);
		
		// if myZ is lower than insertZ, insertZ will have shifted down one index
		if (myZ < insertZ)
			insertZ--;
			
		// if inserting after object, increment the insert index
		if (isafter)
			insertZ++;
			
		// insertZ may now be pointing at the end of the array. If so, push instead of splice
		if (insertZ === this.instances.length)
			this.instances.push(inst);
		else
			this.instances.splice(insertZ, 0, inst);
			
		this.setZIndicesStaleFrom(myZ < insertZ ? myZ : insertZ);
	};
	
	Layer.prototype.setZIndicesStaleFrom = function (index)
	{
		// Keep track of the lowest index zindices are stale from
		if (this.zindices_stale_from === -1)			// not yet set
			this.zindices_stale_from = index;
		else if (index < this.zindices_stale_from)		// determine minimum z index affected
			this.zindices_stale_from = index;
		
		this.zindices_stale = true;
		this.render_list_stale = true;
	};
	
	Layer.prototype.updateZIndices = function ()
	{
		if (!this.zindices_stale)
			return;
		
		if (this.zindices_stale_from === -1)
			this.zindices_stale_from = 0;
		
		var i, len, inst;
		
		// When using render cells, this instance's Z index has changed and therefore is probably
		// no longer in the correct sort order in its render cell. Make sure the render cell
		// knows it needs sorting.
		if (this.useRenderCells)
		{
			for (i = this.zindices_stale_from, len = this.instances.length; i < len; ++i)
			{
				inst = this.instances[i];
				inst.zindex = i;
				this.render_grid.markRangeChanged(inst.rendercells);
			}
		}
		else
		{
			for (i = this.zindices_stale_from, len = this.instances.length; i < len; ++i)
			{
				this.instances[i].zindex = i;
			}
		}
		
		this.zindices_stale = false;
		this.zindices_stale_from = -1;
	};
	
	Layer.prototype.getScale = function (include_aspect)
	{
		return this.getNormalScale() * (this.runtime.fullscreenScalingQuality || include_aspect ? this.runtime.aspect_scale : 1);
	};
	
	Layer.prototype.getNormalScale = function ()
	{
		return ((this.scale * this.layout.scale) - 1) * this.zoomRate + 1;
	};
	
	Layer.prototype.getAngle = function ()
	{
		if (this.disableAngle)
			return 0;
			
		return cr.clamp_angle(this.layout.angle + this.angle);
	};
	
	var arr_cache = [];

	function alloc_arr()
	{
		if (arr_cache.length)
			return arr_cache.pop();
		else
			return [];
	}

	function free_arr(a)
	{
		cr.clearArray(a);
		arr_cache.push(a);
	};
	
	function mergeSortedZArrays(a, b, out)
	{
		var i = 0, j = 0, k = 0, lena = a.length, lenb = b.length, ai, bj;
		out.length = lena + lenb;
		
		for ( ; i < lena && j < lenb; ++k)
		{
			ai = a[i];
			bj = b[j];
			
			if (ai.zindex < bj.zindex)
			{
				out[k] = ai;
				++i;
			}
			else
			{
				out[k] = bj;
				++j;
			}
		}
		
		// Finish last run of either array if not done yet
		for ( ; i < lena; ++i, ++k)
			out[k] = a[i];
		
		for ( ; j < lenb; ++j, ++k)
			out[k] = b[j];
	};
	
	var next_arr = [];
	
	function mergeAllSortedZArrays_pass(arr, first_pass)
	{
		var i, len, arr1, arr2, out;
		
		for (i = 0, len = arr.length; i < len - 1; i += 2)
		{
			arr1 = arr[i];
			arr2 = arr[i+1];
			out = alloc_arr();
			mergeSortedZArrays(arr1, arr2, out);
			
			// On all but the first pass, the arrays in arr are locally allocated
			// and can be recycled.
			if (!first_pass)
			{
				free_arr(arr1);
				free_arr(arr2);
			}
			
			next_arr.push(out);
		}
		
		// if odd number of items then last one wasn't collapsed - append in to result again
		if (len % 2 === 1)
		{
			// The first pass uses direct reference to render cell arrays, so we can't just
			// pass through the odd array - it must be allocated and copied so it's recyclable.
			if (first_pass)
			{
				arr1 = alloc_arr();
				cr.shallowAssignArray(arr1, arr[len - 1]);
				next_arr.push(arr1);
			}
			else
			{
				next_arr.push(arr[len - 1]);
			}
		}
		
		cr.shallowAssignArray(arr, next_arr);
		cr.clearArray(next_arr);
	};

	function mergeAllSortedZArrays(arr)
	{
		var first_pass = true;
		
		while (arr.length > 1)
		{
			mergeAllSortedZArrays_pass(arr, first_pass);
			first_pass = false;
		}
		
		return arr[0];
	};
	
	var render_arr = [];
	
	Layer.prototype.getRenderCellInstancesToDraw = function ()
	{
		assert2(this.useRenderCells, "Cannot call getRenderCellInstancesToDraw when not using render cells");
		
		// Ensure all Z indices up-to-date for sorting.
		this.updateZIndices();
		
		// Now render cells are up to date, collect all the sorted instance lists from the render cells
		// inside the viewport to an array of arrays to merge.
		this.render_grid.queryRange(this.viewLeft, this.viewTop, this.viewRight, this.viewBottom, render_arr);
		
		// If there were no render cells returned at all, return a dummy empty array, otherwise the below
		// sort returns undefined.
		if (!render_arr.length)
			return alloc_arr();
		
		// If there is just one list returned, it will be holding a direct reference to the render cell's contents.
		// The caller will try to free this array. So make sure it gets copied to an allocated array that
		// can be freed.
		if (render_arr.length === 1)
		{
			var a = alloc_arr();
			cr.shallowAssignArray(a, render_arr[0]);
			cr.clearArray(render_arr);
			return a;
		}
		
		// render_arr.length is >= 2. Merge the result in to a single Z-sorted list.
		var draw_list = mergeAllSortedZArrays(render_arr);
		
		// Caller recycles returned draw_list.
		cr.clearArray(render_arr);
		
		return draw_list;
	};

	Layer.prototype.draw = function (ctx)
	{
		// Needs own texture
		this.render_offscreen = (this.forceOwnTexture || this.opacity !== 1.0 || this.blend_mode !== 0);
		var layer_canvas = this.runtime.canvas;
		var layer_ctx = ctx;
		var ctx_changed = false;

		if (this.render_offscreen)
		{
			// Need another canvas to render to.  Ensure it is created.
			if (!this.runtime.layer_canvas)
			{
				this.runtime.layer_canvas = document.createElement("canvas");
				assert2(this.runtime.layer_canvas, "Could not create layer canvas - render-to-texture won't work!");
				layer_canvas = this.runtime.layer_canvas;
				layer_canvas.width = this.runtime.draw_width;
				layer_canvas.height = this.runtime.draw_height;
				this.runtime.layer_ctx = layer_canvas.getContext("2d");
				assert2(this.runtime.layer_ctx, "Could not get layer 2D context - render-to-texture won't work!");
				ctx_changed = true;
			}

			layer_canvas = this.runtime.layer_canvas;
			layer_ctx = this.runtime.layer_ctx;

			// Window size has changed (browser fullscreen mode)
			if (layer_canvas.width !== this.runtime.draw_width)
			{
				layer_canvas.width = this.runtime.draw_width;
				ctx_changed = true;
			}
			if (layer_canvas.height !== this.runtime.draw_height)
			{
				layer_canvas.height = this.runtime.draw_height;
				ctx_changed = true;
			}
			
			if (ctx_changed)
			{
				layer_ctx["webkitImageSmoothingEnabled"] = this.runtime.linearSampling;
				layer_ctx["mozImageSmoothingEnabled"] = this.runtime.linearSampling;
				layer_ctx["msImageSmoothingEnabled"] = this.runtime.linearSampling;
				layer_ctx["imageSmoothingEnabled"] = this.runtime.linearSampling;
			}

			// If transparent, there's no fillRect to clear it - so clear it transparent now
			if (this.transparent)
				layer_ctx.clearRect(0, 0, this.runtime.draw_width, this.runtime.draw_height);
		}
		
		layer_ctx.globalAlpha = 1;
		layer_ctx.globalCompositeOperation = "source-over";
		
		// Not transparent: fill with background
		if (!this.transparent)
		{
			layer_ctx.fillStyle = "rgb(" + this.background_color[0] + "," + this.background_color[1] + "," + this.background_color[2] + ")";
			layer_ctx.fillRect(0, 0, this.runtime.draw_width, this.runtime.draw_height);
		}

		layer_ctx.save();

		// Calculate the top-left point of the currently scrolled and scaled view (but not rotated)
		this.disableAngle = true;
		var px = this.canvasToLayer(0, 0, true, true);
		var py = this.canvasToLayer(0, 0, false, true);
		this.disableAngle = false;
		
		if (this.runtime.pixel_rounding)
		{
			px = Math.round(px);
			py = Math.round(py);
		}
		
		this.rotateViewport(px, py, layer_ctx);
		
		// Scroll the layer to the new top-left point and also scale
		var myscale = this.getScale();
		layer_ctx.scale(myscale, myscale);
		layer_ctx.translate(-px, -py);

		// Get instances to render. In render cells mode, this will be derived from the on-screen cells,
		// otherwise it just returns this.instances. If possible in render cells mode re-use the last
		// display list.
		var instances_to_draw;
		
		if (this.useRenderCells)
		{
			this.cur_render_cells.left = this.render_grid.XToCell(this.viewLeft);
			this.cur_render_cells.top = this.render_grid.YToCell(this.viewTop);
			this.cur_render_cells.right = this.render_grid.XToCell(this.viewRight);
			this.cur_render_cells.bottom = this.render_grid.YToCell(this.viewBottom);
			
			if (this.render_list_stale || !this.cur_render_cells.equals(this.last_render_cells))
			{
				free_arr(this.last_render_list);
				instances_to_draw = this.getRenderCellInstancesToDraw();
				this.render_list_stale = false;
				this.last_render_cells.copy(this.cur_render_cells);
			}
			else
				instances_to_draw = this.last_render_list;
		}
		else
			instances_to_draw = this.instances;
		
		var i, len, inst, last_inst = null;
		
		for (i = 0, len = instances_to_draw.length; i < len; ++i)
		{
			inst = instances_to_draw[i];
			
			// Render cells are allowed to return a sorted list with duplicates. In this case the same instance
			// may appear multiple times consecutively. To avoid multiple draws, skip consecutive entries.
			if (inst === last_inst)
				continue;
			
			this.drawInstance(inst, layer_ctx);
			last_inst = inst;
		}
		
		// If used render cells, instances_to_draw is temporary and should be recycled
		if (this.useRenderCells)
			this.last_render_list = instances_to_draw;

		layer_ctx.restore();

		// If rendered to texture, paste to main display now
		if (this.render_offscreen)
		{
			// Drawing at layer opacity with layer blend mode
			ctx.globalCompositeOperation = this.compositeOp;
			ctx.globalAlpha = this.opacity;

			ctx.drawImage(layer_canvas, 0, 0);
		}
	};
	
	Layer.prototype.drawInstance = function(inst, layer_ctx)
	{
		// Skip if invisible or zero sized
		if (!inst.visible || inst.width === 0 || inst.height === 0)
			return;

		// Skip if not in the viewable area
		inst.update_bbox();
		var bbox = inst.bbox;
		
		if (bbox.right < this.viewLeft || bbox.bottom < this.viewTop || bbox.left > this.viewRight || bbox.top > this.viewBottom)
			return;

		// Draw the instance
		layer_ctx.globalCompositeOperation = inst.compositeOp;
		inst.draw(layer_ctx);
	};
	
	Layer.prototype.updateViewport = function (ctx)
	{
		this.disableAngle = true;
		var px = this.canvasToLayer(0, 0, true, true);
		var py = this.canvasToLayer(0, 0, false, true);
		this.disableAngle = false;
		
		if (this.runtime.pixel_rounding)
		{
			px = Math.round(px);
			py = Math.round(py);
		}
		
		this.rotateViewport(px, py, ctx);
	};
	
	Layer.prototype.rotateViewport = function (px, py, ctx)
	{
		var myscale = this.getScale();
		
		this.viewLeft = px;
		this.viewTop = py;
		this.viewRight = px + (this.runtime.draw_width * (1 / myscale));
		this.viewBottom = py + (this.runtime.draw_height * (1 / myscale));
		
		var myAngle = this.getAngle();
		
		if (myAngle !== 0)
		{
			if (ctx)
			{
				ctx.translate(this.runtime.draw_width / 2, this.runtime.draw_height / 2);
				ctx.rotate(-myAngle);
				ctx.translate(this.runtime.draw_width / -2, this.runtime.draw_height / -2);
			}
			
			// adjust viewport bounds
			this.tmprect.set(this.viewLeft, this.viewTop, this.viewRight, this.viewBottom);
			this.tmprect.offset((this.viewLeft + this.viewRight) / -2, (this.viewTop + this.viewBottom) / -2);
			this.tmpquad.set_from_rotated_rect(this.tmprect, myAngle);
			this.tmpquad.bounding_box(this.tmprect);
			this.tmprect.offset((this.viewLeft + this.viewRight) / 2, (this.viewTop + this.viewBottom) / 2);
			this.viewLeft = this.tmprect.left;
			this.viewTop = this.tmprect.top;
			this.viewRight = this.tmprect.right;
			this.viewBottom = this.tmprect.bottom;
		}
	}
	
	Layer.prototype.drawGL_earlyZPass = function (glw)
	{
		var windowWidth = this.runtime.draw_width;
		var windowHeight = this.runtime.draw_height;
		var shaderindex = 0;
		var etindex = 0;
		
		// In early Z mode, this layer will only need its own texture in force own texture mode.
		// Early Z is skipped if the blend mode or opacity have changed, or if there are any effects.
		this.render_offscreen = this.forceOwnTexture;

		if (this.render_offscreen)
		{
			// Need another canvas to render to.  Ensure it is created.
			if (!this.runtime.layer_tex)
			{
				this.runtime.layer_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
			}

			// Window size has changed (browser fullscreen mode)
			if (this.runtime.layer_tex.c2width !== this.runtime.draw_width || this.runtime.layer_tex.c2height !== this.runtime.draw_height)
			{
				glw.deleteTexture(this.runtime.layer_tex);
				this.runtime.layer_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
			}
			
			glw.setRenderingToTexture(this.runtime.layer_tex);
		}

		// Calculate the top-left point of the currently scrolled and scaled view (but not rotated)
		this.disableAngle = true;
		var px = this.canvasToLayer(0, 0, true, true);
		var py = this.canvasToLayer(0, 0, false, true);
		this.disableAngle = false;
		
		if (this.runtime.pixel_rounding)
		{
			px = Math.round(px);
			py = Math.round(py);
		}
		
		this.rotateViewport(px, py, null);
		
		// Scroll the layer to the new top-left point and also scale
		var myscale = this.getScale();
		glw.resetModelView();
		glw.scale(myscale, myscale);
		glw.rotateZ(-this.getAngle());
		glw.translate((this.viewLeft + this.viewRight) / -2, (this.viewTop + this.viewBottom) / -2);
		glw.updateModelView();

		// Get instances to render. In render cells mode, this will be derived from the on-screen cells,
		// otherwise it just returns this.instances. If possible in render cells mode re-use the last
		// display list.
		var instances_to_draw;
		
		if (this.useRenderCells)
		{
			this.cur_render_cells.left = this.render_grid.XToCell(this.viewLeft);
			this.cur_render_cells.top = this.render_grid.YToCell(this.viewTop);
			this.cur_render_cells.right = this.render_grid.XToCell(this.viewRight);
			this.cur_render_cells.bottom = this.render_grid.YToCell(this.viewBottom);
			
			if (this.render_list_stale || !this.cur_render_cells.equals(this.last_render_cells))
			{
				free_arr(this.last_render_list);
				instances_to_draw = this.getRenderCellInstancesToDraw();
				this.render_list_stale = false;
				this.last_render_cells.copy(this.cur_render_cells);
			}
			else
				instances_to_draw = this.last_render_list;
		}
		else
			instances_to_draw = this.instances;
		
		// Render instances in front-to-back order
		var i, inst, last_inst = null;
		
		for (i = instances_to_draw.length - 1; i >= 0; --i)
		{
			inst = instances_to_draw[i];
			
			// Render cells are allowed to return a sorted list with duplicates. In this case the same instance
			// may appear multiple times consecutively. To avoid multiple draws, skip consecutive entries.
			if (inst === last_inst)
				continue;
			
			this.drawInstanceGL_earlyZPass(instances_to_draw[i], glw);
			last_inst = inst;
		}
		
		// If used render cells, cache the last display list in case it can be re-used again
		if (this.useRenderCells)
			this.last_render_list = instances_to_draw;
		
		// Not transparent: fill with background
		if (!this.transparent)
		{
			this.clear_earlyz_index = this.runtime.earlyz_index++;
			glw.setEarlyZIndex(this.clear_earlyz_index);
			
			// fill color does not matter, simply exists to fill depth buffer
			glw.setColorFillMode(1, 1, 1, 1);
			glw.fullscreenQuad();		// fill remaining space in depth buffer with current Z value
			glw.restoreEarlyZMode();
		}
	};
	
	Layer.prototype.drawGL = function (glw)
	{
		var windowWidth = this.runtime.draw_width;
		var windowHeight = this.runtime.draw_height;
		var shaderindex = 0;
		var etindex = 0;
		
		// Needs own texture
		this.render_offscreen = (this.forceOwnTexture || this.opacity !== 1.0 || this.active_effect_types.length > 0 || this.blend_mode !== 0);

		if (this.render_offscreen)
		{
			// Need another canvas to render to.  Ensure it is created.
			if (!this.runtime.layer_tex)
			{
				this.runtime.layer_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
			}

			// Window size has changed (browser fullscreen mode)
			if (this.runtime.layer_tex.c2width !== this.runtime.draw_width || this.runtime.layer_tex.c2height !== this.runtime.draw_height)
			{
				glw.deleteTexture(this.runtime.layer_tex);
				this.runtime.layer_tex = glw.createEmptyTexture(this.runtime.draw_width, this.runtime.draw_height, this.runtime.linearSampling);
			}
			
			glw.setRenderingToTexture(this.runtime.layer_tex);

			// If transparent, there's no fillRect to clear it - so clear it transparent now
			if (this.transparent)
				glw.clear(0, 0, 0, 0);
		}
		
		// Not transparent: fill with background
		if (!this.transparent)
		{
			if (this.runtime.enableFrontToBack)
			{
				// front-to-back rendering: use fullscreen quad to take advantage of depth buffer
				glw.setEarlyZIndex(this.clear_earlyz_index);
			
				glw.setColorFillMode(this.background_color[0] / 255, this.background_color[1] / 255, this.background_color[2] / 255, 1);
				glw.fullscreenQuad();
				glw.setTextureFillMode();
			}
			else
			{
				// back-to-front rendering: normal clear
				glw.clear(this.background_color[0] / 255, this.background_color[1] / 255, this.background_color[2] / 255, 1);
			}
		}

		// Calculate the top-left point of the currently scrolled and scaled view (but not rotated)
		this.disableAngle = true;
		var px = this.canvasToLayer(0, 0, true, true);
		var py = this.canvasToLayer(0, 0, false, true);
		this.disableAngle = false;
		
		if (this.runtime.pixel_rounding)
		{
			px = Math.round(px);
			py = Math.round(py);
		}
		
		this.rotateViewport(px, py, null);
		
		// Scroll the layer to the new top-left point and also scale
		var myscale = this.getScale();
		glw.resetModelView();
		glw.scale(myscale, myscale);
		glw.rotateZ(-this.getAngle());
		glw.translate((this.viewLeft + this.viewRight) / -2, (this.viewTop + this.viewBottom) / -2);
		glw.updateModelView();

		// Get instances to render. In render cells mode, this will be derived from the on-screen cells,
		// otherwise it just returns this.instances. If possible in render cells mode re-use the last
		// display list.
		var instances_to_draw;
		
		if (this.useRenderCells)
		{
			this.cur_render_cells.left = this.render_grid.XToCell(this.viewLeft);
			this.cur_render_cells.top = this.render_grid.YToCell(this.viewTop);
			this.cur_render_cells.right = this.render_grid.XToCell(this.viewRight);
			this.cur_render_cells.bottom = this.render_grid.YToCell(this.viewBottom);
			
			if (this.render_list_stale || !this.cur_render_cells.equals(this.last_render_cells))
			{
				free_arr(this.last_render_list);
				instances_to_draw = this.getRenderCellInstancesToDraw();
				this.render_list_stale = false;
				this.last_render_cells.copy(this.cur_render_cells);
			}
			else
				instances_to_draw = this.last_render_list;
		}
		else
			instances_to_draw = this.instances;
		
		var i, len, inst, last_inst = null;
		
		for (i = 0, len = instances_to_draw.length; i < len; ++i)
		{
			inst = instances_to_draw[i];
			
			// Render cells are allowed to return a sorted list with duplicates. In this case the same instance
			// may appear multiple times consecutively. To avoid multiple draws, skip consecutive entries.
			if (inst === last_inst)
				continue;
			
			this.drawInstanceGL(instances_to_draw[i], glw);
			last_inst = inst;
		}
		
		// If used render cells, cache the last display list in case it can be re-used again
		if (this.useRenderCells)
			this.last_render_list = instances_to_draw;

		// If rendered to texture, paste to main display now
		if (this.render_offscreen)
		{
			// Note some of the single-shader rendering limitations also apply to layers
			//if (inst.type.effect_types.length === 1 && !glw.programUsesCrossSampling(shaderindex) &&
			//		!glw.programExtendsBox(shaderindex) && (!inst.angle || !glw.programUsesDest(shaderindex)) &&
			//		inst.opacity === 1)
			shaderindex = this.active_effect_types.length ? this.active_effect_types[0].shaderindex : 0;
			etindex = this.active_effect_types.length ? this.active_effect_types[0].index : 0;
			
			if (this.active_effect_types.length === 0 || (this.active_effect_types.length === 1 &&
				!glw.programUsesCrossSampling(shaderindex) && this.opacity === 1))
			{				
				if (this.active_effect_types.length === 1)
				{
					glw.switchProgram(shaderindex);
					glw.setProgramParameters(this.layout.getRenderTarget(),		// backTex
											 1.0 / this.runtime.draw_width,		// pixelWidth
											 1.0 / this.runtime.draw_height,	// pixelHeight
											 0.0, 0.0,							// destStart
											 1.0, 1.0,							// destEnd
											 myscale,							// layerScale
											 this.getAngle(),
											 this.viewLeft, this.viewTop,
											 (this.viewLeft + this.viewRight) / 2, (this.viewTop + this.viewBottom) / 2,
											 this.runtime.kahanTime.sum,
											 this.effect_params[etindex]);		// fx parameters
											 
					if (glw.programIsAnimated(shaderindex))
						this.runtime.redraw = true;
				}
				else
					glw.switchProgram(0);
					
				glw.setRenderingToTexture(this.layout.getRenderTarget());
				glw.setOpacity(this.opacity);
				glw.setTexture(this.runtime.layer_tex);
				glw.setBlend(this.srcBlend, this.destBlend);
				glw.resetModelView();
				glw.updateModelView();
				var halfw = this.runtime.draw_width / 2;
				var halfh = this.runtime.draw_height / 2;
				glw.quad(-halfw, halfh, halfw, halfh, halfw, -halfh, -halfw, -halfh);
				glw.setTexture(null);
			}
			else
			{
				this.layout.renderEffectChain(glw, this, null, this.layout.getRenderTarget());
			}
		}
	};
	
	Layer.prototype.drawInstanceGL = function (inst, glw)
	{
		assert2(inst.layer === this, "Drawing instance on wrong layer");
		
		// Skip if invisible or zero sized
		if (!inst.visible || inst.width === 0 || inst.height === 0)
			return;

		// Skip if not in the viewable area
		inst.update_bbox();
		var bbox = inst.bbox;
		
		if (bbox.right < this.viewLeft || bbox.bottom < this.viewTop || bbox.left > this.viewRight || bbox.top > this.viewBottom)
			return;

		glw.setEarlyZIndex(inst.earlyz_index);
		
		// Draw using shaders
		if (inst.uses_shaders)
		{
			this.drawInstanceWithShadersGL(inst, glw);
		}
		// Draw normally without any special shaders
		else
		{
			glw.switchProgram(0);		// un-set any previously set shader
			glw.setBlend(inst.srcBlend, inst.destBlend);
			inst.drawGL(glw);
		}
	};
	
	Layer.prototype.drawInstanceGL_earlyZPass = function (inst, glw)
	{
		assert2(inst.layer === this, "Drawing instance on wrong layer");
		
		// As per normal rendering, skip if invisible or zero sized
		if (!inst.visible || inst.width === 0 || inst.height === 0)
			return;

		// As per normal rendering, skip if not in the viewable area
		inst.update_bbox();
		var bbox = inst.bbox;
		
		if (bbox.right < this.viewLeft || bbox.bottom < this.viewTop || bbox.left > this.viewRight || bbox.top > this.viewBottom)
			return;
		
		// Write the distance-increasing early Z index to the instance to reuse later.
		// Note this is done after the same checks as normal rendering, so we only Z index the objects that are
		// actually going to have draw calls made. Later when the real draw call is made, its Z position is based
		// off this value.
		inst.earlyz_index = this.runtime.earlyz_index++;
		
		// Don't actually make an early Z pass if the object does not preserve opaqueness, or if
		// it doesn't support the drawGL_earlyZPass method.
		if (inst.blend_mode !== 0 || inst.opacity !== 1 || !inst.shaders_preserve_opaqueness || !inst.drawGL_earlyZPass)
			return;
		
		glw.setEarlyZIndex(inst.earlyz_index);
		inst.drawGL_earlyZPass(glw);
	};
	
	Layer.prototype.drawInstanceWithShadersGL = function (inst, glw)
	{
		// Where possible, draw an instance using a single shader direct to display for
		// maximum efficiency.  This can only be done if:
		// 1) The shader does not use cross-sampling.  If it does it has to render to an intermediate
		//    texture to prevent glitching, which is done via renderEffectChain.
		// 2) The shader does not use background blending, or the object is not rotated (at 0 degrees).
		//    Since the background is sampled linearly as a bounding box, it only works when the object
		//    is not rotated, otherwise the background gets rotated as well.  To fix this rotated objects
		//	  are pre-drawn to an offscreen surface in renderEffectChain.
		// 3) The shader does not extend the bounding box.  In this case as per 2) it also needs
		//    pre-drawing to an offscreen surface for the bounds to be enlarged.
		// 4) The object has 100% opacity.  If it has a different opacity, the opacity must be processed
		//    by pre-drawing.
		// Consider a screen blend for an unrotated object at 100% opacity on a mobile device.  While the
		// restrictions are fairly complicated, this allows the device to simply switch program, set
		// parameters and render without having to do any of the GPU-intensive swapping done in renderEffectChain.
		var shaderindex = inst.active_effect_types[0].shaderindex;
		var etindex = inst.active_effect_types[0].index;
		var myscale = this.getScale();
		
		if (inst.active_effect_types.length === 1 && !glw.programUsesCrossSampling(shaderindex) &&
			!glw.programExtendsBox(shaderindex) && ((!inst.angle && !inst.layer.getAngle()) || !glw.programUsesDest(shaderindex)) &&
			inst.opacity === 1 && !inst.type.plugin.must_predraw)
		{
			// Set the shader program to use
			glw.switchProgram(shaderindex);
			glw.setBlend(inst.srcBlend, inst.destBlend);
			
			if (glw.programIsAnimated(shaderindex))
				this.runtime.redraw = true;
			
			var destStartX = 0, destStartY = 0, destEndX = 0, destEndY = 0;
			
			// Skip screen co-ord calculations if shader doesn't use them
			if (glw.programUsesDest(shaderindex))
			{
				// Set the shader parameters
				var bbox = inst.bbox;
				var screenleft = this.layerToCanvas(bbox.left, bbox.top, true, true);
				var screentop = this.layerToCanvas(bbox.left, bbox.top, false, true);
				var screenright = this.layerToCanvas(bbox.right, bbox.bottom, true, true);
				var screenbottom = this.layerToCanvas(bbox.right, bbox.bottom, false, true);
				
				destStartX = screenleft / windowWidth;
				destStartY = 1 - screentop / windowHeight;
				destEndX = screenright / windowWidth;
				destEndY = 1 - screenbottom / windowHeight;
			}
	
			glw.setProgramParameters(this.render_offscreen ? this.runtime.layer_tex : this.layout.getRenderTarget(), // backTex
									 1.0 / inst.width,			// pixelWidth
									 1.0 / inst.height,			// pixelHeight
									 destStartX, destStartY,
									 destEndX, destEndY,
									 myscale,
									 this.getAngle(),
									 this.viewLeft, this.viewTop,
									 (this.viewLeft + this.viewRight) / 2, (this.viewTop + this.viewBottom) / 2,
									 this.runtime.kahanTime.sum,
									 inst.effect_params[etindex]);
			
			// Draw instance
			inst.drawGL(glw);
		}
		// Draw using offscreen surfaces
		else
		{
			this.layout.renderEffectChain(glw, this, inst, this.render_offscreen ? this.runtime.layer_tex : this.layout.getRenderTarget());
			
			// Reset model view
			glw.resetModelView();
			glw.scale(myscale, myscale);
			glw.rotateZ(-this.getAngle());
			glw.translate((this.viewLeft + this.viewRight) / -2, (this.viewTop + this.viewBottom) / -2);
			glw.updateModelView();
		}
	};
	
	// Translate point in canvas coords to layer coords
	Layer.prototype.canvasToLayer = function (ptx, pty, getx, using_draw_area)
	{
		// Take in to account retina displays which map css to canvas pixels differently
		var multiplier = this.runtime.devicePixelRatio;
		
		if (this.runtime.isRetina)
		{
			ptx *= multiplier;
			pty *= multiplier;
		}
		
		// Apply parallax
		var ox = this.runtime.parallax_x_origin;
		var oy = this.runtime.parallax_y_origin;
		var par_x = ((this.layout.scrollX - ox) * this.parallaxX) + ox;
		var par_y = ((this.layout.scrollY - oy) * this.parallaxY) + oy;
		var x = par_x;
		var y = par_y;
		
		// Move to top-left of visible area
		var invScale = 1 / this.getScale(!using_draw_area);
		
		if (using_draw_area)
		{
			x -= (this.runtime.draw_width * invScale) / 2;
			y -= (this.runtime.draw_height * invScale) / 2;
		}
		else
		{
			x -= (this.runtime.width * invScale) / 2;
			y -= (this.runtime.height * invScale) / 2;
		}
		
		x += ptx * invScale;
		y += pty * invScale;
		
		// Rotate about scroll center
		var a = this.getAngle();
		if (a !== 0)
		{
			x -= par_x;
			y -= par_y;
			var cosa = Math.cos(a);
			var sina = Math.sin(a);
			var x_temp = (x * cosa) - (y * sina);
			y = (y * cosa) + (x * sina);
			x = x_temp;
			x += par_x;
			y += par_y;
		}
		
		// Return point in layer coords
		return getx ? x : y;
	};
	
	// If ignore_aspect is passed, converts layer to draw area instead
	Layer.prototype.layerToCanvas = function (ptx, pty, getx, using_draw_area)
	{
		var ox = this.runtime.parallax_x_origin;
		var oy = this.runtime.parallax_y_origin;
		var par_x = ((this.layout.scrollX - ox) * this.parallaxX) + ox;
		var par_y = ((this.layout.scrollY - oy) * this.parallaxY) + oy;
		var x = par_x;
		var y = par_y;
		
		// Rotate about canvas center
		var a = this.getAngle();
		
		if (a !== 0)
		{
			ptx -= par_x;
			pty -= par_y;
			var cosa = Math.cos(-a);
			var sina = Math.sin(-a);
			var x_temp = (ptx * cosa) - (pty * sina);
			pty = (pty * cosa) + (ptx * sina);
			ptx = x_temp;
			ptx += par_x;
			pty += par_y;
		}
		
		var invScale = 1 / this.getScale(!using_draw_area);
		
		if (using_draw_area)
		{
			x -= (this.runtime.draw_width * invScale) / 2;
			y -= (this.runtime.draw_height * invScale) / 2;
		}
		else
		{
			x -= (this.runtime.width * invScale) / 2;
			y -= (this.runtime.height * invScale) / 2;
		}
		
		x = (ptx - x) / invScale;
		y = (pty - y) / invScale;
	
		// Take in to account retina displays which map css to canvas pixels differently
		var multiplier = this.runtime.devicePixelRatio;
		
		if (this.runtime.isRetina && !using_draw_area)
		{
			x /= multiplier;
			y /= multiplier;
		}
		
		return getx ? x : y;
	};
	
	Layer.prototype.rotatePt = function (x_, y_, getx)
	{
		if (this.getAngle() === 0)
			return getx ? x_ : y_;
		
		var nx = this.layerToCanvas(x_, y_, true);
		var ny = this.layerToCanvas(x_, y_, false);
		
		this.disableAngle = true;
		var px = this.canvasToLayer(nx, ny, true);
		var py = this.canvasToLayer(nx, ny, true);
		this.disableAngle = false;
		
		return getx ? px : py;
	};
	
	Layer.prototype.saveToJSON = function ()
	{
		var i, len, et;
		
		var o = {
			"s": this.scale,
			"a": this.angle,
			"vl": this.viewLeft,
			"vt": this.viewTop,
			"vr": this.viewRight,
			"vb": this.viewBottom,
			"v": this.visible,
			"bc": this.background_color,
			"t": this.transparent,
			"px": this.parallaxX,
			"py": this.parallaxY,
			"o": this.opacity,
			"zr": this.zoomRate,
			"fx": [],
			"cg": this.created_globals,		// added r197; list of global UIDs already created
			"instances": []
		};
		
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			et = this.effect_types[i];
			o["fx"].push({"name": et.name, "active": et.active, "params": this.effect_params[et.index] });
		}
		
		return o;
	};
	
	Layer.prototype.loadFromJSON = function (o)
	{
		var i, j, len, p, inst, fx;
		
		this.scale = o["s"];
		this.angle = o["a"];
		this.viewLeft = o["vl"];
		this.viewTop = o["vt"];
		this.viewRight = o["vr"];
		this.viewBottom = o["vb"];
		this.visible = o["v"];
		this.background_color = o["bc"];
		this.transparent = o["t"];
		this.parallaxX = o["px"];
		this.parallaxY = o["py"];
		this.opacity = o["o"];
		this.zoomRate = o["zr"];
		this.created_globals = o["cg"] || [];		// added r197
		
		// If we are loading a state that has already created global objects, they need to be removed
		// from initial_instances again. Restore all the original initial instances (startup_initial_instances) 
		// then run through the initial_instances list and remove any instances that have a UID in the created_globals list.
		cr.shallowAssignArray(this.initial_instances, this.startup_initial_instances);
		
		var temp_set = new cr.ObjectSet();
		for (i = 0, len = this.created_globals.length; i < len; ++i)
			temp_set.add(this.created_globals[i]);
		
		for (i = 0, j = 0, len = this.initial_instances.length; i < len; ++i)
		{
			if (!temp_set.contains(this.initial_instances[i][2]))		// UID in element 2
			{
				this.initial_instances[j] = this.initial_instances[i];
				++j;
			}
		}
		
		cr.truncateArray(this.initial_instances, j);
		
		// Load active effects and effect parameters
		var ofx = o["fx"];
		
		for (i = 0, len = ofx.length; i < len; i++)
		{
			fx = this.getEffectByName(ofx[i]["name"]);
			
			if (!fx)
				continue;		// must've gone missing
				
			fx.active = ofx[i]["active"];
			this.effect_params[fx.index] = ofx[i]["params"];
		}
		
		this.updateActiveEffects();
		
		// Load instances.
		// Before this step, all instances were created on the correct layers. So we have the right
		// instances on this layer, but they need to be updated so their Z order is correct given their
		// zindex properties that were loaded. So sort the instances list now.
		this.instances.sort(sort_by_zindex);
		
		// There could be duplicate or missing Z indices, so re-index all the Z indices again anyway.
		this.zindices_stale = true;
	};
	
	cr.layer = Layer;
}());
