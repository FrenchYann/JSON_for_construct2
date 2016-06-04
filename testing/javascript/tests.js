var jsonPlugin, jsonInstance, jsonType;
var acts, cnds, exps;
var ROOT_KEY = "root";
// because it's using a c2's combo box system
// and true is the first value, its index is 0
var TRUE = 0;
var FALSE = 1;

function setUp(assert) {
  /*
  // if I want to have a runtime that looks like a real one :D
  // might be needed for foreach tests
  var project = '{"project": ["New project","Layout 1",[[0,false,false,false,false,false,false,false,false,false]],[["JSON",0,false,[],0,0,null,null,[],true,false,742002815477515,[],null]],[],[["Layout 1",1708,960,false,"Event sheet 1",814700804564770,[["Layer 0",0,695602098528596,true,[255,255,255],false,1,1,1,false,false,1,0,0,[],[]]],[[null,0,0,[],[],[]]],[]]],[["Event sheet 1",[[0,null,false,[false,1,false],745073535256427,[[0,1,null,1,false,false,false,258112817514835,false]],[]]]]],[],"",false,854,480,4,true,true,true,"1.0.0.0",true,false,-1,0,1,false,true,1,true,"New project",0,[]]}';

  var container = document.createElement('div');
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  var runtime = new cr.runtime(canvas);
  runtime.loadProject(JSON.parse(project));
  runtime.layouts[runtime.first_layout].startRunning();
  
  jsonType = runtime.types["JSON"];
  jsonPlugin = jsonType.plugin;
  //*/

  jsonPlugin = new cr.plugins_.JSON(cr.createRuntime());
  if(jsonPlugin.onCreate) jsonPlugin.onCreate();
  cr.seal(jsonPlugin);

  jsonType = new jsonPlugin.Type(jsonPlugin);
  jsonType.onCreate(); 
  cr.seal(jsonType);

  jsonInstance = new jsonPlugin.Instance(jsonType);
  jsonInstance.onCreate();
  cr.seal(jsonInstance);
  
  cnds = {};
  for(var cnd in jsonPlugin.cnds) {
    if (typeof jsonPlugin.cnds[cnd] === "function") {
      cnds[cnd] = (function(cnd){
        return function() {
          return jsonPlugin.cnds[cnd].apply(jsonInstance,arguments);        
        };
      })(cnd);
    }
  }
  acts = {};
  for(var act in jsonPlugin.acts) {
    if (typeof jsonPlugin.acts[act] === "function"){
      acts[act] = (function(act){
        return function() {
          jsonPlugin.acts[act].apply(jsonInstance,arguments);        
        };
      })(act);
    }
  }
  exps = {};
  for(var exp in jsonPlugin.exps) {
    if (typeof jsonPlugin.exps[exp] === "function"){
      exps[exp] = (function(exp){
        return function() {
          jsonPlugin.exps[exp].apply(jsonInstance,arguments);        
        };
      })(exp);
    }
  }
}

function tearDown(assert) {
  jsonPlugin = null;
  jsonType = null;
  jsonInstance = null;
  cnds = null;
  acts = null;
  exps = null;
}


// utilities
function setObjectAtRoot()      {acts.NewObject(0,[]);}
function setArrayAtRoot()       {acts.NewArray(0,[]);}
function setNumberAtRoot()      {acts.SetValue(0, 0,[]);}
function setStringAtRoot()      {acts.SetValue("abc", 0,[]);}
function setBooleanAtRoot(bool) {acts.SetBoolean(bool ? TRUE:FALSE, 0,[]);}
function setTrueAtRoot()        {setBooleanAtRoot(true);}
function setFalseAtRoot()       {setBooleanAtRoot(false);}
function setNullAtRoot()        {acts.SetNull(0,[]);}

function createPath(rel, path){
  if (path.length > 0) {
    acts.NewObject(rel, []);
  }
  for(var i = 1; i < path.length; i++) {
    acts.NewObject(rel, path.slice(0, i));
  }
}

function createAndSetCurrentPath(path) {createPath(0, path); acts.SetCurrentPath(0, path);}

function setObjectAtPath(rel, path)        {createPath(rel, path); acts.NewObject(rel,path);}
function setArrayAtPath(rel, path)         {createPath(rel, path); acts.NewArray(rel,path);}
function setNumberAtPath(rel, path)        {createPath(rel, path); acts.SetValue(0,rel,path);}
function setStringAtPath(rel, path)        {createPath(rel, path); acts.SetValue("abc",rel,path);}
function setTrueAtPath(rel, path)          {createPath(rel, path); acts.SetBoolean(TRUE,rel,path);}
function setFalseAtPath(rel, path)         {createPath(rel, path); acts.SetBoolean(FALSE,rel,path);}
function setNullAtPath(rel, path)          {createPath(rel, path); acts.SetNull(rel,path);}



// types: object, array, number, string, boolean, null
QUnit.module( "conditions", {
  beforeEach: setUp, 
  afterEach:tearDown
});
// OnJSONParseError
QUnit.test("OnJSONParseError_InvalidJson_CallIt", function(assert) {
  assert.expect(1);

  var original_trigger = jsonType.runtime.trigger;
  jsonType.runtime.trigger = function() {
    assert.strictEqual(arguments[0], jsonPlugin.cnds.OnJSONParseError);
    original_trigger.call(this, arguments)
  }
  acts.LoadJSON("bad",0, []);
});

var relativeCases = [
  {title:"AbsolutePath", isRelative: 0, curPath: [] },
  {title:"RelativePath", isRelative: 1, curPath: ["rel","at","ive"] }
];
var pathCases = [
  {title:"_EmptyPath",   path:[]},
  {title:"_ShallowPath", path:["a"]},
  {title:"_DeepPath",    path:["a","b","c"]},
];


// IsObject
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnFalse", func:createPath,      expected:false},
    {title:"_Object_ReturnTrue",     func:setObjectAtPath, expected:true},
    {title:"_Array_ReturnFalse",     func:setArrayAtPath,  expected:false},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsObject ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsObject(testCase.isRelative, testCase.path), testCase.expected);
});


// IsArray
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnFalse", func:createPath,      expected:false},
    {title:"_Object_ReturnFalse",    func:setObjectAtPath, expected:false},
    {title:"_Array_ReturnTrue",      func:setArrayAtPath,  expected:true},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsArray ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsArray(testCase.isRelative, testCase.path), testCase.expected);
});

// IsBoolean
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnFalse", func:createPath,      expected:false},
    {title:"_Object_ReturnFalse",    func:setObjectAtPath, expected:false},
    {title:"_Array_ReturnFalse",     func:setArrayAtPath,  expected:false},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnTrue",       func:setTrueAtPath,   expected:true},
    {title:"_False_ReturnTrue",      func:setFalseAtPath,  expected:true},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsBoolean ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsBoolean(testCase.isRelative, testCase.path), testCase.expected);
});

// IsNumber
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnFalse", func:createPath,      expected:false},
    {title:"_Object_ReturnFalse",    func:setObjectAtPath, expected:false},
    {title:"_Array_ReturnFalse",     func:setArrayAtPath,  expected:false},
    {title:"_Number_ReturnTrue",     func:setNumberAtPath, expected:true},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsNumber ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsNumber(testCase.isRelative, testCase.path), testCase.expected);
});

// IsString
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnFalse", func:createPath,      expected:false},
    {title:"_Object_ReturnFalse",    func:setObjectAtPath, expected:false},
    {title:"_Array_ReturnFalse",     func:setArrayAtPath,  expected:false},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnTrue",     func:setStringAtPath, expected:true},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsString ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsString(testCase.isRelative, testCase.path), testCase.expected);
});

// IsNull
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnFalse", func:createPath,      expected:false},
    {title:"_Object_ReturnFalse",    func:setObjectAtPath, expected:false},
    {title:"_Array_ReturnFalse",     func:setArrayAtPath,  expected:false},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnTrue",       func:setNullAtPath,   expected:true}
  ])
  .test("IsNull ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsNull(testCase.isRelative, testCase.path), testCase.expected);
});
// IsUndefined
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnTrue",  func:createPath,      expected:true},
    {title:"_Object_ReturnFalse",    func:setObjectAtPath, expected:false},
    {title:"_Array_ReturnFalse",     func:setArrayAtPath,  expected:false},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsUndefined ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsUndefined(testCase.isRelative, testCase.path), testCase.expected);
});
// IsEmpty
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Undefined_ReturnTrue",  func:createPath,      expected:true},
    {title:"_Object_ReturnTrue",     func:setObjectAtPath, expected:true},
    {title:"_Array_ReturnTrue",     func:setArrayAtPath,  expected:true},
    {title:"_Number_ReturnFalse",    func:setNumberAtPath, expected:false},
    {title:"_String_ReturnFalse",    func:setStringAtPath, expected:false},
    {title:"_True_ReturnFalse",      func:setTrueAtPath,   expected:false},
    {title:"_False_ReturnFalse",     func:setFalseAtPath,  expected:false},
    {title:"_Null_ReturnFalse",      func:setNullAtPath,   expected:false}
  ])
  .test("IsEmpty ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    assert.strictEqual(cnds.IsEmpty(testCase.isRelative, testCase.path), testCase.expected);
});

// ForEachProperty


QUnit.module( "actions", {
  beforeEach: setUp, 
  afterEach:tearDown
});

// NewObject
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .test("NewObject_Created ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    acts.NewObject(testCase.isRelative, testCase.path);
    assert.deepEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), {});
});

// NewArray
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .test("NewArray_Created ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    acts.NewArray(testCase.isRelative, testCase.path);
    assert.deepEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), []);
});

// SetValue
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Number", value:0},
    {title:"_String", value:"abc"},
  ])
  .test("SetValue_Created ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    acts.SetValue(testCase.value, testCase.isRelative, testCase.path);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), testCase.value);
});

// SetBoolean
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_True", value:TRUE, expected: true},
    {title:"_False", value:FALSE, expected: false},
  ])
  .test("SetBoolean_Created ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    acts.SetBoolean(testCase.value, testCase.isRelative, testCase.path);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), testCase.expected);
});

// SetNull
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .test("SetNull_Created ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    acts.SetNull(testCase.isRelative, testCase.path);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), null);
});

// Delete
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
      {title:"Undefined", func:createPath      },
      {title:"Object",    func:setObjectAtPath},
      {title:"Array",     func:setArrayAtPath},
      {title:"Number",    func:setNumberAtPath},
      {title:"String",    func:setStringAtPath},
      {title:"True",      func:setTrueAtPath},
      {title:"False",     func:setFalseAtPath},
      {title:"Null",      func:setNullAtPath}
  ])
  .test("Delete_SetUndefinedAtPath ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    acts.Delete(testCase.isRelative, testCase.path);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), undefined);
  });

// Clear
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
      {title:"Object_ClearToEmptyObject", func:setObjectAtPath, expected: {}},
      {title:"Array_ClearToEmptyArray",   func:setArrayAtPath,  expected: []},
      {title:"Number_ClearToUndefined",   func:setNumberAtPath, expected: undefined},
      {title:"String_ClearToUndefined",   func:setStringAtPath, expected: undefined},
      {title:"True_ClearToUndefined",     func:setTrueAtPath,   expected: undefined},
      {title:"False_ClearToUndefined",    func:setFalseAtPath,  expected: undefined},
      {title:"Null_ClearToUndefined",     func:setNullAtPath,   expected: undefined}
  ])
  .test("Clear_ ", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    testCase.func(testCase.isRelative, testCase.path);
    acts.Clear(testCase.isRelative, testCase.path);
    assert.deepEqual(jsonInstance.getValueFromPath(testCase.isRelative === 1, testCase.path), testCase.expected);
  });

// LoadJSON
QUnit.test("LoadJSON_AtRoot_SameObjAtRoot", function(assert) {
  var obj = {"key1":"value1", "key2": [0,1,2], "number": 0, "string":"abc", "boolean":true, "null": null};
  acts.LoadJSON(JSON.stringify(obj), 0, []);
  assert.deepEqual(jsonInstance.data[ROOT_KEY], obj);
});
// LogData
// SetCurrentPath
QUnit.test("SetCurrentPath_AtRoot_EmptyPath", function(assert) {
  acts.SetCurrentPath(0, []);
  assert.deepEqual(jsonInstance.curPath, []);
});
// SaveReference
QUnit.test("SaveReference_AtRoot_ReferenceSaved", function(assert) {
  var obj = {"key1":"value1", "key2":"value2"};
  acts.LoadJSON(JSON.stringify(obj), 0, []);
  acts.SaveReference("saved", 0, []);
  assert.deepEqual(jsonType.references["saved"].value, obj);
});
// LoadReference
QUnit.test("LoadReference_AtRoot_ReferenceLoaded", function(assert) {
  var obj = {"key1":"value1", "key2":"value2"};
  acts.LoadJSON(JSON.stringify(obj), 0, []);
  acts.SaveReference("saved", 0, []);
  acts.Delete(0,[]);
  acts.LoadReference("saved", 0, []);
  assert.deepEqual(jsonInstance.data[ROOT_KEY], obj);
});
// DeleteReference
QUnit.test("DeleteReference_AtRoot_ReferenceDeleted", function(assert) {
  var obj = {"key1":"value1", "key2":"value2"};
  acts.LoadJSON(JSON.stringify(obj), 0, []);
  acts.SaveReference("saved", 0, []);
  acts.DeleteReference("saved");
  assert.strictEqual(jsonType.references["saved"], undefined);
});


QUnit.module("expressions", {
  beforeEach: setUp, 
  afterEach:tearDown
});

// Length
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Nothing_ReturnsMinusOne",     value:undefined,     expected: -1},
    {title:"_EmptyArray_ReturnsZero",      value:[],            expected:  0},
    {title:"_NonEmptyArray_ReturnsLength", value:['a','b','c'], expected:  3},
    {title:"_Object_ReturnsMinusOne",      value:{},            expected: -1},
    {title:"_Number_ReturnsMinusOne",      value:0,             expected: -1},
    {title:"_String_ReturnsMinusOne",      value:'abc',         expected: -1},
    {title:"_True_ReturnsMinusOne",        value:true,          expected: -1},
    {title:"_False_ReturnsMinusOne",       value:false,         expected: -1},
    {title:"_Null_ReturnsMinusOne",        value:null,          expected: -1},
  ])
  .test("Length ",function(testCase, assert){
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    jsonInstance.setValueFromPath(testCase.isRelative === 1, testCase.path, testCase.value);
    var ret = new cr.expvalue();
    exps.Length.apply(exps, [ret, testCase.isRelative].concat(testCase.path)); 
    assert.strictEqual(ret.data, testCase.expected);
  });

// Size
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Nothing_ReturnsMinusOne",        value:undefined,            expected: -1},
    {title:"_EmptyArray_ReturnsZero",         value:[],                   expected:  0},
    {title:"_NonEmptyArray_ReturnsLength",    value:['a','b','c'],        expected:  3},
    {title:"_EmptyObject_ReturnsMinusOne",    value:{},                   expected:  0},
    {title:"_NonEmptyObject_ReturnsMinusOne", value:{'a':true, 'b':true}, expected:  2},
    {title:"_Number_ReturnsMinusOne",         value:0,                    expected: -1},
    {title:"_String_ReturnsMinusOne",         value:'abc',                expected: -1},
    {title:"_True_ReturnsMinusOne",           value:true,                 expected: -1},
    {title:"_False_ReturnsMinusOne",          value:false,                expected: -1},
    {title:"_Null_ReturnsMinusOne",           value:null,                 expected: -1},
  ])
  .test("Size ",function(testCase, assert){
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    jsonInstance.setValueFromPath(testCase.isRelative === 1, testCase.path, testCase.value);
    var ret = new cr.expvalue();
    exps.Size.apply(exps, [ret, testCase.isRelative].concat(testCase.path)); 
    assert.strictEqual(ret.data, testCase.expected);
  });
// Value
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Nothing_ReturnsUndefined",     value:undefined,            expected: "undefined"},
    {title:"_EmptyArray_ReturnsArray",      value:[],                   expected: "array"},
    {title:"_NonEmptyArray_ReturnsArray",   value:['a','b','c'],        expected: "array"},
    {title:"_EmptyObject_ReturnsObject",    value:{},                   expected: "object"},
    {title:"_NonEmptyObject_ReturnsObject", value:{'a':true, 'b':true}, expected: "object"},
    {title:"_Number_ReturnsNumber",         value:0,                    expected: 0},
    {title:"_String_ReturnsString",         value:'abc',                expected: "abc"},
    {title:"_True_ReturnsOne",              value:true,                 expected: 1},
    {title:"_False_ReturnsZero",            value:false,                expected: 0},
    {title:"_Null_ReturnsNull",             value:null,                 expected: "null"},
  ])
  .test("Value ",function(testCase, assert){
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    jsonInstance.setValueFromPath(testCase.isRelative === 1, testCase.path, testCase.value);
    var ret = new cr.expvalue();
    exps.Value.apply(exps, [ret, testCase.isRelative].concat(testCase.path)); 
    assert.strictEqual(ret.data, testCase.expected);
  });
// ToJson [deprecated]
// AsJson
QUnit.test("AsJson_EmptyRoot_ReturnsZero", function(assert) {
  var ret = new cr.expvalue();
  exps.AsJson(ret, 0);
  assert.strictEqual(ret.data, "undefined");
});
// TypeOf
QUnit
  .cases(relativeCases)
  .combinatorial(pathCases)
  .combinatorial([
    {title:"_Nothing_ReturnsUndefined",     value:undefined,            expected: "undefined"},
    {title:"_EmptyArray_ReturnsArray",      value:[],                   expected: "array"},
    {title:"_NonEmptyArray_ReturnsArray",   value:['a','b','c'],        expected: "array"},
    {title:"_EmptyObject_ReturnsObject",    value:{},                   expected: "object"},
    {title:"_NonEmptyObject_ReturnsObject", value:{'a':true, 'b':true}, expected: "object"},
    {title:"_Number_ReturnsNumber",         value:0,                    expected: "number"},
    {title:"_String_ReturnsString",         value:'abc',                expected: "string"},
    {title:"_True_ReturnsOne",              value:true,                 expected: "boolean"},
    {title:"_False_ReturnsZero",            value:false,                expected: "boolean"},
    {title:"_Null_ReturnsNull",             value:null,                 expected: "null"},
  ])
  .test("TypeOf ",function(testCase, assert){
    createAndSetCurrentPath(testCase.curPath);
    createPath(testCase.isRelative, testCase.path);
    jsonInstance.setValueFromPath(testCase.isRelative === 1, testCase.path, testCase.value);
    var ret = new cr.expvalue();
    exps.TypeOf.apply(exps, [ret, testCase.isRelative].concat(testCase.path)); 
    assert.strictEqual(ret.data, testCase.expected);
  });
// CurrentKey
QUnit.test("CurrentKey_EmptyRoot_ReturnsEmptyString", function(assert) {
  var ret = new cr.expvalue();
  exps.CurrentKey(ret, 0);
  assert.strictEqual(ret.data, "");
});
// CurrentValue
QUnit.test("CurrentValue_EmptyRoot_ReturnsUndefined", function(assert) {
  var ret = new cr.expvalue();
  exps.CurrentValue(ret, 0);
  assert.strictEqual(ret.data, "undefined");
});



// some internal methods
QUnit.module("internal methods", {
  beforeEach: setUp, 
  afterEach:tearDown
});

// setValueFromPath
QUnit
  .cases([
    {title:"object", value:{}},
    {title:"array", value:[]},
    {title:"string", value:"abc"},
    {title:"number", value:1},
    {title:"true", value:true},
    {title:"false", value:false},
    {title:"null", value:null},
  ])
  .test("setValueFromPath_ValueAtRoot_Set", function(testCase, assert) {
    jsonInstance.setValueFromPath(0, [], testCase.value);
    assert.strictEqual(jsonInstance.data[ROOT_KEY], testCase.value);
  });

QUnit
  .cases([
    {title:"object", value:{}},
    {title:"array", value:[]},
    {title:"string", value:"abc"},
    {title:"number", value:1},
    {title:"true", value:true},
    {title:"false", value:false},
    {title:"null", value:null},
  ])
  .test("setValueFromPath_ValueAtShallowPath_Set", function(testCase, assert) {
    jsonInstance.setValueFromPath(0, [], {});
    jsonInstance.setValueFromPath(0, ["path"], testCase.value);
    assert.strictEqual(jsonInstance.data[ROOT_KEY]["path"], testCase.value);
  });


QUnit
  .cases([
    {title:"object", value:{}},
    {title:"array", value:[]},
    {title:"string", value:"abc"},
    {title:"number", value:1},
    {title:"true", value:true},
    {title:"false", value:false},
    {title:"null", value:null},
  ])
  .test("setValueFromPath_ValueAtDeepObjectPath_Set", function(testCase, assert) {
    jsonInstance.setValueFromPath(0, [], {});
    jsonInstance.setValueFromPath(0, ["very"], {});
    jsonInstance.setValueFromPath(0, ["very", "deep"], {});
    jsonInstance.setValueFromPath(0, ["very", "deep", "path"], testCase.value);
    assert.strictEqual(jsonInstance.data[ROOT_KEY]["very"]["deep"]["path"], testCase.value);
  });
QUnit
  .cases([
    {title:"object", value:{}},
    {title:"array", value:[]},
    {title:"string", value:"abc"},
    {title:"number", value:1},
    {title:"true", value:true},
    {title:"false", value:false},
    {title:"null", value:null},
  ])
  .test("setValueFromPath_ValueAtDeepArrayPath_Set", function(testCase, assert) {
    jsonInstance.setValueFromPath(0, [], []);
    jsonInstance.setValueFromPath(0, [0], []);
    jsonInstance.setValueFromPath(0, [0,0], []);
    jsonInstance.setValueFromPath(0, [0,0,0], testCase.value);
    assert.strictEqual(jsonInstance.data[ROOT_KEY][0][0][0], testCase.value);
  });

// getValueFromPath
QUnit
  .cases(relativeCases)
  .combinatorial([
    {title:"_object", value:{}},
    {title:"_array", value:[]},
    {title:"_string", value:"abc"},
    {title:"_number", value:1},
    {title:"_true", value:true},
    {title:"_false", value:false},
    {title:"_null", value:null},
  ])
  .test("getValueFromPath_ValueAtRoot_ReturnsValue", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    jsonInstance.setValueFromPath(testCase.isRelative, [], testCase.value);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative,[]), testCase.value);
  });

QUnit
  .cases(relativeCases)
  .combinatorial([
    {title:"_object", value:{}},
    {title:"_array", value:[]},
    {title:"_string", value:"abc"},
    {title:"_number", value:1},
    {title:"_true", value:true},
    {title:"_false", value:false},
    {title:"_null", value:null},
  ])
  .test("getValueFromPath_ValueAtShallowPath_ReturnsValue", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    jsonInstance.setValueFromPath(testCase.isRelative, [], {});
    jsonInstance.setValueFromPath(testCase.isRelative, ["path"], testCase.value);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative,["path"]), testCase.value);
  });


QUnit
  .cases(relativeCases)
  .combinatorial([
    {title:"_object", value:{}},
    {title:"_array", value:[]},
    {title:"_string", value:"abc"},
    {title:"_number", value:1},
    {title:"_true", value:true},
    {title:"_false", value:false},
    {title:"_null", value:null},
  ])
  .test("getValueFromPath_ValueAtDeepObjectPath_ReturnsValue", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    jsonInstance.setValueFromPath(testCase.isRelative, [], {});
    jsonInstance.setValueFromPath(testCase.isRelative, ["very"], {});
    jsonInstance.setValueFromPath(testCase.isRelative, ["very", "deep"], {});
    jsonInstance.setValueFromPath(testCase.isRelative, ["very", "deep", "path"], testCase.value);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative,["very", "deep", "path"]), testCase.value);
  });
QUnit
  .cases(relativeCases)
  .combinatorial([
    {title:"_object", value:{}},
    {title:"_array", value:[]},
    {title:"_string", value:"abc"},
    {title:"_number", value:1},
    {title:"_true", value:true},
    {title:"_false", value:false},
    {title:"_null", value:null},
  ])
  .test("getValueFromPath_ValueAtDeepArrayPath_ReturnsValue", function(testCase, assert) {
    createAndSetCurrentPath(testCase.curPath);
    jsonInstance.setValueFromPath(testCase.isRelative, [], []);
    jsonInstance.setValueFromPath(testCase.isRelative, [0], []);
    jsonInstance.setValueFromPath(testCase.isRelative, [0,0], []);
    jsonInstance.setValueFromPath(testCase.isRelative, [0,0,0], testCase.value);
    assert.strictEqual(jsonInstance.getValueFromPath(testCase.isRelative,[0,0,0]), testCase.value);
  });


// Object and Array Manipulation
QUnit.module("Object and Array Manipulation", {
  beforeEach: setUp, 
  afterEach:tearDown
});
QUnit.test("Delete_AtRootAfterAdd_ReducedArray", function(assert){
  setArrayAtRoot();
  acts.SetValue("abc", 0, [0]);
  acts.SetValue("def", 0, [1]);
  acts.Delete(0,[0]);
  assert.deepEqual(jsonInstance.data[ROOT_KEY], ["def"]);
});
QUnit.test("Clear_AtRootAfterAdd_EmptyArray", function(assert){
  setArrayAtRoot();
  acts.SetValue("abc", 0, [0]);
  acts.SetValue("def", 0, [1]);
  acts.Clear(0,[]);
  assert.deepEqual(jsonInstance.data[ROOT_KEY], []);
});
QUnit.test("Delete_AtPathAfterAdd_ReducedArray", function(assert){
  setArrayAtPath(0, ["a","b","c"]);
  acts.SetValue("abc", 0, ["a","b","c", 0]);
  acts.SetValue("def", 0, ["a","b","c", 1]);
  acts.Delete(0,["a","b","c", 0]);
  assert.deepEqual(jsonInstance.data[ROOT_KEY]["a"]["b"]["c"], ["def"]);
});
QUnit.test("Clear_AtPathAfterAdd_EmptyArray", function(assert){
  setArrayAtPath(0, ["a","b","c"]);
  acts.SetValue("abc", 0, ["a","b","c", 0]);
  acts.SetValue("def", 0, ["a","b","c", 1]);
  acts.Clear(0,["a","b","c"]);
  assert.deepEqual(jsonInstance.data[ROOT_KEY]["a"]["b"]["c"], []);
});