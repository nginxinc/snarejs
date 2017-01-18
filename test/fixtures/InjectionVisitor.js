module.exports = {
	'should resolve module.exports': {
		input: `
			function asd(){
				b();
				z();
			};

			module.exports = {
				aExported: asd
			};
		`,

		expected: `
			var __g__ = Function('return this')();
			function asd(){
				b();
				__g__.__SNARE__.handleCall({
					fn: z,
					context: null,
					path: "./aModule.js/aExported/z()"
				});
			};

			module.exports = {
				aExported: asd
			};
		`,

		settings: [
			{
				member: 'aExported',
				file: './aModule.js',
				actions: [{
					action: 'catchOnce',
					toCatch: 'z()'
				}]
			}
		]
	},

	'should resolve FNE in module.exports': {
		input: `
			module.exports = {
				aExported: function() {
					z(3);
					b();
				}
			};
		`,

		expected: `
			var __g__ = Function('return this')();
			module.exports = {
				aExported: function() {
					__g__.__SNARE__.handleCall({
						fn: z,
						context: null,
						path: "./aModule.js/aExported/z()"
					}, 3);
					b();
				}
			};
		`,

		settings: [{
			member: 'aExported',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'z()'
			}]
		}]
	},

	'should resolve identifier in module.exports': {
		input: `
			var a = function(){
				zzz(555);
			};

			module.exports = {
				aExportedKey: a
			};
		`,

		expected: `
			var __g__ = Function('return this')();
			var a = function(){
				__g__.__SNARE__.handleCall({
					fn: zzz,
					context: null,
					path: "./aModule.js/aExportedKey/zzz()"
				}, 555);
			};

			module.exports = {
				aExportedKey: a
			};
		`,

		settings: [{
			member: 'aExportedKey',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'zzz()'
			}]
		}]
	},

	'should resolve identifier as module.exports': {
		input: `
			var a = function(){
				zzz(555);
			};

			var api = {
				aExportedKey: a
			};

			module.exports = api;
		`,

		expected: `
			var __g__ = Function('return this')();
			var a = function(){
				__g__.__SNARE__.handleCall({
					fn: zzz,
					context: null,
					path: "./aModule.js/aExportedKey/zzz()"
				}, 555);
			};

			var api = {
				aExportedKey: a
			};

			module.exports = api;
		`,

		settings: [{
			member: 'aExportedKey',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'zzz()'
			}]
		}]
	},

	'should resolve default in module.exports': {
		input: `
			module.exports = function(){
				zzz(555);
			};
		`,

		expected: `
			var __g__ = Function('return this')();
			module.exports = function(){
				__g__.__SNARE__.handleCall({
					fn: zzz,
					context: null,
					path: "./aModule.js/__DEFAULT_MEMBER__/zzz()"
				}, 555);
			};
		`,

		settings: [{
			member: '__DEFAULT_MEMBER__',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'zzz()'
			}]
		}]
	},

	'should resolve ES6 shorthand method definition in module.exports': {
		input: `
			module.exports = {
				aExported(){
					a(55);
				}
			};
		`,

		expected: `
			var __g__ = Function('return this')();
			module.exports = {
				aExported(){
					__g__.__SNARE__.handleCall({
						fn: a,
						context: null,
						path: "./aModule.js/aExported/a()"
					}, 55);
				}
			};
		`,

		settings: [{
			member: 'aExported',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'a()'
			}]
		}]
	},

	'should resolve ES6 export': {
		input: `
			export function aExported(){
				a();
			}

			export function aExported2(){
				a();
			}
		`,

		expected: `
			var __g__ = Function('return this')();

			export function aExported(){
				__g__.__SNARE__.handleCall({
				    fn: a,
				    context: null,
				    path: "./aModule.js/aExported/a()"
				});
			}

			export function aExported2(){
				a();
			}
		`,

		settings: [{
			member: 'aExported',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'a()'
			}]
		}]
	},

	'should resolve ES6 export default': {
		input: `
			export default function(){
				a();
			}
		`,

		expected: `
			var __g__ = Function('return this')();
			export default function(){
				__g__.__SNARE__.handleCall({
				    fn: a,
				    context: null,
				    path: "./aModule.js/__DEFAULT_MEMBER__/a()"
				});
			}
		`,

		settings: [{
			member: '__DEFAULT_MEMBER__',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'a()'
			}]
		}]
	},

	'should resolve ES6 export default identifier': {
		input: `
			function d(){
				a();
			}

			export default d;
		`,

		expected: `
			var __g__ = Function('return this')();

			function d(){
				__g__.__SNARE__.handleCall({
				    fn: a,
				    context: null,
				    path: "./aModule.js/__DEFAULT_MEMBER__/a()"
				});
			}

			export default d;
		`,

		settings: [{
			member: '__DEFAULT_MEMBER__',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'a()'
			}]
		}]
	},

	'should resolve ES6 export with variable declaration': {
		input: `
			export const aExported = () => {
				a();
			};
		`,

		expected: `
			var __g__ = Function('return this')();
			export const aExported = () => {
				__g__.__SNARE__.handleCall({
				    fn: a,
				    context: null,
				    path: "./aModule.js/aExported/a()"
				});
			};
		`,

		settings: [{
			member: 'aExported',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'a()'
			}]
		}]
	},

	'should pass call context to .handleCall()': {
		input: `
			function d(){
				object.a.c.method();
			}

			export default d;
		`,

		expected: `
			var __g__ = Function('return this')();

			function d(){
				__g__.__SNARE__.handleCall({
				    fn: object.a.c.method,
				    context: object.a.c,
				    path: "./aModule.js/__DEFAULT_MEMBER__/object.a.c.method()"
				});
			}

			export default d;
		`,

		settings: [{
			member: '__DEFAULT_MEMBER__',
			file: './aModule.js',
			actions: [{
				action: 'catchOnce',
				toCatch: 'object.a.c.method()'
			}]
		}]
	}
};
