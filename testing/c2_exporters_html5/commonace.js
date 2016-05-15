// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");

(function () {

	// Common ACE definitions
	cr.add_common_aces = function (m, pluginProto)
	{
		var singleglobal_ = m[1];
		//var is_world = m[2];
		var position_aces = m[3];
		var size_aces = m[4];
		var angle_aces = m[5];
		var appearance_aces = m[6];
		var zorder_aces = m[7];
		var effects_aces = m[8];
				
		if (!pluginProto.cnds)
			pluginProto.cnds = {};
		if (!pluginProto.acts)
			pluginProto.acts = {};
		if (!pluginProto.exps)
			pluginProto.exps = {};

		var cnds = pluginProto.cnds;
		var acts = pluginProto.acts;
		var exps = pluginProto.exps;

		if (position_aces)
		{
			cnds.CompareX = function (cmp, x)
			{
				return cr.do_cmp(this.x, cmp, x);
			};

			cnds.CompareY = function (cmp, y)
			{
				return cr.do_cmp(this.y, cmp, y);
			};

			cnds.IsOnScreen = function ()
			{
				var layer = this.layer;				
				this.update_bbox();
				var bbox = this.bbox;

				return !(bbox.right < layer.viewLeft || bbox.bottom < layer.viewTop || bbox.left > layer.viewRight || bbox.top > layer.viewBottom);
			};

			cnds.IsOutsideLayout = function ()
			{
				this.update_bbox();
				var bbox = this.bbox;
				var layout = this.runtime.running_layout;

				return (bbox.right < 0 || bbox.bottom < 0 || bbox.left > layout.width || bbox.top > layout.height);
			};
			
			// static condition
			cnds.PickDistance = function (which, x, y)
			{
				var sol = this.getCurrentSol();
				var instances = sol.getObjects();
				
				if (!instances.length)
					return false;
					
				var inst = instances[0];
				var pickme = inst;
				var dist = cr.distanceTo(inst.x, inst.y, x, y);
				
				var i, len, d;
				for (i = 1, len = instances.length; i < len; i++)
				{
					inst = instances[i];
					d = cr.distanceTo(inst.x, inst.y, x, y);
					
					if ((which === 0 && d < dist) || (which === 1 && d > dist))
					{
						dist = d;
						pickme = inst;
					}
				}
				
				// select the resulting instance
				sol.pick_one(pickme);
				return true;
			};

			acts.SetX = function (x)
			{
				if (this.x !== x)
				{
					this.x = x;
					this.set_bbox_changed();
				}
			};

			acts.SetY = function (y)
			{
				if (this.y !== y)
				{
					this.y = y;
					this.set_bbox_changed();
				}
			};

			acts.SetPos = function (x, y)
			{
				if (this.x !== x || this.y !== y)
				{
					this.x = x;
					this.y = y;
					this.set_bbox_changed();
				}
			};

			acts.SetPosToObject = function (obj, imgpt)
			{
				var inst = obj.getPairedInstance(this);

				if (!inst)
					return;
					
				var newx, newy;
					
				if (inst.getImagePoint)
				{
					newx = inst.getImagePoint(imgpt, true);
					newy = inst.getImagePoint(imgpt, false);
				}
				else
				{
					newx = inst.x;
					newy = inst.y;
				}
					
				if (this.x !== newx || this.y !== newy)
				{
					this.x = newx;
					this.y = newy;
					this.set_bbox_changed();
				}
			};

			acts.MoveForward = function (dist)
			{
				if (dist !== 0)
				{
					this.x += Math.cos(this.angle) * dist;
					this.y += Math.sin(this.angle) * dist;
					this.set_bbox_changed();
				}
			};

			acts.MoveAtAngle = function (a, dist)
			{
				if (dist !== 0)
				{
					this.x += Math.cos(cr.to_radians(a)) * dist;
					this.y += Math.sin(cr.to_radians(a)) * dist;
					this.set_bbox_changed();
				}
			};

			exps.X = function (ret)
			{
				ret.set_float(this.x);
			};

			exps.Y = function (ret)
			{
				ret.set_float(this.y);
			};

			// dt thrown in with position aces...
			exps.dt = function (ret)
			{
				ret.set_float(this.runtime.getDt(this));
			};
		}

		if (size_aces)
		{
			cnds.CompareWidth = function (cmp, w)
			{
				return cr.do_cmp(this.width, cmp, w);
			};

			cnds.CompareHeight = function (cmp, h)
			{
				return cr.do_cmp(this.height, cmp, h);
			};

			acts.SetWidth = function (w)
			{
				if (this.width !== w)
				{
					this.width = w;
					this.set_bbox_changed();
				}
			};

			acts.SetHeight = function (h)
			{
				if (this.height !== h)
				{
					this.height = h;
					this.set_bbox_changed();
				}
			};

			acts.SetSize = function (w, h)
			{
				if (this.width !== w || this.height !== h)
				{
					this.width = w;
					this.height = h;
					this.set_bbox_changed();
				}
			};

			exps.Width = function (ret)
			{
				ret.set_float(this.width);
			};

			exps.Height = function (ret)
			{
				ret.set_float(this.height);
			};
			
			exps.BBoxLeft = function (ret)
			{
				this.update_bbox();
				ret.set_float(this.bbox.left);
			};
			
			exps.BBoxTop = function (ret)
			{
				this.update_bbox();
				ret.set_float(this.bbox.top);
			};
			
			exps.BBoxRight = function (ret)
			{
				this.update_bbox();
				ret.set_float(this.bbox.right);
			};
			
			exps.BBoxBottom = function (ret)
			{
				this.update_bbox();
				ret.set_float(this.bbox.bottom);
			};
		}

		if (angle_aces)
		{
			cnds.AngleWithin = function (within, a)
			{
				return cr.angleDiff(this.angle, cr.to_radians(a)) <= cr.to_radians(within);
			};

			cnds.IsClockwiseFrom = function (a)
			{
				return cr.angleClockwise(this.angle, cr.to_radians(a));
			};
			
			cnds.IsBetweenAngles = function (a, b)
			{
				var lower = cr.to_clamped_radians(a);
				var upper = cr.to_clamped_radians(b);
				var angle = cr.clamp_angle(this.angle);
				var obtuse = (!cr.angleClockwise(upper, lower));
				
				// Handle differently when angle range is over 180 degrees, since angleClockwise only tests if within
				// 180 degrees clockwise of the angle
				if (obtuse)
					return !(!cr.angleClockwise(angle, lower) && cr.angleClockwise(angle, upper));
				else
					return cr.angleClockwise(angle, lower) && !cr.angleClockwise(angle, upper);
			};

			acts.SetAngle = function (a)
			{
				var newangle = cr.to_radians(cr.clamp_angle_degrees(a));

				if (isNaN(newangle))
					return;

				if (this.angle !== newangle)
				{
					this.angle = newangle;
					this.set_bbox_changed();
				}
			};

			acts.RotateClockwise = function (a)
			{
				if (a !== 0 && !isNaN(a))
				{
					this.angle += cr.to_radians(a);
					this.angle = cr.clamp_angle(this.angle);
					this.set_bbox_changed();
				}
			};

			acts.RotateCounterclockwise = function (a)
			{
				if (a !== 0 && !isNaN(a))
				{
					this.angle -= cr.to_radians(a);
					this.angle = cr.clamp_angle(this.angle);
					this.set_bbox_changed();
				}
			};

			acts.RotateTowardAngle = function (amt, target)
			{
				var newangle = cr.angleRotate(this.angle, cr.to_radians(target), cr.to_radians(amt));

				if (isNaN(newangle))
					return;

				if (this.angle !== newangle)
				{
					this.angle = newangle;
					this.set_bbox_changed();
				}
			};

			acts.RotateTowardPosition = function (amt, x, y)
			{
				var dx = x - this.x;
				var dy = y - this.y;
				var target = Math.atan2(dy, dx);
				var newangle = cr.angleRotate(this.angle, target, cr.to_radians(amt));

				if (isNaN(newangle))
					return;

				if (this.angle !== newangle)
				{
					this.angle = newangle;
					this.set_bbox_changed();
				}
			};

			acts.SetTowardPosition = function (x, y)
			{
				// Calculate angle towards position
				var dx = x - this.x;
				var dy = y - this.y;
				var newangle = Math.atan2(dy, dx);

				if (isNaN(newangle))
					return;

				if (this.angle !== newangle)
				{
					this.angle = newangle;
					this.set_bbox_changed();
				}
			};

			exps.Angle = function (ret)
			{
				ret.set_float(cr.to_clamped_degrees(this.angle));
			};
		}

		if (!singleglobal_)
		{
			cnds.CompareInstanceVar = function (iv, cmp, val)
			{
				return cr.do_cmp(this.instance_vars[iv], cmp, val);
			};

			cnds.IsBoolInstanceVarSet = function (iv)
			{
				return this.instance_vars[iv];
			};
			
			// static condition
			cnds.PickInstVarHiLow = function (which, iv)
			{
				var sol = this.getCurrentSol();
				var instances = sol.getObjects();
				
				if (!instances.length)
					return false;
					
				var inst = instances[0];
				var pickme = inst;
				var val = inst.instance_vars[iv];
				
				var i, len, v;
				for (i = 1, len = instances.length; i < len; i++)
				{
					inst = instances[i];
					v = inst.instance_vars[iv];
					
					if ((which === 0 && v < val) || (which === 1 && v > val))
					{
						val = v;
						pickme = inst;
					}
				}
				
				// select the resulting instance
				sol.pick_one(pickme);
				return true;
			};
			
			// static condition
			cnds.PickByUID = function (u)
			{
				var i, len, j, inst, families, instances, sol;
				var cnd = this.runtime.getCurrentCondition();
				
				// If inverted, reduce SOL to those instances not matching the UID
				if (cnd.inverted)
				{
					sol = this.getCurrentSol();
					
					if (sol.select_all)
					{
						sol.select_all = false;
						cr.clearArray(sol.instances);
						cr.clearArray(sol.else_instances);
						
						instances = this.instances;
						for (i = 0, len = instances.length; i < len; i++)
						{
							inst = instances[i];
							
							if (inst.uid === u)
								sol.else_instances.push(inst);
							else
								sol.instances.push(inst);
						}
						
						this.applySolToContainer();
						return !!sol.instances.length;
					}
					else
					{
						for (i = 0, j = 0, len = sol.instances.length; i < len; i++)
						{
							inst = sol.instances[i];
							sol.instances[j] = inst;
							
							if (inst.uid === u)
							{
								sol.else_instances.push(inst);
							}
							else
								j++;
						}
						
						cr.truncateArray(sol.instances, j);
						
						this.applySolToContainer();
						return !!sol.instances.length;
					}
				}
				else
				{
					// Not inverted (ordinary pick of single instance with matching UID)
					// Use the runtime's getObjectByUID() function to look up
					// efficiently, and also support pending creation objects.
					inst = this.runtime.getObjectByUID(u);
					
					if (!inst)
						return false;
						
					// Verify this instance is already picked. We should not be able to
					// pick instances already filtered out by prior conditions.
					sol = this.getCurrentSol();
					
					if (!sol.select_all && sol.instances.indexOf(inst) === -1)
						return false;		// not picked
					
					// If this type is a family, verify the inst belongs to this family.
					// Otherwise verify the inst is of the same type as this.
					if (this.is_family)
					{
						families = inst.type.families;
						
						for (i = 0, len = families.length; i < len; i++)
						{
							if (families[i] === this)
							{
								sol.pick_one(inst);
								this.applySolToContainer();
								return true;
							}
						}
					}
					else if (inst.type === this)
					{
						sol.pick_one(inst);
						this.applySolToContainer();
						return true;
					}
					
					// Instance is from wrong family or type
					return false;
				}
			};
			
			cnds.OnCreated = function ()
			{
				return true;
			};
			
			cnds.OnDestroyed = function ()
			{
				return true;
			};

			acts.SetInstanceVar = function (iv, val)
			{
				var myinstvars = this.instance_vars;
				
				// Keep the type of the instance var
				if (cr.is_number(myinstvars[iv]))
				{
					if (cr.is_number(val))
						myinstvars[iv] = val;
					else
						myinstvars[iv] = parseFloat(val);
				}
				else if (cr.is_string(myinstvars[iv]))
				{
					if (cr.is_string(val))
						myinstvars[iv] = val;
					else
						myinstvars[iv] = val.toString();
				}
				else
					assert2(false, "Unknown instance variable type");
			};

			acts.AddInstanceVar = function (iv, val)
			{
				var myinstvars = this.instance_vars;
				
				// Keep the type of the instance var
				if (cr.is_number(myinstvars[iv]))
				{
					if (cr.is_number(val))
						myinstvars[iv] += val;
					else
						myinstvars[iv] += parseFloat(val);
				}
				else if (cr.is_string(myinstvars[iv]))
				{
					if (cr.is_string(val))
						myinstvars[iv] += val;
					else
						myinstvars[iv] += val.toString();
				}
				else
					assert2(false, "Invalid instance variable type when adding");
			};

			acts.SubInstanceVar = function (iv, val)
			{
				var myinstvars = this.instance_vars;
				
				// Keep the type of the instance var
				if (cr.is_number(myinstvars[iv]))
				{
					if (cr.is_number(val))
						myinstvars[iv] -= val;
					else
						myinstvars[iv] -= parseFloat(val);
				}
				else
					assert2(false, "Invalid instance variable type when subtracting");
			};

			acts.SetBoolInstanceVar = function (iv, val)
			{
				this.instance_vars[iv] = val ? 1 : 0;
			};

			acts.ToggleBoolInstanceVar = function (iv)
			{
				this.instance_vars[iv] = 1 - this.instance_vars[iv];
			};

			acts.Destroy = function ()
			{
				this.runtime.DestroyInstance(this);
			};
			
			if (!acts.LoadFromJsonString)
			{
				acts.LoadFromJsonString = function (str_)
				{
					var o, i, len, binst;
					
					try {
						o = JSON.parse(str_);
					}
					catch (e) {
						return;
					}
					
					this.runtime.loadInstanceFromJSON(this, o, true);
					
					if (this.afterLoad)
						this.afterLoad();
					
					if (this.behavior_insts)
					{
						for (i = 0, len = this.behavior_insts.length; i < len; ++i)
						{
							binst = this.behavior_insts[i];
							
							if (binst.afterLoad)
								binst.afterLoad();
						}
					}
				};
			}

			exps.Count = function (ret)
			{
				var count = ret.object_class.instances.length;
				
				// Include objects on creation row of same type
				var i, len, inst;
				for (i = 0, len = this.runtime.createRow.length; i < len; i++)
				{
					inst = this.runtime.createRow[i];
					
					if (ret.object_class.is_family)
					{
						if (inst.type.families.indexOf(ret.object_class) >= 0)
							count++;
					}
					else
					{
						if (inst.type === ret.object_class)
							count++;
					}
				}
				
				ret.set_int(count);
			};
			
			exps.PickedCount = function (ret)
			{
				ret.set_int(ret.object_class.getCurrentSol().getObjects().length);
			};
			
			exps.UID = function (ret)
			{
				ret.set_int(this.uid);
			};
			
			exps.IID = function (ret)
			{
				ret.set_int(this.get_iid());
			};
			
			// Don't override Array/Dictionary expressions (oops, shipped this in a beta so have to live with it)
			if (!exps.AsJSON)
			{
				exps.AsJSON = function (ret)
				{
					ret.set_string(JSON.stringify(this.runtime.saveInstanceToJSON(this, true)));
				};
			}
		}

		if (appearance_aces)
		{
			cnds.IsVisible = function ()
			{
				return this.visible;
			};

			acts.SetVisible = function (v)
			{
				if (!v !== !this.visible)
				{
					this.visible = !!v;
					this.runtime.redraw = true;
				}
			};

			cnds.CompareOpacity = function (cmp, x)
			{
				return cr.do_cmp(cr.round6dp(this.opacity * 100), cmp, x);
			};

			acts.SetOpacity = function (x)
			{
				var new_opacity = x / 100.0;

				if (new_opacity < 0)
					new_opacity = 0;
				else if (new_opacity > 1)
					new_opacity = 1;

				if (new_opacity !== this.opacity)
				{
					this.opacity = new_opacity;
					this.runtime.redraw = true;
				}
			};

			exps.Opacity = function (ret)
			{
				ret.set_float(cr.round6dp(this.opacity * 100.0));
			};
		}
		
		if (zorder_aces)
		{
			cnds.IsOnLayer = function (layer_)
			{
				if (!layer_)
					return false;
					
				return this.layer === layer_;
			};
			
			cnds.PickTopBottom = function (which_)
			{
				var sol = this.getCurrentSol();
				var instances = sol.getObjects();
				
				if (!instances.length)
					return false;
					
				var inst = instances[0];
				var pickme = inst;
				
				var i, len;
				for (i = 1, len = instances.length; i < len; i++)
				{
					inst = instances[i];
					
					// Testing if above
					if (which_ === 0)
					{
						if (inst.layer.index > pickme.layer.index || (inst.layer.index === pickme.layer.index && inst.get_zindex() > pickme.get_zindex()))
						{
							pickme = inst;
						}
					}
					// Testing if below
					else
					{
						if (inst.layer.index < pickme.layer.index || (inst.layer.index === pickme.layer.index && inst.get_zindex() < pickme.get_zindex()))
						{
							pickme = inst;
						}
					}
				}
				
				// select the resulting instance
				sol.pick_one(pickme);
				return true;
			};
			
			acts.MoveToTop = function ()
			{
				var layer = this.layer;
				var layer_instances = layer.instances;
				
				if (layer_instances.length && layer_instances[layer_instances.length - 1] === this)
					return;		// is already at top
				
				// remove and re-insert at top
				layer.removeFromInstanceList(this, false);
				layer.appendToInstanceList(this, false);
				this.runtime.redraw = true;
			};
			
			acts.MoveToBottom = function ()
			{
				var layer = this.layer;
				var layer_instances = layer.instances;
				
				if (layer_instances.length && layer_instances[0] === this)
					return;		// is already at bottom
				
				// remove and re-insert at bottom
				layer.removeFromInstanceList(this, false);
				layer.prependToInstanceList(this, false);
				this.runtime.redraw = true;
			};
			
			acts.MoveToLayer = function (layerMove)
			{
				// no layer or same layer: don't do anything
				if (!layerMove || layerMove == this.layer)
					return;
					
				// otherwise remove from current layer...
				this.layer.removeFromInstanceList(this, true);
				
				// ...and add to the top of the new layer (which can be done without making zindices stale)
				this.layer = layerMove;
				layerMove.appendToInstanceList(this, true);
				
				this.runtime.redraw = true;
			};
			
			acts.ZMoveToObject = function (where_, obj_)
			{
				var isafter = (where_ === 0);
				
				if (!obj_)
					return;
				
				var other = obj_.getFirstPicked(this);
				
				if (!other || other.uid === this.uid)
					return;
				
				// First move to same layer as other object if different
				if (this.layer.index !== other.layer.index)
				{
					this.layer.removeFromInstanceList(this, true);
					
					this.layer = other.layer;
					other.layer.appendToInstanceList(this, true);
				}
				
				this.layer.moveInstanceAdjacent(this, other, isafter);				
				this.runtime.redraw = true;
			};
			
			exps.LayerNumber = function (ret)
			{
				ret.set_int(this.layer.number);
			};
			
			exps.LayerName = function (ret)
			{
				ret.set_string(this.layer.name);
			};
			
			exps.ZIndex = function (ret)
			{
				ret.set_int(this.get_zindex());
			};
		}
		
		if (effects_aces)
		{
			acts.SetEffectEnabled = function (enable_, effectname_)
			{
				if (!this.runtime.glwrap)
					return;
					
				var i = this.type.getEffectIndexByName(effectname_);
				
				if (i < 0)
					return;		// effect name not found
					
				var enable = (enable_ === 1);
				
				if (this.active_effect_flags[i] === enable)
					return;		// no change
					
				this.active_effect_flags[i] = enable;
				this.updateActiveEffects();
				this.runtime.redraw = true;
			};
			
			acts.SetEffectParam = function (effectname_, index_, value_)
			{
				if (!this.runtime.glwrap)
					return;
					
				var i = this.type.getEffectIndexByName(effectname_);
				
				if (i < 0)
					return;		// effect name not found
				
				var et = this.type.effect_types[i];
				var params = this.effect_params[i];
					
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
		}
	};

	// For instances: mark bounding box stale
	cr.set_bbox_changed = function ()
	{
		this.bbox_changed = true;      		// will recreate next time box requested
		this.cell_changed = true;
		this.type.any_cell_changed = true;	// avoid unnecessary updateAllBBox() calls
		this.runtime.redraw = true;     	// assume runtime needs to redraw
		
		// call bbox changed callbacks
		var i, len, callbacks = this.bbox_changed_callbacks;
		for (i = 0, len = callbacks.length; i < len; ++i)
		{
			callbacks[i](this);
		}
		
		// If layer is using render cells, update the bounding box right away to
		// update its render cells. This appears to be faster than trying to maintain
		// a queue of objects to update later.
		if (this.layer.useRenderCells)
			this.update_bbox();
	};

	cr.add_bbox_changed_callback = function (f)
	{
		if (f)
		{
			this.bbox_changed_callbacks.push(f);
		}
	};

	// For instances: updates the bounding box (if it changed)
	cr.update_bbox = function ()
	{
		if (!this.bbox_changed)
			return;                 // bounding box not changed
		
		var bbox = this.bbox;
		var bquad = this.bquad;

		// Get unrotated box
		bbox.set(this.x, this.y, this.x + this.width, this.y + this.height);
		bbox.offset(-this.hotspotX * this.width, -this.hotspotY * this.height);

		// Not rotated
		if (!this.angle)
		{
			bquad.set_from_rect(bbox);    // make bounding quad from box
		}
		else
		{
			// Rotate to a quad and store bounding quad
			bbox.offset(-this.x, -this.y);       			// translate to origin
			bquad.set_from_rotated_rect(bbox, this.angle);	// rotate around origin
			bquad.offset(this.x, this.y);      				// translate back to original position

			// Generate bounding box from rotated quad
			bquad.bounding_box(bbox);
		}
		
		// Normalize bounding box in case of mirror/flip
		bbox.normalize();

		this.bbox_changed = false;  // bounding box up to date
		
		// Ensure render cell also up-to-date
		this.update_render_cell();
	};
	
	var tmprc = new cr.rect(0, 0, 0, 0);
	
	cr.update_render_cell = function ()
	{
		// ignore if layer not using render cells
		if (!this.layer.useRenderCells)
			return;
		
		var mygrid = this.layer.render_grid;
		var bbox = this.bbox;
		tmprc.set(mygrid.XToCell(bbox.left), mygrid.YToCell(bbox.top), mygrid.XToCell(bbox.right), mygrid.YToCell(bbox.bottom));
		
		// No change: no need to update anything
		if (this.rendercells.equals(tmprc))
			return;
		
		// Update in sparse grid
		if (this.rendercells.right < this.rendercells.left)
			mygrid.update(this, null, tmprc);		// first insertion with invalid rect: don't provide old range
		else
			mygrid.update(this, this.rendercells, tmprc);
		
		// Update my current collision cells
		this.rendercells.copy(tmprc);
		
		// Mark the render list as having changed
		this.layer.render_list_stale = true;
		
		/**PREVIEWONLY**/this.runtime.movedrendercell_count++;
	};
	
	cr.update_collision_cell = function ()
	{		
		// Determine new set of collision cells and check if changed.
		// Note collcells is initialised to an invalid rect (0, 0, -1, -1)
		// In this case it's the first insertion, so don't provide the old range.
		if (!this.cell_changed || !this.collisionsEnabled)
			return;
		
		this.update_bbox();
		
		var mygrid = this.type.collision_grid;
		var bbox = this.bbox;
		tmprc.set(mygrid.XToCell(bbox.left), mygrid.YToCell(bbox.top), mygrid.XToCell(bbox.right), mygrid.YToCell(bbox.bottom));
		
		// No change: no need to update anything
		if (this.collcells.equals(tmprc))
			return;
		
		// Update in sparse grid
		if (this.collcells.right < this.collcells.left)
			mygrid.update(this, null, tmprc);		// first insertion with invalid rect: don't provide old range
		else
			mygrid.update(this, this.collcells, tmprc);
		
		// Update my current collision cells
		this.collcells.copy(tmprc);
		
		/**PREVIEWONLY**/this.runtime.movedcell_count++;
		
		this.cell_changed = false;
	};

	// For instances: point in box test
	cr.inst_contains_pt = function (x, y)
	{
		/**PREVIEWONLY**/this.runtime.collisioncheck_count++;
		
		// Reject via bounding box (fastest)
		if (!this.bbox.contains_pt(x, y))
			return false;
		// Reject via bounding quad (next fastest)
		/**PREVIEWONLY**/this.runtime.polycheck_count++;
		if (!this.bquad.contains_pt(x, y))
			return false;
			
		// Test via collision poly if present (slowest)
		if (this.collision_poly && !this.collision_poly.is_empty())
		{
			this.collision_poly.cache_poly(this.width, this.height, this.angle);
			return this.collision_poly.contains_pt(x - this.x, y - this.y);
		}
		// No poly - bounding quad contains point
		else
			return true;
	};

	cr.inst_get_iid = function ()
	{
		this.type.updateIIDs();
		return this.iid;
	};

	cr.inst_get_zindex = function ()
	{
		this.layer.updateZIndices();
		return this.zindex;
	};

	cr.inst_updateActiveEffects = function ()
	{
		cr.clearArray(this.active_effect_types);
			
		var i, len, et;
		var preserves_opaqueness = true;
		for (i = 0, len = this.active_effect_flags.length; i < len; i++)
		{
			if (this.active_effect_flags[i])
			{
				et = this.type.effect_types[i];
				this.active_effect_types.push(et);
				
				if (!et.preservesOpaqueness)
					preserves_opaqueness = false;
			}
		}
		
		this.uses_shaders = !!this.active_effect_types.length;
		this.shaders_preserve_opaqueness = preserves_opaqueness;
	};

	// For instances: toString overload
	cr.inst_toString = function ()
	{
		// e.g. "Inst2" or "Inst974"
		// Note: the UID is deliberatey not used here, since saving and loading
		// can change object UIDs. ObjectSets store objects by their toString conversion,
		// and if toString returns something including the UID which then changes, the
		// ObjectSets become corrupt. Instead, the PUID was invented (permanently unique
		// ID), which is not exposed or used anywhere except for the purposes of toString here.
		return "Inst" + this.puid;
	};

	// For types: gets the first picked instance
	cr.type_getFirstPicked = function (frominst)
	{
		// If a 'from' instance is provided, check if this type is in
		// a container with that instance. If so, pick the associated
		// container instance.
		if (frominst && frominst.is_contained && frominst.type != this)
		{
			var i, len, s;
			for (i = 0, len = frominst.siblings.length; i < len; i++)
			{
				s = frominst.siblings[i];
				
				if (s.type == this)
					return s;
			}
		}
		
		var instances = this.getCurrentSol().getObjects();

		if (instances.length)
			return instances[0];
		else
			return null;
	};

	cr.type_getPairedInstance = function (inst)
	{
		var instances = this.getCurrentSol().getObjects();
		
		if (instances.length)
			return instances[inst.get_iid() % instances.length];
		else
			return null;
	};

	cr.type_updateIIDs = function ()
	{
		if (!this.stale_iids || this.is_family)
			return;		// up to date or is family - don't want family to overwrite IIDs
			
		var i, len;
		for (i = 0, len = this.instances.length; i < len; i++)
			this.instances[i].iid = i;
		
		// Continue to assign IIDs even in to instances waiting on create row
		var next_iid = i;
		
		var createRow = this.runtime.createRow;
		
		for (i = 0, len = createRow.length; i < len; ++i)
		{
			if (createRow[i].type === this)
				createRow[i].iid = next_iid++;
		}
			
		this.stale_iids = false;
	};

	// also looks in createRow, not just type.instances
	cr.type_getInstanceByIID = function (i)
	{
		if (i < this.instances.length)
			return this.instances[i];
		
		// Look through creation row for additional instances
		i -= this.instances.length;
		
		var createRow = this.runtime.createRow;
		
		var j, lenj;
		for (j = 0, lenj = createRow.length; j < lenj; ++j)
		{
			if (createRow[j].type === this)
			{			
				if (i === 0)
					return createRow[j];
				
				--i;
			}
		}
		
		assert2(false, "Unable to find instance by IID");
		return null;
	};

	// For types: get current SOL
	cr.type_getCurrentSol = function ()
	{
		return this.solstack[this.cur_sol];
	};

	cr.type_pushCleanSol = function ()
	{
		this.cur_sol++;

		// Stack not yet big enough - create new SOL
		if (this.cur_sol === this.solstack.length)
		{
			this.solstack.push(new cr.selection(this));
		}
		else
		{
			this.solstack[this.cur_sol].select_all = true;  // else clear next SOL
			
			// Make sure any leftover else_instances are cleared; not always reset by next event
			cr.clearArray(this.solstack[this.cur_sol].else_instances);
		}
	};

	cr.type_pushCopySol = function ()
	{
		this.cur_sol++;

		// Stack not yet big enough - create new SOL
		if (this.cur_sol === this.solstack.length)
			this.solstack.push(new cr.selection(this));

		// Copy the previous sol in to the new sol
		var clonesol = this.solstack[this.cur_sol];
		var prevsol = this.solstack[this.cur_sol - 1];

		if (prevsol.select_all)
		{
			clonesol.select_all = true;
			
			// Make sure any leftover else_instances are cleared; not always reset by next event
			cr.clearArray(clonesol.else_instances);
		}
		else
		{
			clonesol.select_all = false;
			cr.shallowAssignArray(clonesol.instances, prevsol.instances);
			cr.shallowAssignArray(clonesol.else_instances, prevsol.else_instances);
		}
	};

	cr.type_popSol = function ()
	{
		// Simply decrement cur_sol - will start using previous SOL.
		// The SOL we left behind is left in undefined state, we just don't care about it.
		// It'll be overwritten next time it's used.
		assert2(this.cur_sol > 0, "Popping SOL but already at bottom of SOL stack");
		this.cur_sol--;
	};

	cr.type_getBehaviorByName = function (behname)
	{
		var i, len, j, lenj, f, index = 0;
		
		// Check family behaviors first
		if (!this.is_family)
		{
			for (i = 0, len = this.families.length; i < len; i++)
			{
				f = this.families[i];
				
				for (j = 0, lenj = f.behaviors.length; j < lenj; j++)
				{
					if (behname === f.behaviors[j].name)
					{
						this.extra["lastBehIndex"] = index;
						return f.behaviors[j];
					}
						
					index++;
				}
			}
		}
		
		// Now check my behaviors
		for (i = 0, len = this.behaviors.length; i < len; i++) {
			if (behname === this.behaviors[i].name)
			{
				this.extra["lastBehIndex"] = index;
				return this.behaviors[i];
			}
				
			index++;
		}
		return null;
	};

	cr.type_getBehaviorIndexByName = function (behname)
	{
		var b = this.getBehaviorByName(behname);
		
		if (b)
			return this.extra["lastBehIndex"];
		else
			return -1;
	};

	cr.type_getEffectIndexByName = function (name_)
	{
		var i, len;
		for (i = 0, len = this.effect_types.length; i < len; i++)
		{
			if (this.effect_types[i].name === name_)
				return i;
		}
		
		return -1;
	};

	cr.type_applySolToContainer = function ()
	{
		if (!this.is_contained || this.is_family)
			return;
		
		var i, len, j, lenj, t, sol, sol2;
		this.updateIIDs();
		sol = this.getCurrentSol();
		var select_all = sol.select_all;
		var es = this.runtime.getCurrentEventStack();
		var orblock = es && es.current_event && es.current_event.orblock;
		
		for (i = 0, len = this.container.length; i < len; i++)
		{
			t = this.container[i];
			
			if (t === this)
				continue;
			
			t.updateIIDs();
				
			sol2 = t.getCurrentSol();
			sol2.select_all = select_all;
			
			if (!select_all)
			{
				cr.clearArray(sol2.instances);
				
				for (j = 0, lenj = sol.instances.length; j < lenj; ++j)
					sol2.instances[j] = t.getInstanceByIID(sol.instances[j].iid);
				
				if (orblock)
				{
					cr.clearArray(sol2.else_instances);
					
					for (j = 0, lenj = sol.else_instances.length; j < lenj; ++j)
						sol2.else_instances[j] = t.getInstanceByIID(sol.else_instances[j].iid);
				}
			}
		}
	};

	cr.type_toString = function ()
	{
		return "Type" + this.sid;
	};

	// For comparison conditions
	cr.do_cmp = function (x, cmp, y)
	{
		if (typeof x === "undefined" || typeof y === "undefined")
			return false;
			
		switch (cmp)
		{
			case 0:     // equal
				return x === y;
			case 1:     // not equal
				return x !== y;
			case 2:     // less
				return x < y;
			case 3:     // less/equal
				return x <= y;
			case 4:     // greater
				return x > y;
			case 5:     // greater/equal
				return x >= y;
			default:
				assert2(false, "Invalid comparison value: " + cmp);
				return false;
		}
	};

})();