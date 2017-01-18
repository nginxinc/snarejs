/* eslint-env node, mocha */

import { assert } from 'chai';
import sinon from 'sinon';
import snare from '../src/snare';

const g = Function('return this')();

describe('Snare API', () => {
	const funcToTest = snare(arg => `test${arg}`);

	beforeEach(() => {
		g.__SNARE__._callsToCatch = {};
	});

	it('should run', () => {
		assert.equal(funcToTest(1), `test${1}`);
	});

	it('should create global object __SNARE__', () => {
		assert(typeof global.__SNARE__ === 'object');
	});

	it('result function should has Function proto', () => {
		assert(funcToTest instanceof Function);
	});

	['catchOnce', 'catchAll'].forEach(methodName => {
		it(`.${methodName}()`, () => {
			const fn = function fn() {};

			funcToTest[methodName]('getFive()', fn);

			assert(g.__SNARE__._callsToCatch['getFive()'][0].overrider, fn);
			assert.equal(g.__SNARE__._callsToCatch['getFive()'][0].type, methodName);

			funcToTest[methodName]('getFive()', fn);
			assert.equal(g.__SNARE__._callsToCatch['getFive()'][1].overrider, fn);
		});
	});

	it('.reset()', () => {
		funcToTest.catchOnce('getFive()', () => {});
		funcToTest.catchAll('getFive()', () => {});

		assert(g.__SNARE__._callsToCatch['getFive()'].length == 2);
		funcToTest.reset('getFive()');
		assert(g.__SNARE__._callsToCatch['getFive()'].length == 0);
	});

	describe('.handleCall()', () => {
		const dummy = () => 5;

		const snareInstance = snare(() => {});

		let overrider;

		beforeEach(() => {
			overrider = sinon.stub();
		});

		it('should return value', () => {
			overrider.returns('return');
			snareInstance.catchOnce('./testModule.js/aExported/dummy()', overrider);

			assert(
				g.__SNARE__.handleCall({
					fn: dummy,
					context: null,
					path: './testModule.js/aExported/dummy()'
				}, 'ARG1', 'ARG2') === 'return'
			);
		});

		it('overrider should be called with proper arguments', () => {
			snareInstance.catchOnce('./testModule.js/aExported/dummy()', overrider);

			g.__SNARE__.handleCall({
				fn: dummy,
				context: null,
				path: './testModule.js/aExported/dummy()'
			}, 'ARG1', 'ARG2');

			assert(overrider.calledWithExactly(dummy, 'ARG1', 'ARG2'));
		});

		it('overrider should be called with proper context', () => {
			const context = {};

			snareInstance.catchOnce('./testModule.js/aExported/dummy()', overrider);

			g.__SNARE__.handleCall({
				fn: dummy,
				context,
				path: './testModule.js/aExported/dummy()'
			}, 'ARG1', 'ARG2');

			snareInstance.catchOnce('./testModule.js/aExported/dummy()', function () {
				assert(this === context);
			});
		});

		it('should call original function if has been already caught with .catchOnce()', () => {
			snareInstance.catchOnce('./testModule.js/aExported/dummy()', () => 'overrider');

			const dummy = () => 'dummy';

			assert.equal(g.__SNARE__.handleCall({
				fn: dummy,
				context: null,
				path: './testModule.js/aExported/dummy()'
			}), 'overrider');

			assert.equal(g.__SNARE__.handleCall({
				fn: dummy,
				context: null,
				path: './testModule.js/aExported/dummy()'
			}), 'dummy');
		});

		it('should catch all calls with .catchAll()', () => {
			const tmp = [1, 2, 3];

			snareInstance.catchAll('./testModule.js/aExported/dummy()', () => tmp.shift());

			[1, 2, 3].forEach(callNum => {
				assert.equal(g.__SNARE__.handleCall({
					fn: dummy,
					context: null,
					path: './testModule.js/aExported/dummy()'
				}), callNum);
			});
		});
	});
});
