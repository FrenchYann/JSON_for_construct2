// ECMAScript 5 strict mode
"use strict";

(function()
{
	function ExpNode(owner_, m)
	{
		this.owner = owner_;
		this.runtime = owner_.runtime;
		this.type = m[0];
		
		assert2(this.type >= 0 && this.type <= 23, "Invalid ExpNode type: " + this.type);
		
		this.get = [this.eval_int,
					this.eval_float,
					this.eval_string,
					this.eval_unaryminus,
					this.eval_add,
					this.eval_subtract,
					this.eval_multiply,
					this.eval_divide,
					this.eval_mod,
					this.eval_power,
					this.eval_and,
					this.eval_or,
					this.eval_equal,
					this.eval_notequal,
					this.eval_less,
					this.eval_lessequal,
					this.eval_greater,
					this.eval_greaterequal,
					this.eval_conditional,
					this.eval_system_exp,
					this.eval_object_exp,
					this.eval_instvar_exp,
					this.eval_behavior_exp,
					this.eval_eventvar_exp][this.type];
					
		// if expnode has parameters, points to the model array for them
		var paramsModel = null;
		
		this.value = null;
		this.first = null;
		this.second = null;
		this.third = null;
		this.func = null;
		this.results = null;
		this.parameters = null;
		this.object_type = null;
		this.beh_index = -1;
		this.instance_expr = null;
		this.varindex = -1;
		this.behavior_type = null;
		this.varname = null;
		this.eventvar = null;
		this.return_string = false;
					
		switch (this.type) {
		case 0:		// int
		case 1:		// float
		case 2:		// string
			this.value = m[1];
			break;
		case 3:		// unaryminus
			this.first = new cr.expNode(owner_, m[1]);
			break;
		// 4-17 are binary ops, handled outside of switch case as range
		case 18:	// conditional
			this.first = new cr.expNode(owner_, m[1]);
			this.second = new cr.expNode(owner_, m[2]);
			this.third = new cr.expNode(owner_, m[3]);
			break;
		case 19:	// system_exp
			this.func = this.runtime.GetObjectReference(m[1]);
			assert2(this.func, "Cannot find system expression");
			
			// The random() and choose() expressions always vary per instance since
			// they always return a different value
			if (this.func === cr.system_object.prototype.exps.random
			 || this.func === cr.system_object.prototype.exps.choose)
			{
				this.owner.setVaries();
			}

			// Prepare an array to store arguments - first will be the 'ret' argument
			this.results = [];
			this.parameters = [];
			
			// Has parameters
			if (m.length === 3)
			{
				paramsModel = m[2];
				this.results.length = paramsModel.length + 1;	// must also fit 'ret'
			}
			else
				this.results.length = 1;      // to fit 'ret'
				
			break;
		case 20:	// object_exp
			// Locate the object
			this.object_type = this.runtime.types_by_index[m[1]];
			assert2(this.object_type, "Cannot find object type: " + m[1]);
			
			this.beh_index = -1;
			this.func = this.runtime.GetObjectReference(m[2]);
			this.return_string = m[3];
			
			// If this is the Function object's 'Call' expression, we must set the
			// parameter as varying per-instance, since we don't know if the called
			// function will return different values.
			if (cr.plugins_.Function && this.func === cr.plugins_.Function.prototype.exps.Call)
			{
				this.owner.setVaries();
			}
			
			// has instance expression
			if (m[4])
				this.instance_expr = new cr.expNode(owner_, m[4]);
			else
				this.instance_expr = null;
				
			this.results = [];
			this.parameters = [];
				
			// has parameters
			if (m.length === 6)
			{
				paramsModel = m[5];
				this.results.length = paramsModel.length + 1;
			}
			else
				this.results.length = 1;	// to fit 'ret'
			
			break;
		case 21:		// instvar_exp
			// Locate the object type by name
			this.object_type = this.runtime.types_by_index[m[1]];
			assert2(this.object_type, "Cannot find object type: " + m[1]);
			this.return_string = m[2];

			// has instance expression
			if (m[3])
				this.instance_expr = new cr.expNode(owner_, m[3]);
			else
				this.instance_expr = null;
				
			this.varindex = m[4];

			break;
		case 22:		// behavior_exp
			// Locate the object
			this.object_type = this.runtime.types_by_index[m[1]];
			assert2(this.object_type, "Cannot find object type: " + m[1]);
			
			// Locate behavior type and index
			this.behavior_type = this.object_type.getBehaviorByName(m[2]);
			assert2(this.behavior_type, "Cannot find behavior type: " + m[2]);
			
			this.beh_index = this.object_type.getBehaviorIndexByName(m[2]);
			this.func = this.runtime.GetObjectReference(m[3]);
			this.return_string = m[4];
			
			// has instance expression
			if (m[5])
				this.instance_expr = new cr.expNode(owner_, m[5]);
			else
				this.instance_expr = null;
				
			this.results = [];
			this.parameters = [];
				
			// has parameters
			if (m.length === 7)
			{
				paramsModel = m[6];
				this.results.length = paramsModel.length + 1;
			}
			else
				this.results.length = 1;	// to fit 'ret'
			
			break;
		case 23:		// eventvar_exp
			this.varname = m[1];
			this.eventvar = null;	// assigned in postInit
			break;
		}
		
		this.owner.maybeVaryForType(this.object_type);
		
		// Initialise binary operators
		if (this.type >= 4 && this.type <= 17)
		{
			this.first = new cr.expNode(owner_, m[1]);
			this.second = new cr.expNode(owner_, m[2]);
		}

		// Initialise any parameters
		if (paramsModel)
		{
			var i, len;
			for (i = 0, len = paramsModel.length; i < len; i++)
				this.parameters.push(new cr.expNode(owner_, paramsModel[i]));
		}
		
		cr.seal(this);
	};
	
	ExpNode.prototype.postInit = function ()
	{
		if (this.type === 23)	// eventvar_exp
		{
			// Look up event variable name
			this.eventvar = this.owner.runtime.getEventVariableByName(this.varname, this.owner.block.parent);
			assert2(this.eventvar, "Cannot find event variable '" + this.varname + "'");
		}
		
		if (this.first)
			this.first.postInit();
		if (this.second)
			this.second.postInit();
		if (this.third)
			this.third.postInit();
		if (this.instance_expr)
			this.instance_expr.postInit();
		if (this.parameters)
		{
			var i, len;
			for (i = 0, len = this.parameters.length; i < len; i++)
				this.parameters[i].postInit();
		}
	};
	
	var tempValues = [];
	var tempValuesPtr = -1;
	
	function pushTempValue()
	{
		++tempValuesPtr;
		
		if (tempValues.length === tempValuesPtr)
			tempValues.push(new cr.expvalue());
			
		return tempValues[tempValuesPtr];
	};
	
	function popTempValue()
	{
		--tempValuesPtr;
	};
	
	function eval_params(parameters, results, temp)
	{
		var i, len;
		for (i = 0, len = parameters.length; i < len; ++i)
		{
			parameters[i].get(temp);
			results[i + 1] = temp.data;   // passing actual javascript value as argument instead of expvalue
		}
	}

	// Expression node evaluation functions
	ExpNode.prototype.eval_system_exp = function (ret)
	{
		// Use func.apply to call the following method with system object as 'this':
		// function expression(ret [, arg1, arg2... argN])

		var parameters = this.parameters;
		
		// First argument is ret
		var results = this.results;
		results[0] = ret;
		
		var temp = pushTempValue();

		// Evaluate all parameters to the rest of the results
		eval_params(parameters, results, temp);
		
		popTempValue();

		// Invoke the system expression
		this.func.apply(this.runtime.system, results);
	};

	// Expression node evaluation functions
	ExpNode.prototype.eval_object_exp = function (ret)
	{
		// Use func.apply to call the following method with correct instance as 'this':
		// function expression(ret [, arg1, arg2... argN])

		var object_type = this.object_type;
		var results = this.results;
		var parameters = this.parameters;
		var instance_expr = this.instance_expr;
		var func = this.func;
		var index = this.owner.solindex;			// default to parameter's intended SOL index
		var sol = object_type.getCurrentSol();
		var instances = sol.getObjects();

		// No instances available: try else_instances instead, otherwise return either 0 or an empty string
		if (!instances.length)
		{
			if (sol.else_instances.length)
				instances = sol.else_instances;
			else
			{
				if (this.return_string)
					ret.set_string("");
				else
					ret.set_int(0);
				return;
			}
		}

		// First argument is ret
		results[0] = ret;
		ret.object_class = object_type;		// so expression can access family type if need be
		
		var temp = pushTempValue();

		// Evaluate all parameters to the rest of the results
		eval_params(parameters, results, temp);

		// If there is an instance expression, evaluate it to get a new index
		if (instance_expr) {
			instance_expr.get(temp);

			// If the result was a number, use it for an absolute instance index - not via the SOL
			if (temp.is_number()) {
				index = temp.data;
				instances = object_type.instances;    // pick from all instances, not SOL
			}
		}
		
		popTempValue();

		// Bound to available instances
		var len = instances.length;
		
		if (index >= len || index <= -len)
			index %= len;      // wraparound

		// If negative, offset such that -1 is the last selected
		if (index < 0)
			index += len;

		// Invoke method (returned_val is for plugin developer hint only)
		var returned_val = func.apply(instances[index], results);

		assert2(!returned_val, "Plugin mistake: Don't return values from the expression method - call ret.set_int/set_float/set_string instead");
	};
	
	ExpNode.prototype.eval_behavior_exp = function (ret)
	{
		// Use func.apply to call the following method with correct instance as 'this':
		// function expression(ret [, arg1, arg2... argN])

		var object_type = this.object_type;
		var results = this.results;
		var parameters = this.parameters;
		var instance_expr = this.instance_expr;
		var beh_index = this.beh_index;
		var func = this.func;
		var index = this.owner.solindex;			// default to parameter's intended SOL index
		var sol = object_type.getCurrentSol();
		var instances = sol.getObjects();

		// No instances available: try else_instances instead, otherwise return either 0 or an empty string
		if (!instances.length)
		{
			if (sol.else_instances.length)
				instances = sol.else_instances;
			else
			{
				if (this.return_string)
					ret.set_string("");
				else
					ret.set_int(0);
				return;
			}
		}

		// First argument is ret
		results[0] = ret;
		ret.object_class = object_type;		// so expression can access family type if need be
		
		var temp = pushTempValue();

		// Evaluate all parameters to the rest of the results
		eval_params(parameters, results, temp);
		
		// If there is an instance expression, evaluate it to get a new index
		if (instance_expr) {
			instance_expr.get(temp);

			// If the result was a number, use it for an absolute instance index - not via the SOL
			if (temp.is_number()) {
				index = temp.data;
				instances = object_type.instances;    // pick from all instances, not SOL
			}
		}
		
		popTempValue();

		// Bound to available instances
		var len = instances.length;
		
		if (index >= len || index <= -len)
			index %= len;      // wraparound

		// If negative, offset such that -1 is the last selected
		if (index < 0)
			index += len;

		// Invoke method (returned_val is for plugin developer hint only)
		var inst = instances[index];

		// Invoke as behavior expression.
		// Offset if using family behaviors
		var offset = 0;
		
		if (object_type.is_family)
		{
			offset = inst.type.family_beh_map[object_type.family_index];
		}
	
		var returned_val = func.apply(inst.behavior_insts[beh_index + offset], results);

		assert2(!returned_val, "Plugin mistake: Don't return values from the expression method - call ret.set_int/set_float/set_string instead");
	};

	ExpNode.prototype.eval_instvar_exp = function (ret)
	{
		var instance_expr = this.instance_expr;
		var object_type = this.object_type;
		var varindex = this.varindex;
		var index = this.owner.solindex;		// default to parameter's intended SOL index
		var sol = object_type.getCurrentSol();
		var instances = sol.getObjects();
		var inst;

		// No instances available: try else_instances instead, otherwise return either 0 or an empty string
		if (!instances.length)
		{
			if (sol.else_instances.length)
				instances = sol.else_instances;
			else
			{
				if (this.return_string)
					ret.set_string("");
				else
					ret.set_int(0);
				return;
			}
		}
		
		// If there is an instance expression, evaluate it to get the new index
		if (instance_expr)
		{
			var temp = pushTempValue();
			
			instance_expr.get(temp);

			// If the result was a number, use it for an absolute instance index - not via the SOL
			if (temp.is_number())
			{
				index = temp.data;

				var type_instances = object_type.instances;
				
				if (type_instances.length !== 0)		// avoid NaN result with %
				{
					index %= type_instances.length;     // wraparound

					if (index < 0)                      // offset
						index += type_instances.length;
				}

				// Return nth instance's instance variable
				inst = object_type.getInstanceByIID(index);
				var to_ret = inst.instance_vars[varindex];

				if (cr.is_string(to_ret))
					ret.set_string(to_ret);
				else
					ret.set_float(to_ret);

				popTempValue();
				return;         // done
			}
			
			popTempValue();
		}

		// Bound to available instances
		var len = instances.length;
		
		if (index >= len || index <= -len)
			index %= len;		// wraparound
		
		// If negative, offset such that -1 is the last selected
		if (index < 0)
			index += len;
		
		inst = instances[index];
		
		// Offset if using family variables
		var offset = 0;
		
		if (object_type.is_family)
		{
			offset = inst.type.family_var_map[object_type.family_index];
		}

		// Return nth instance's instance variable
		var to_ret = inst.instance_vars[varindex + offset];

		if (cr.is_string(to_ret))
			ret.set_string(to_ret);
		else
			ret.set_float(to_ret);
	};

	ExpNode.prototype.eval_int = function (ret)
	{
		ret.type = cr.exptype.Integer;
		ret.data = this.value;
	};

	ExpNode.prototype.eval_float = function (ret)
	{
		ret.type = cr.exptype.Float;
		ret.data = this.value;
	};

	ExpNode.prototype.eval_string = function (ret)
	{
		ret.type = cr.exptype.String;
		ret.data = this.value;
	};

	ExpNode.prototype.eval_unaryminus = function (ret)
	{
		this.first.get(ret);                // retrieve operand

		if (ret.is_number())
			ret.data = -ret.data;
	};

	ExpNode.prototype.eval_add = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			ret.data += temp.data;          // both operands numbers: add

			// Right operand was float: result must be typed float as well
			if (temp.is_float())
				ret.make_float();
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_subtract = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			ret.data -= temp.data;          // both operands numbers: subtract

			// Right operand was float: result must be typed float as well
			if (temp.is_float())
				ret.make_float();
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_multiply = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			ret.data *= temp.data;          // both operands numbers: multiply

			// Right operand was float: result must be typed float as well
			if (temp.is_float())
				ret.make_float();
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_divide = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			ret.data /= temp.data;          // both operands numbers: divide

			// Division always returns float, even with integer operands
			ret.make_float();
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_mod = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			ret.data %= temp.data;          // both operands numbers: modulo

			// Right operand was float: result must be typed float as well
			if (temp.is_float())
				ret.make_float();
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_power = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			ret.data = Math.pow(ret.data, temp.data);   // both operands numbers: raise to power

			// Right operand was float: result must be typed float as well
			if (temp.is_float())
				ret.make_float();
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_and = function (ret)
	{
		this.first.get(ret);			// left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand
		
		if (temp.is_string() || ret.is_string())
			this.eval_and_stringconcat(ret, temp);
		else
			this.eval_and_logical(ret, temp);
		
		popTempValue();
	};
	
	ExpNode.prototype.eval_and_stringconcat = function (ret, temp)
	{
		if (ret.is_string() && temp.is_string())
			this.eval_and_stringconcat_str_str(ret, temp);
		else
			this.eval_and_stringconcat_num(ret, temp);
	};
	
	ExpNode.prototype.eval_and_stringconcat_str_str = function (ret, temp)
	{
		ret.data += temp.data;
	};
	
	ExpNode.prototype.eval_and_stringconcat_num = function (ret, temp)
	{
		if (ret.is_string())
		{
			// Left operand is string. Based on caller, we know temp is not a string: concatenate number.
			// Note we round to avoid floating point errors appearing in the string.
			ret.data += (Math.round(temp.data * 1e10) / 1e10).toString();
		}
		else
		{
			// Right operand string but 'ret' is a number: set to a string with the number appended.
			ret.set_string(ret.data.toString() + temp.data);
		}
	};
	
	ExpNode.prototype.eval_and_logical = function (ret, temp)
	{
		// Both operands number: perform logical AND
		ret.set_int(ret.data && temp.data ? 1 : 0);
	};

	ExpNode.prototype.eval_or = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		if (ret.is_number() && temp.is_number())
		{
			if (ret.data || temp.data)
				ret.set_int(1);
			else
				ret.set_int(0);
		}
		
		popTempValue();
	};

	ExpNode.prototype.eval_conditional = function (ret)
	{
		this.first.get(ret);                // condition operand

		if (ret.data)                       // is true
			this.second.get(ret);           // evaluate second operand to ret
		else
			this.third.get(ret);            // evaluate third operand to ret
	};

	ExpNode.prototype.eval_equal = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		ret.set_int(ret.data === temp.data ? 1 : 0);
		popTempValue();
	};

	ExpNode.prototype.eval_notequal = function (ret)
	{
		this.first.get(ret);                // left operand
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		ret.set_int(ret.data !== temp.data ? 1 : 0);
		popTempValue();
	};

	ExpNode.prototype.eval_less = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		ret.set_int(ret.data < temp.data ? 1 : 0);
		popTempValue();
	};

	ExpNode.prototype.eval_lessequal = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		ret.set_int(ret.data <= temp.data ? 1 : 0);
		popTempValue();
	};

	ExpNode.prototype.eval_greater = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		ret.set_int(ret.data > temp.data ? 1 : 0);
		popTempValue();
	};

	ExpNode.prototype.eval_greaterequal = function (ret)
	{
		this.first.get(ret);                // left operand
		
		var temp = pushTempValue();
		this.second.get(temp);			// right operand

		ret.set_int(ret.data >= temp.data ? 1 : 0);
		popTempValue();
	};

	ExpNode.prototype.eval_eventvar_exp = function (ret)
	{
		var val = this.eventvar.getValue();
		
		if (cr.is_number(val))
			ret.set_float(val);
		else
			ret.set_string(val);
	};
	
	cr.expNode = ExpNode;

	// Expression value class
	function ExpValue(type, data)
	{
		this.type = type || cr.exptype.Integer;
		this.data = data || 0;
		this.object_class = null;

		assert2(!this.is_int() || cr.is_number(this.data), "Constructing integer expvalue without number data");
		assert2(!this.is_float() || cr.is_number(this.data), "Constructing float expvalue without number data");
		assert2(!this.is_string() || cr.is_string(this.data), "Constructing string expvalue without string data");

		// Since integers are emulated, ensure value is rounded for int
		if (this.type == cr.exptype.Integer)
			this.data = Math.floor(this.data);
			
		cr.seal(this);
	};

	ExpValue.prototype.is_int = function ()
	{
		return this.type === cr.exptype.Integer;
	};

	ExpValue.prototype.is_float = function ()
	{
		return this.type === cr.exptype.Float;
	};

	ExpValue.prototype.is_number = function ()
	{
		return this.type === cr.exptype.Integer || this.type === cr.exptype.Float;
	};

	ExpValue.prototype.is_string = function ()
	{
		return this.type === cr.exptype.String;
	};

	ExpValue.prototype.make_int = function ()
	{
		if (!this.is_int())
		{
			if (this.is_float())
				this.data = Math.floor(this.data);      // truncate float
			else if (this.is_string())
				this.data = parseInt(this.data, 10);

			this.type = cr.exptype.Integer;
		}
	};

	ExpValue.prototype.make_float = function ()
	{
		if (!this.is_float())
		{
			if (this.is_string())
				this.data = parseFloat(this.data);
			// else data is already a JS number

			this.type = cr.exptype.Float;
		}
	};

	ExpValue.prototype.make_string = function ()
	{
		if (!this.is_string())
		{
			this.data = this.data.toString();
			this.type = cr.exptype.String;
		}
	};

	ExpValue.prototype.set_int = function (val)
	{
		assert2(cr.is_number(val), "Calling expvalue.set_int without number type");

		this.type = cr.exptype.Integer;
		this.data = Math.floor(val);
	};

	ExpValue.prototype.set_float = function (val)
	{
		assert2(cr.is_number(val), "Calling expvalue.set_float without number type");

		this.type = cr.exptype.Float;
		this.data = val;
	};

	ExpValue.prototype.set_string = function (val)
	{
		assert2(cr.is_string(val), "Calling expvalue.set_string without string type");

		this.type = cr.exptype.String;
		this.data = val;
	};
	
	ExpValue.prototype.set_any = function (val)
	{
		if (cr.is_number(val))
		{
			this.type = cr.exptype.Float;
			this.data = val;
		}
		else if (cr.is_string(val))
		{
			this.type = cr.exptype.String;
			this.data = val.toString();
		}
		// null/undefined/an object for some reason
		else
		{
			this.type = cr.exptype.Integer;
			this.data = 0;
		}
	};
	
	cr.expvalue = ExpValue;

	// Enum values for expvalue
	cr.exptype = {
		Integer: 0,     // emulated; no native integer support in javascript
		Float: 1,
		String: 2
	};
}());