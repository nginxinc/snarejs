/* eslint-env node, mocha */

import { transform as babelTransform } from 'babel-core';
import tests from './fixtures/InjectionVisitor';
import { expectToJS } from './fixtures/testUtils';
import InjectionVisitor from '../src/InjectionVisitor';

describe('InjectionVisitor', () => {
	function transform(code, visitorSettings) {
		return babelTransform(code,
			{
				babelrc: false,
				plugins: [
					function () {
						return {
							visitor: new InjectionVisitor(visitorSettings).getVisitor()
						};
					}
				]
			}
		);
	}

	Object.keys(tests).forEach(testName => {
		const test = tests[testName];

		it(testName, () => {
			const { code } = transform(test.input, test.settings);
			expectToJS(code, test.expected);
		});
	});
});
