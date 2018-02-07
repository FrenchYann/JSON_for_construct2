function GetPluginSettings()
{
	return {
		"name":			"JSON",				// as appears in 'insert object' dialog, can be changed as long as "id" stays the same
		"id":			"JSON",				// this is used to identify this plugin and is saved to the project; never change it
		"version":		"1.2.2",					// (float in x.y format) Plugin version - C2 shows compatibility warnings based on this
		"description":	"Bring javascript's Objects and Array to Construct2",
		"author":		"Yann Granjon",
		"help url":		"",
		"category":		"Data & Storage",				// Prefer to re-use existing categories, but you can set anything here
		"type":			"object",				// either "world" (appears in layout and is drawn), else "object"
		"rotatable":	false,					// only used when "type" is "world".  Enables an angle property on the object.
		"flags":		0						// uncomment lines to enable flags...
					//	| pf_singleglobal		// exists project-wide, e.g. mouse, keyboard.  "type" must be "object".
					//	| pf_texture			// object has a single texture (e.g. tiled background)
					//	| pf_position_aces		// compare/set/get x, y...
					//	| pf_size_aces			// compare/set/get width, height...
					//	| pf_angle_aces			// compare/set/get angle (recommended that "rotatable" be set to true)
					//	| pf_appearance_aces	// compare/set/get visible, opacity...
					//	| pf_tiling				// adjusts image editor features to better suit tiled images (e.g. tiled background)
					//	| pf_animations			// enables the animations system.  See 'Sprite' for usage
					//	| pf_zorder_aces		// move to top, bottom, layer...
					//  | pf_nosize				// prevent resizing in the editor
					//	| pf_effects			// allow WebGL shader effects to be added
					//  | pf_predraw			// set for any plugin which draws and is not a sprite (i.e. does not simply draw
												// a single non-tiling image the size of the object) - required for effects to work properly
	};
};

////////////////////////////////////////
// Parameter types:
// AddNumberParam(label, description [, initial_string = "0"])			// a number
// AddStringParam(label, description [, initial_string = "\"\""])		// a string
// AddAnyTypeParam(label, description [, initial_string = "0"])			// accepts either a number or string
// AddCmpParam(label, description)										// combo with equal, not equal, less, etc.
// AddComboParamOption(text)											// (repeat before "AddComboParam" to add combo items)
// AddComboParam(label, description [, initial_selection = 0])			// a dropdown list parameter
// AddObjectParam(label, description)									// a button to click and pick an object type
// AddLayerParam(label, description)									// accepts either a layer number or name (string)
// AddLayoutParam(label, description)									// a dropdown list with all project layouts
// AddKeybParam(label, description)										// a button to click and press a key (returns a VK)
// AddAnimationParam(label, description)								// a string intended to specify an animation name
// AddAudioFileParam(label, description)								// a dropdown list with all imported project audio files

////////////////////////////////////////
// Conditions

// AddCondition(id,					// any positive integer to uniquely identify this condition
//				flags,				// (see docs) cf_none, cf_trigger, cf_fake_trigger, cf_static, cf_not_invertible,
//									// cf_deprecated, cf_incompatible_with_triggers, cf_looping
//				list_name,			// appears in event wizard list
//				category,			// category in event wizard list
//				display_str,		// as appears in event sheet - use {0}, {1} for parameters and also <b></b>, <i></i>
//				description,		// appears in event wizard dialog when selected
//				script_name);		// corresponding runtime function name
				
// example				


function keyPath() {
    AddComboParamOption("root");
    AddComboParamOption("current");
    AddComboParam("Reference point", "Use current the root or the current value withing foreach property loop", 0);

    AddVariadicParams("Key {n}", "Key or index to get the value. If no key is provided, the root will be used. Key({n}).");
}

function expKeyPath() {
    AddNumberParam("Root", "0 for Root or 1 for Current position");
}

function path(n) {
    return "<b>{"+n+"}</b>@<i>{...}</i>";
}

keyPath();
AddCondition(0, cf_none, "Is object", "Type", path(0)+" is an object", "Is the value an object", "IsObject");

keyPath();
AddCondition(10, cf_none, "Is array", "Type", path(0)+" is an array", "Is the value an array", "IsArray");

keyPath();
AddCondition(20, cf_none, "Is boolean", "Type", path(0)+" is a boolean", "Is the value a boolean", "IsBoolean");

keyPath();
AddCondition(30, cf_none, "Is number", "Type", path(0)+" is a number", "Is the value a number", "IsNumber");

keyPath();
AddCondition(40, cf_none, "Is string", "Type", path(0)+" is a string", "Is the value a string", "IsString");

keyPath();
AddCondition(50, cf_none, "Is null", "Type", path(0)+" is null", "Is the value null", "IsNull");

keyPath();
AddCondition(60, cf_none, "Is undefined", "Type", path(0)+" is undefined", "Is the value undefined", "IsUndefined");

keyPath();
AddCondition(70, cf_none, "Is Empty", "Arrays & Objects", path(0)+" is empty", "Is the object/array empty (Size = 0)", "IsEmpty");


// loopings
keyPath();
AddCondition(100, cf_looping, "For each property", "Object", "For each property at "+path(0), "Repeat the event for each property of the object.", "ForEachProperty");

// Error handling
AddCondition(200, cf_trigger, "On JSON Parse Error", "JSON", "On JSON Parse Error", "Is triggered if a LoadJSON failed (usually due to ill formed JSON).", "OnJSONParseError");

// References
AddStringParam("Reference name", "Name you used when you save the reference");
AddCondition(300, cf_none, "Reference Exists", "Shared Reference", "Reference {0} exists", "Return true if the reference exists", "ReferenceExists");

////////////////////////////////////////
// Actions

// AddAction(id,				// any positive integer to uniquely identify this action
//			 flags,				// (see docs) af_none, af_deprecated
//			 list_name,			// appears in event wizard list
//			 category,			// category in event wizard list
//			 display_str,		// as appears in event sheet - use {0}, {1} for parameters and also <b></b>, <i></i>
//			 description,		// appears in event wizard dialog when selected
//			 script_name);		// corresponding runtime function name

// example

keyPath();
AddAction(0, 0, "Set New Object", "Constructors", "new Object at "+path(0), "Create a new object at the given property", "NewObject");

keyPath();
AddAction(10, 0, "Set New Array", "Constructors", "new Array at "+path(0), "Create a new array at the given property", "NewArray");

AddAnyTypeParam("Value", "Set a Number or a String at the given property");
keyPath();
AddAction(20, 0, "Set Value", "Values", "set <b>{0}</b> at "+path(1), "Set a number or a string at the given property", "SetValue");


AddComboParamOption("True");
AddComboParamOption("False");
AddComboParam("value", "Set a boolean.", 0);
keyPath();
AddAction(30, 0, "Set Boolean", "Values", "set <b>{0}</b> at "+path(1), "Set a boolean at the given property", "SetBoolean");

keyPath();
AddAction(40, 0, "Set null", "Values", "set null at "+path(0), "Set null at the given property", "SetNull");

keyPath();
AddAction(50, 0, "Delete", "Values", "delete "+path(0), "Delete the given property (Caution: you need to provide keys as you can't delete the root)", "Delete");

keyPath();
AddAction(55, 0, "Clear", "Values", "clear "+path(0), "Clear the given object/array (if a non object/array is provided, it is deleted)", "Clear");


AddStringParam("JSON", "Load any JSON string");
keyPath();
AddAction(60, 0, "LoadJSON", "Load", "Load JSON {0} at "+path(1), "Load a JSON at the given property", "LoadJSON");

AddAction(100, 0, "LogData", "Log", "LogData", "Log the whole JSON object", "LogData");


keyPath();
AddAction(200, 0, "Set Current Path", "Path", "Set Current Path to "+path(0), "Set the object's current relative path", "SetCurrentPath");

AddStringParam("Node", "Node to push");
AddAction(210, 0, "Push Path Node", "Path", "Push {0} to the path", "Push a new node to the object's current relative path", "PushPathNode");

AddAction(220, 0, "Pop Path Node", "Path", "Pop a node from the path", "Pop the last node from the object's current relative path (do nothing if the path is empty)", "PopPathNode");


AddStringParam("Reference name", "Name under which you save the reference");
keyPath();
AddAction(300, 0, "Save Reference", "Shared Reference", "Save at {0} reference to "+path(1), "Save the reference using a key", "SaveReference");

AddStringParam("Reference name", "Name you used when you savec the reference");
keyPath();
AddAction(310, 0, "Load Reference", "Shared Reference", "Load reference {0} in "+path(1), "Load a previously save reference at the given path", "LoadReference");

AddStringParam("Reference name", "Name you used when you save the reference");
AddAction(320, 0, "Delete Reference", "Shared Reference", "Delete reference {0}", "Delete a previously save reference", "DeleteReference");


AddAction(330, 0, "Delete all references", "Shared Reference", "Delete all references", "Delete all save references", "DeleteAllReferences");


////////////////////////////////////////
// Expressions

// AddExpression(id,			// any positive integer to uniquely identify this expression
//				 flags,			// (see docs) ef_none, ef_deprecated, ef_return_number, ef_return_string,
//								// ef_return_any, ef_variadic_parameters (one return flag must be specified)
//				 list_name,		// currently ignored, but set as if appeared in event wizard
//				 category,		// category in expressions panel
//				 exp_name,		// the expression name after the dot, e.g. "foo" for "myobject.foo" - also the runtime function name
//				 description);	// description in expressions panel

// example
expKeyPath();
AddExpression(0, ef_deprecated | ef_return_number | ef_variadic_parameters, "Length", "Getter", "Length", "Return the length of the array at the property (0 if empty or not array).");

expKeyPath();
AddExpression(1, ef_return_number | ef_variadic_parameters, "Size", "Getter", "Size", "Return the size of the array/object at the property (-1 if not an array/object).");

expKeyPath();
AddExpression(10, ef_return_any | ef_variadic_parameters, "Value", "Getter", "Value", "Return the value at the property (Construct2 only supports strings and numbers, so false -> 0, true -> 1, object -> \"object\", array -> \"array\". the last two will trigger a warning in the console).");

expKeyPath();
AddExpression(20, ef_deprecated | ef_return_string | ef_variadic_parameters, "ToJson", "JSON", "ToJson", "Return the content of the property as a JSON string.");
expKeyPath();
AddExpression(21, ef_return_string | ef_variadic_parameters, "AsJson", "JSON", "AsJson", "Return the content of the property as a JSON string.");

expKeyPath();
AddExpression(30, ef_return_string | ef_variadic_parameters, "TypeOf", "Getter", "TypeOf", "Return the type of the property.");

// loops
AddExpression(100, ef_return_any, "Current Key", "Loop", "CurrentKey", "Get the current property of an object in a for each property loop.");
AddExpression(110, ef_return_any, "Current Value", "Loop", "CurrentValue", "Get the current value of an object's property in a for each property loop. (Construct2 only supports strings and numbers, so false -> 0, true -> 1, object -> \"object\", array -> \"array\". the last two will trigger a warning in the console).");

////////////////////////////////////////
ACESDone();

////////////////////////////////////////
// Array of property grid properties for this plugin
// new cr.Property(ept_integer,		name,	initial_value,	description)		// an integer value
// new cr.Property(ept_float,		name,	initial_value,	description)		// a float value
// new cr.Property(ept_text,		name,	initial_value,	description)		// a string
// new cr.Property(ept_color,		name,	initial_value,	description)		// a color dropdown
// new cr.Property(ept_font,		name,	"Arial,-16", 	description)		// a font with the given face name and size
// new cr.Property(ept_combo,		name,	"Item 1",		description, "Item 1|Item 2|Item 3")	// a dropdown list (initial_value is string of initially selected item)
// new cr.Property(ept_link,		name,	link_text,		description, "firstonly")		// has no associated value; simply calls "OnPropertyChanged" on click

var property_list = [];
	
// Called by IDE when a new object type is to be created
function CreateIDEObjectType()
{
	return new IDEObjectType();
}

// Class representing an object type in the IDE
function IDEObjectType()
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
}

// Called by IDE when a new object instance of this type is to be created
IDEObjectType.prototype.CreateInstance = function(instance)
{
	return new IDEInstance(instance);
}

// Class representing an individual instance of an object in the IDE
function IDEInstance(instance, type)
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
	
	// Save the constructor parameters
	this.instance = instance;
	this.type = type;
	
	// Set the default property values from the property table
	this.properties = {};
	
	for (var i = 0; i < property_list.length; i++)
		this.properties[property_list[i].name] = property_list[i].initial_value;
		
	// Plugin-specific variables
	// this.myValue = 0...
}

// Called when inserted via Insert Object Dialog for the first time
IDEInstance.prototype.OnInserted = function()
{
}

// Called when double clicked in layout
IDEInstance.prototype.OnDoubleClicked = function()
{
}

// Called after a property has been changed in the properties bar
IDEInstance.prototype.OnPropertyChanged = function(property_name)
{
}

// For rendered objects to load fonts or textures
IDEInstance.prototype.OnRendererInit = function(renderer)
{
}

// Called to draw self in the editor if a layout object
IDEInstance.prototype.Draw = function(renderer)
{
}

// For rendered objects to release fonts or textures
IDEInstance.prototype.OnRendererReleased = function(renderer)
{
}