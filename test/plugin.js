/* eslint-env node, mocha */
import path from 'path';
import { expect } from 'chai';
import { transform as babelTransform } from 'babel-core';
import plugin, { REFERENCES_SHARED_STATE } from '../src/plugin';
import { expectToJS } from './fixtures/testUtils';

describe('Babel plugin', () => {
	const references = REFERENCES_SHARED_STATE;

	function transform(code) {
		return babelTransform(code,
			{
				babelrc: false,
				plugins: [plugin]
			}
		);
	}

	function resolveModule(file) {
		return path.resolve(process.cwd(), file);
	}

	it('should find all references to snare in file', () => {
		const { code } = transform(`
			var testFramework = require('snarejs');
			var a = require('./aModule.js').aMember;
			var b = require('./bModule.js');

			var instance = testFramework(a);
			var instance2 = testFramework(b);

			instance.catchOnce('z()', function(){});
			instance.catchAll('b()', function(){});
			
			instance2.catchOnce('a()', function(){});
		`);

		expectToJS(code, `
			var testFramework = require('snarejs');
			var a = require('./aModule.js').aMember;
			var b = require('./bModule.js');

			var instance = testFramework(a);
			var instance2 = testFramework(b);

			instance.catchOnce('${resolveModule('./aModule.js')}/aMember/z()', function(){});
			instance.catchAll('${resolveModule('./aModule.js')}/aMember/b()', function(){});

			instance2.catchOnce('${resolveModule('./bModule.js')}/__DEFAULT_MEMBER__/a()', function(){});
		`);

		expect(references[resolveModule('./aModule.js')]).to.deep.equal([
			{
				member: 'aMember',
				file: resolveModule('./aModule.js'),
				actions: [
					{
						action: 'catchOnce',
						toCatch: 'z()'
					},
					{
						action: 'catchAll',
						toCatch: 'b()'
					}
				]
			}
		]);

		expect(references[resolveModule('./bModule.js')]).to.deep.equal([
			{
				member: '__DEFAULT_MEMBER__',
				file: resolveModule('./bModule.js'),
				actions: [
					{
						action: 'catchOnce',
						toCatch: 'a()'
					}
				]
			}
		]);
	});

	it('should resolve commonjs require with ES6 destruction', () => {
		let { code } = transform(`
			import snare from 'snarejs';
			const {aFunc}  = require('./c');
			var instance = snare(aFunc);
			instance.catchOnce('z()', function(){});
		`);

		expectToJS(code, `
			import snare from 'snarejs';
			const {aFunc} = require('./c');
			var instance = snare(aFunc);
			instance.catchOnce('${resolveModule('./c')}/aFunc/z()', function(){});
		`);

		expect(references[resolveModule('./c')][0].member).to.eq('aFunc');

		code = transform(`
			import snare from 'snarejs';
			const {aFunc: b, f}  = require('./c');
			var instance = snare(b);
			instance.catchOnce('z()', function(){});
		`).code;

		expectToJS(code, `
			import snare from 'snarejs';
			const {aFunc: b, f}  = require('./c');
			var instance = snare(b);
			instance.catchOnce('${resolveModule('./c')}/aFunc/z()', function(){});
		`);

	});

	it('should resolve ES6 import', () => {
		const { code } = transform(`
			import snare from 'snarejs';
			import a from './a';
			var instance = snare(a);
			instance.catchOnce('z()', function(){});
		`);

		expectToJS(code, `
			import snare from 'snarejs';
			import a from './a';
			var instance = snare(a);
			instance.catchOnce('${resolveModule('./a')}/__DEFAULT_MEMBER__/z()', function(){});
		`);

		const reference = references[resolveModule('./a')][0];
		expect(reference.member).to.eql('__DEFAULT_MEMBER__');
	});

	it('should resolve ES6 import with named member', () => {
		const { code } = transform(`
			import snare from 'snarejs';
			import {aFunc as asd, f} from './b';
			var instance = snare(asd);
			instance.catchOnce('z()', function(){});
		`);

		expectToJS(code, `
			import snare from 'snarejs';
			import {aFunc as asd, f} from './b';
			var instance = snare(asd);
			instance.catchOnce('${resolveModule('./b')}/aFunc/z()', function(){});
		`);

		const reference = references[resolveModule('./b')][0];
		expect(reference.member).to.eql('aFunc');
	});

	it('should die on unknown identifier', () => {
		expect(() => {
			transform(`
				var testFramework = require('snarejs');
				var instance = testFramework(UNKNOWN_IDENTIFIER);
				instance.catchOnce('z()', function(){});
			`);
		}).to.throw('unknown: can\'t resolve identifier "UNKNOWN_IDENTIFIER" passed to snare');
	});

	it('should die on unknown method', () => {
		expect(() => {
			transform(`
				var testFramework = require('snarejs');
				var a = require('./aModule.js');
				var instance = testFramework(a);
				instance.catchOnceUnknownMethod('z()',function(){});
			`);
		}).to.throw('unknown: Method should be one of catchOnce, catchAll, reset, not catchOnceUnknownMethod');
	});

	it('should die if first argument is not string', () => {
		expect(() => {
			transform(`
				var testFramework = require('snarejs');
				var a = require('./aModule.js');
				var instance = testFramework(a);
				instance.catchOnce(function(){});
			`);
		}).to.throw('unknown: First argument must be a string');
	});

	it('should not cause exception when called of decorated function', () => {
		transform(`
			var snarejs = require('snarejs');
			var a = require('./aModule.js');
			var bb = snarejs(a);
			bb();
		`);
	});

	it('should not cause exception when decorated function returns function', () => {
		transform(`
			var snarejs = require('snarejs');
			var a = require('./aModule.js');
			var bb = snarejs(a);
			bb()();
		`);
	});


	it('should pass traversing to InjectorVisitor', () => {
		REFERENCES_SHARED_STATE[''] = [{
			member: '__DEFAULT_MEMBER__',
			file: '',
			actions: [{
				action: 'catchOnce',
				toCatch: 'a()'
			}]
		}];

		const { code } = transform(`
			export default function(){
				a();
			}
		`);

		expectToJS(code, `
			var __g__ = Function('return this')();
			export default function () {
				__g__.__SNARE__.handleCall({
					fn: a,
					context: null,
					path: "/__DEFAULT_MEMBER__/a()"
				});
			}`
		);
	});
});
