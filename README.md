##Snare

Snare is a Babel plugin that can help you in monkey patching of functions in your tests.


```
npm install snarejs
```


####Initalization

.babelrc 
```
{

	"plugins": [
		"snarejs/lib/plugin"
	]
}
```

###API

```
var snareInstance = snare(fn);
```

First argument is a function where you want to intercept calls of another functions. 
When babel plugin finds the initialization it will resolve passed argument and will find a module where function is declared.
The function can be received in any way what you prefer: ES6, common.js require.

```
let fn = require('./module');
let {fn} = require('./module');
let {anotherName: fn} = require('./module');
let fn = require('./module').anotherName;
import fn from './module';
import {fn} from './module';
import {anotherName as fn} from './module'
```

In any of above cases the plugin searches necessary export in specific module and replaces necessary calls of functions inside.
The exports can be common.js or ES6 too.

```
snareInstance.catchOnce('fnName()', function(fnName, …args){});
snareInstance.catchAll('fnName()', function(fnName, …args){});
```

The first argument is a string with CallExpression that you want to catch and override.
The second argument is the overrider that is called instead of "fnName()".

catchOnce() catches call once. catchAll() catches all calls.

```
snareInstance.reset('fnName()');
```

Cancels interceptions of fnName()
