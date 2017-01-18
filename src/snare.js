const __g__ = Function('return this')();

if (!__g__.__SNARE__) {
	__g__.__SNARE__ = {
		_callsToCatch: {},

		handleCall({ fn, context, path }, ...args) {
			const interceptors = this._callsToCatch[path];

			if (!interceptors[0]) {
				return fn.apply(context, args);
			}

			const overrider = interceptors[0].overrider;

			if (interceptors[0].type === 'catchOnce') {
				interceptors.shift();
			}

			return overrider.apply(
				context,
				[fn].concat(args)
			);
		}
	};
}

export default function (fn) {
	const proto = {
		reset(path) {
			__g__.__SNARE__._callsToCatch[path] = [];
		}
	};

	const createMethod = methodName => {
		proto[methodName] = (path, overrider) => {
			if (__g__.__SNARE__._callsToCatch[path]) {
				__g__.__SNARE__._callsToCatch[path].push({
					type: methodName,
					overrider
				});
			} else {
				__g__.__SNARE__._callsToCatch[path] = [{
					type: methodName,
					overrider
				}];
			}
		};
	};

	Object.setPrototypeOf(proto, Function.prototype);
	Object.setPrototypeOf(fn, proto);

	createMethod('catchOnce');
	createMethod('catchAll');

	return fn;
}
