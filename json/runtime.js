// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
// *** CHANGE THE PLUGIN ID HERE *** - must match the "id" property in edittime.js
//          vvvvvvvv
cr.plugins_.JSON = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	/////////////////////////////////////
	// *** CHANGE THE PLUGIN ID HERE *** - must match the "id" property in edittime.js
	//                            vvvvvvvv
	var pluginProto = cr.plugins_.JSON.prototype;
		
	/////////////////////////////////////
	// Object type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var typeProto = pluginProto.Type.prototype;

	// called on startup for each object type
	typeProto.onCreate = function()
	{

	};

	/////////////////////////////////////
	// Instance class
	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;
		
		// any other properties you need, e.g...
		// this.myValue = 0;
	};
	
	var instanceProto = pluginProto.Instance.prototype;
    var ROOT_KEY = "root";
	// called whenever an instance is created
	instanceProto.onCreate = function()
	{
		this.data = {};
        this.curKey = "";
        this.curPath = [];
	};
	
	// called whenever an instance is destroyed
	// note the runtime may keep the object after this call for recycling; be sure
	// to release/recycle/reset any references to other objects in this function.
	instanceProto.onDestroy = function ()
	{
	};
	
	// called when saving the full state of the game
	instanceProto.saveToJSON = function ()
	{
		// return a Javascript object containing information about your object's state
		// note you MUST use double-quote syntax (e.g. "property": value) to prevent
		// Closure Compiler renaming and breaking the save format
		return {
			// e.g.
			//"myValue": this.myValue
		};
	};
	
	// called when loading the full state of the game
	instanceProto.loadFromJSON = function (o)
	{
		// load from_current the state previously saved by saveToJSON
		// 'o' provides the same object that you saved, e.g.
		// this.myValue = o["myValue"];
		// note you MUST use double-quote syntax (e.g. o["property"]) to prevent
		// Closure Compiler renaming and breaking the save format
	};
	
	// only called if a layout object - draw to a canvas 2D context
	instanceProto.draw = function(ctx)
	{
	};
	
	// only called if a layout object in WebGL mode - draw to the WebGL context
	// 'glw' is not a WebGL context, it's a wrapper - you can find its methods in GLWrap.js in the install
	// directory or just copy what other plugins do.
	instanceProto.drawGL = function (glw)
	{
	};
	
	// The comments around these functions ensure they are removed when exporting, since the
	// debugger code is no longer relevant after publishing.
	/**BEGIN-PREVIEWONLY**/
	instanceProto.getDebuggerValues = function (propsections)
	{
		// Append to propsections any debugger sections you want to appear.
		// Each section is an object with two members: "title" and "properties".
		// "properties" is an array of individual debugger properties to display
		// with their name and value, and some other optional settings.
		propsections.push({
			"title": "My debugger section",
			"properties": [
				// Each property entry can use the following values:
				// "name" (required): name of the property (must be unique within this section)
				// "value" (required): a boolean, number or string for the value
				// "html" (optional, default false): set to true to interpret the name and value
				//									 as HTML strings rather than simple plain text
				// "readonly" (optional, default false): set to true to disable editing the property
				
				// Example:
				// {"name": "My property", "value": this.myValue}
			]
		});
	};
	
	instanceProto.onDebugValueEdited = function (header, name, value)
	{
		// Called when a non-readonly property has been edited in the debugger. Usually you only
		// will need 'name' (the property name) and 'value', but you can also use 'header' (the
		// header title for the section) to distinguish properties with the same name.
		if (name === "My property")
			this.myProperty = value;
	};
	/**END-PREVIEWONLY**/

	//////////////////////////////////////
	// Conditions
	function Cnds() {}

    instanceProto.getValueFromPath = function(from_current, path) {
        if (from_current) {
            return this.getValueFromPath(
                    false,
                    this.curPath.concat(path)
                );
        } else {
            var path_ = [ROOT_KEY].concat(path);
            var value = this.data;

            for (var i = 0; i < path_.length; i++) {
                if (value === undefined) {
                    break;
                } else if (value === null) {
                    // we avoid null 'cause null[i] will throw an error
                    if (i < path_.length - 1) {
                        // we won't find anything
                        // at the end of the path
                        value = undefined;
                    }
                    break;
                } else { 
                    value = value[path_[i]];
                } 
            }
            return value;
        }
    };

    instanceProto.setValueFromPath = function(from_current, path, value) {
        
        if (from_current) {
            value = this.setValueFromPath(
                        false,
                        this.curPath.concat(path),
                        value
                    );
        } else {
            var path_ = [ROOT_KEY].concat(path);
            var obj   = this.data;
            for (var i = 0; i < path_.length; i++) {
                if (Object.prototype.toString.call(obj) === "[object Array]" ||
                    Object.prototype.toString.call(obj) === "[object Object]") {
                    if(i < path_.length-1) {
                        obj = obj[path_[i]];
                    } else {
                        obj[path_[i]] = value;
                    }
                } else {
                    log("invalid path: root["+ path.toString()+"]","warn");
                    return;
                }
            }
            
        }
    };


    function type(value) {
        if (value === undefined) {
            return "undefined";
        } else if (value === null) {
            return "null";
        } else if (value === !!value) {
            return "boolean";
        } else if (Object.prototype.toString.call(value) === "[object Number]") {
            return "number";    
        } else if (Object.prototype.toString.call(value) === "[object String]") {
            return "string";
        } else if (Object.prototype.toString.call(value) === "[object Array]") {
            return "array";
        } else if (Object.prototype.toString.call(value) === "[object Object]") {
            return "object";
        }
    }

	// the example condition
    Cnds.prototype.IsObject = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "object";

    };
    Cnds.prototype.IsArray = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "array";
    };
    Cnds.prototype.IsBoolean = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "boolean";
    };
    Cnds.prototype.IsNumber = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "number";
    };
    Cnds.prototype.IsString = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "string";
    };
    Cnds.prototype.IsNull = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "null";
    };
    Cnds.prototype.IsUndefined = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return value === undefined;
    };
	
    	
    Cnds.prototype.ForEachProperty = function (from_current,path)
    {
        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
        var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack();


        var path_;
        if(from_current === 1 ) { 
            if (path.length > 0) {
                this.curPath.push(path);
            }
            path_ = this.curPath;
        } else {
            path_ = path;
        }

        var obj = this.getValueFromPath(false,path_);
        if (solModifierAfterCnds) {
            for (var p in obj) {
                if (Object.prototype.hasOwnProperty.call(obj,p)) {
                    this.curPath.push(p);
                    this.curKey = p;
                    this.runtime.pushCopySol(current_event.solModifiers);
                    current_event.retrigger();

                    /**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;

                    this.runtime.popSol(current_event.solModifiers);
                    this.curPath.pop();
                    if (current_loop.stopped) {
                        break;
                    }
                }
            }
        } else {
            for (var p in obj) {
                if (Object.prototype.hasOwnProperty.call(obj,p)) {
                    this.curPath.push(p);
                    this.curKey = p;
             
                    current_event.retrigger();

                    /**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;

                    this.curPath.pop();
                    if (current_loop.stopped) {
                        break;
                    }
                }
            }
        }


        if(from_current === 1 && path.length > 0) {
            this.curPath.pop();
        }

        this.curKey = "";

        this.runtime.popLoopStack();
        return false;
    };



    pluginProto.cnds = new Cnds();
	
	//////////////////////////////////////
	// Actions
	function Acts() {}

	// the example action
    Acts.prototype.NewObject = function (from_current,path)
    {
        this.setValueFromPath(from_current,path,{});
    };
    Acts.prototype.NewArray = function (from_current,path)
    {
        this.setValueFromPath(from_current,path,[]);
    };
    Acts.prototype.SetValue = function (value,from_current,path)
    {
        this.setValueFromPath(from_current,path,value);
    };
    Acts.prototype.SetBoolean = function (value,from_current,path)
    {
        this.setValueFromPath(from_current,path,value === 0);
    };
    Acts.prototype.SetNull = function (from_current,path)
    {
        this.setValueFromPath(from_current,path,null);
    };
    Acts.prototype.Delete = function (from_current,path)
    {
        function deleteIfValid(obj,prop) {
            if ( obj !== undefined && obj !== null && 
                 (typeof obj === "object") && obj[prop] !== undefined){
                
                delete obj[prop];
            } else {
                log("invalid index","warn");
            }
        }
        if (path.length === 0) {
            deleteIfValid(this.data,ROOT_KEY);
        } else {
            deleteIfValid(
                this.getValueFromPath(
                    from_current === 1,
                    path.slice(0,path.length-1) // go through all property but the last one
                ),
                path.slice(-1) // get last property
            );
        }
    };
    Acts.prototype.LoadJSON = function (json,from_current,path)
    {
        this.setValueFromPath(from_current,path,JSON.parse(json));
    };
    Acts.prototype.LogData = function ()
    {
        console.log("data", this.data);
        console.log("curPath", this.curPath);
    };

    Acts.prototype.SetCurrentPath = function(from_current,path) {

        if(from_current) {
            this.curPath = this.curPath.concat(path);
        } else {
            this.curPath = path;
        }
    };
	
	// ... other actions here ...
	
	pluginProto.acts = new Acts();
	
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	
    // the example expression
    Exps.prototype.Length = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        if (type(value) === "array") {
            ret.set_int(value.length);   
        } else {
            ret.set_int(0);
        }
    };

    // the example expression
    Exps.prototype.Value = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        var t = type(value);
        if (t === "number" || t === "string") {
            ret.set_any(value);
        } else if (t === "boolean") {
            ret.set_any((value) ? 1 : 0);
        } else {
            ret.set_any(t);
        }
    };

    Exps.prototype.ToJson = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        var t = type(value);
        if(t === "undefined") {
            ret.set_string(t);
        } else {
            ret.set_string(JSON.stringify(value));        
        }
    };

    Exps.prototype.TypeOf = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        ret.set_string(type(value));
    };
	

    Exps.prototype.CurrentKey = function (ret)
    {
        ret.set_string(this.curKey);
    };


	pluginProto.exps = new Exps();

}());