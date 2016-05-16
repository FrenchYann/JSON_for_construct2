JSON_for_construct2
===================
JSON plugin for Construct2

This plugin started as a way to load, inspect and modify any valid JSON  
But really... it allows you to manipulate any kind of collection of data.  
You don't necessarily need to import or export JSON, you can directly create and edit datas in runtime.


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

You can set the hp of the Wizard property like this: `JSON: Set 100 at root@"Wizard","stat","hp"`

You would build this path the same way you add parameters to a function in the Function plugin

A little important note, In an expression, you have to use **0** or **1** as first parameter. 
- 0 stands for root
- 1 for current.

`JSON.Value(0,"Wizard","stat","hp")` Is an expression which returns the the hp of the wizard.

This design allows you also to export from and import into any part of your object. For example, if you have different sources of JSON file, you could build an array (`[]`) or a dictionnary (`{}`) of those inside one JSON object.

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
To loop through arrays you should use something like :
`System: repeat JSON.Size(0,"my","path")`

go through your array using :
`JSON.Value(0,"my","path",loopindex)`


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
```
+ some condition
   -> JSON: Set Current Path to root@"my","path","to","an","array"
   + System: repeat JSON.Size(1)
      -> Text: append JSON.Value(1,loopindex) & newline
```

To list all the values of an array at "my","path","to","an","array
Without using Set Current Path, it would look like this:
```
+ some condition
   + System: repeat JSON.Size(0,"my","path","to","an","array")
      -> Text: append JSON.Value(1,"my","path","to","an","array",loopindex) & newline
```

####`LogData` - v1.0
That's the only thing without any path property, it allows you to log in the browser's console:
- the entire object
- the current path


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
![class-mechanism-event-sheet][class-mechanism-event-sheet]
gives you this kind of console output:  
![class-mechanism-console][class-mechanism-console]
and now (v1.1) in the debugger:  
![class-mechanism-debugger][class-mechanism-debugger]
[prototype.capx]

###Inspecting an unknown JSON
[inspection.capx]


[prototype.capx]: https://app.box.com/s/1whrtwl9m7oflr0goibe
[inspection.capx]: https://app.box.com/s/fzf0waxeplq8u5iy6l7h
[class-mechanism-event-sheet]: https://app.box.com/representation/file_version_18381239541/image_2048/1.png?shared_name=3nhtc4pjep6suvwkio5o
[class-mechanism-console]: https://app.box.com/representation/file_version_18381237557/image_2048/1.png?shared_name=92fcm9uqf1yp9xrcrqxm
[class-mechanism-debugger]: https://app.box.com/representation/file_version_18381235965/image_2048/1.png?shared_name=w6ffnig9nxbltu515kw0
