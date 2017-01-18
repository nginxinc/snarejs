const beautify = require('js-beautify').js_beautify;
const expect = require('chai').expect;

export function expectToJS(code, expected) {
	expect(
		beautify(code)
	).to.eql(
		beautify(expected)
	);
}
