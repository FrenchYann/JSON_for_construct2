JSON for construct2
===================

[DOWNLOAD latest version (1.2)](https://app.box.com/s/7n5wr49becx5j7gykvvm6pqbok2tlfmq)

Earlier versions:
- [v1.1](https://app.box.com/s/fo3feppn7ghbqtvj4lue)
- [v1.0](https://app.box.com/s/7omvusf8kjiow1j7um3v)

This plugin started as a way to load, inspect and modify any valid JSON  
But really... it allows you to manipulate any kind of collection of data.  
You don't necessarily need to import or export JSON, you can directly create and edit datas at runtime.


1 - Design specificities
------------------------

All Conditions, Actions and Expressions accept at least an Origin and a Path parameter.

The Origin can be either:
- **root**: meaning from the base of the object
- **current**: from the current path that is either automatically set by the `For each property` condition, or set using the `Set Current Path` action
this allows you to be more concise and also some kind of recursion (to inspect an unknown JSON for instance)

The path parameter is used to travel through your object (a bit like an URL).
For example, if you have the following structure:
```JSON
{
   "Wizard": {
        "stats": {
            "hp":80,
            "mp":120,
            "str":2,
            "dex":2,
            "int":16
        },
       "spells": [
            "Fireball",
            "Poison",
            "Meteor",
            "Ice Storm"
        ]
    }
}
```

You can set the hp of the Wizard property like this:
```glsl
+ Function | On "setWizardHp"
   -> JSON| Set 100 at root@"Wizard","stat","hp"
```
You would build this path the same way you add parameters to a function in the Function plugin

A little important note, In most expressions, you have to use **0** or **1** as first parameter. 
- 0 stands for root
- 1 for current.

`JSON.Value` is an expression which returns the value at the given path.  
To display the hp of a Wizard, you can do something like:
```glsl
+ Function | On "displayWizardHp"
   -> Text | Set text to JSON.Value(0,"Wizard","stat","hp")
```

This design allows you also to export from and import into any part of your object. For example, if you have different sources of JSON file, you could build an array (`[]`) or a dictionnary (`{}`) of those inside one JSON object.

Let say you have a list of typical RPG classes and jobs with some default parameters
You can easily build a new character by copying those default parameters this way
```glsl
// example use: Function | Call "buildCharacter" ("Rincewind", "Wizard", "Guide")
+ Function | On "buildCharacter"
   // use local variables for readability
   Local text name = ""
   Local text class = ""
   Local text job = ""
   -> System | Set name to Function.Param(0)
   -> System | Set class to Function.Param(1)
   -> System | Set job to Function.Param(2)
   // construct and fill the object
   -> JSON_character | new Object at root@
   // set the name ("Rincewind" in the example)
   -> JSON_character | Set name at root@"name"
   // copy the class' default parameters ("Wizard" in the example)
   -> JSON_character | Load JSON_classes.AsJson(0, class) at root@"class"
   // copy the job's default parameters ("Guide" in the example)  
   -> JSON_character | Load JSON_jobs.AsJson(0, job) at root@"job" 
```

### What's new in version 1.2 ?

#### Shared Reference

Starting from version 1.2 a **Shared Reference** system as been added.  
What it allows you to do is directly save and load the underlying object from and to another JSON object or instances or even into another path of the same object.  
The major advantage is that you can then create datastructures with circular references from simple Ring lists to more complex Cyclic Graphs.
Those shared references are thought as temporary, I don't think it would be a good idea to keep them hanging. You should delete them as soon as you've loaded them.

To enforce this, any reference from an object will disappear once the instance from which you created them is destroyed. And also, Shared references aren't saved by Construct2

Circular datastructures can be saved and reloaded thanks to this tool https://github.com/WebReflection/circular-json .  
However, Links between two different instances will be lost.

Those little drawbacks and inconsistencies were the reason I wasn't sure about releasing this feature.

#### Push/Pop Path Node
Now you can more easily manipulate the Current Path of your object by manipulating it like a stack. You can push a new adress and pop the last pushed address.

Let say you have a linked list like:
```JSON
{
   "value": "a",
   "next" : {
      "value": "b",
      "next":{
         "value": "c",
         "next":{
            "next":null
         }
      }
   }
}
```
You can do something like
```glsl
+ Function | On "addToList"
   // make sure we are at the begining
   + JSON | Set Current Path to root@
   // we go down the list
   + System | While
   + JSON | X current@"next" is null
      -> JSON | Push "next" to the path
   // we reached the tail, we insert the new item
   + JSON | new Object at current@
   + JSON | set Function.Param(0) at current@"value"
   + JSON | set null at current@"next"
   // clean up
   + JSON | Set Current Path to root@
```


With that out of the way, let's list all we can do with the plugin.

2 - ACE
------------------------

### Conditions:

####`Is object` - v1.0
Returns true if the value at the given path is an Object (type of value holding key/value pairs like a dictionnary)

####`Is array` - v1.0
Returns true if the value at the given path is an Array (type of value holding a simple list of numerically indexed values)

####`Is boolean` - v1.0
Returns true if the value at the given path is either true of false

####`Is number` - v1.0
Returns true if the value at the given path is a number

####`Is string` - v1.0
Returns true if the value at the given path is a string

####`Is null` - v1.0
Returns true if the value at the given path is null

####`Is undefined` - v1.0
Returns true if the value at the given path doesn't exist

####`Is Empty` - v1.1
Returns true if the value at the given path is empty.
If the value is an object, empty means 0 members
If the value is an array, empty means 0 elements
Otherwise, empty means undefined (i.e. a boolean, a number, a string, or null will be considered not empty)

####`For each property` - v1.0
Loops through the value at the given path. The value should be an object or an array. 
And order cannot be predicted.
However, to loop through arrays it would be better to do something like:
```glsl
+ System | Repeat JSON.Size(0,"my","path") times
  -> Browser | Log in console: JSON.Value(0, "my", "path", loopindex)
```

####`OnJSONParseError` - v1.2
Is triggered if a LoadJSON failed (usually due to ill-formed JSON).

####`ReferenceExists` - v1.2
Return true if the reference exists


###Actions:

####`Set New Object` - v1.0
Creates a new empty object (list of key/value pairs akin to the dictionary) at the given path

####`Set New Array` - v1.0
Creates a new empty array (list of numerically indexed values) at the given path

####`Set Value` - v1.0
Sets a string or number at the given path

####`Set Boolean` - v1.0
Sets true or false at the given path

####`Set null` - v1.0
Sets null at the given path

####`Delete` - v1.0
Deletes the property at the given path (future access will be undefined)

####`Clear` - v1.1 
Clear the object/array at the given path, if the value at the given path is neither an object nor an array, it will be deleted (future access will be undefined)

####`LoadJSON` - v1.0
Loads any kind of JSON string. It will internally build a JSON object from it.

####`Set Current Path` - v1.0
Sets the current relative path of the JSON object. Allows you to use some shortcuts when writing path and to loop through properties recursively.
Example:
```glsl
+ Function | On "displayArray"
   -> JSON | Set Current Path to root@"my","path","to","an","array"
   + System | Repeat JSON.Size(1) times
      -> Text | Append JSON.Value(1,loopindex) & newline
   // clean up
   -> JSON | Set Current Path to root@
```

To list all the values of an array at "my","path","to","an","array
Without using Set Current Path, it would look like this:
```glsl
+ Function | On "displayArray"
   + System | Repeat JSON.Size(0,"my","path","to","an","array") times
      -> Text | Append JSON.Value(0,"my","path","to","an","array",loopindex) & newline
```

####`LogData` - v1.0
That's the only thing without any path property, it allows you to log in the browser's console:
- the entire object
- the current path

####`PushPathNode` - v1.2
Push a new node to the object's current relative path

####`PopPathNode` - v1.2
Pop the last node from the object's current relative path (do nothing if the path is empty)

####`SaveReference` - v1.2
Save the reference using a key

####`LoadReference` - v1.2
Load a previously save reference at the given path

####`DeleteReference` - v1.2
Delete a previously save reference

####`DeleteAllReferences` - v1.2
Delete all save references


###Expressions:

####`Length` - v1.0 - deprecated in v1.1
Returns the Length of the array at the given path. If there's no array at the given path, it returns 0 (maybe should return -1)

####`Size` - v1.1 
Return the size of the array/object at the given path (-1 if not an array/object)
Replace the deprecated Length expression

####`Value` - v1.0 
Returns the value at the given path. 
If the value is:
- a string, it returns the string
- a number, it returns the number
- true, it returns 1, false, it returns 0
- an array, it returns the string "array"
- an object, it returns the string "object"

####`ToJson` - v1.0 - deprecated in v1.1
Replaced by AsJson for coherence

####`AsJson` - v1.1 
Returns a JSON of the data at the given path
To export the entire object as JSON, do
CODE: SELECT ALL
JSON.ToJson(0)

####`TypeOf` - v1.0
Returns a string representing the type of the value at the given path:
- "string" for a string
- "number" for a number
- "boolean" for true/false
- "array" for an array
- "object" for an object
- "null" for a null value
- "undefined" if there's nothing

####`CurrentKey` - v1.0
Returns the current key in a foreach loop. Outside a loop returns an empty string "".

####`CurrentValue` - v1.1 
Returns the current value in a foreach loop. Outside a loop returns "undefined" (probably)


3 - Use Cases:
--------------

###Class mecanism
![class-mechanism-event-sheet](http://yanngranjon.com/static/c2-plugins/proto.png)  

gives you this kind of console output:  
![class-mechanism-console](http://yanngranjon.com/static/c2-plugins/proto-console.png)  

and now (v1.1) in the debugger:  
![class-mechanism-debugger](http://yanngranjon.com/static/c2-plugins/debugger.png)  

[prototype.capx](https://app.box.com/s/1whrtwl9m7oflr0goibe)  

###Inspecting an unknown JSON
[inspection.capx](https://app.box.com/s/fzf0waxeplq8u5iy6l7h)
