import * as t from 'babel-types';
import { parse } from 'babylon';

import {
	getMethodAndContextFromMemberExpression,
	getFunctionFromBinding
} from './utils';

const CATCH_RE = /^([a-z0-9.]+)\(\)$/i;

const GLOBAL_HELPER_AST = parse(`
	var __g__ = Function('return this')();
`);

export const DEFAULT_MEMBER = '__DEFAULT_MEMBER__';

export default class InjectionVisitor {
	constructor(exportsToFind) {
		this.exportsToFind = (() => {
			const result = {};

			exportsToFind.forEach(action => {
				result[action.member] = action;
			});

			return result;
		})();

		this.helperInjected = false;

		this.AssignmentExpression = this.AssignmentExpression.bind(this);
		this.ExportDefaultDeclaration = this.ExportDefaultDeclaration.bind(this);
		this.ExportNamedDeclaration = this.ExportNamedDeclaration.bind(this);

		this.getVisitor = this.getVisitor.bind(this);
	}

	getVisitor() {
		return {
			AssignmentExpression: this.AssignmentExpression,
			ExportDefaultDeclaration: this.ExportDefaultDeclaration,
			ExportNamedDeclaration: this.ExportNamedDeclaration
		};
	}

	injectHelper(path) {
		if (this.helperInjected === true) {
			return;
		}

		path.findParent(node => t.isProgram(node)).unshiftContainer('body',
			GLOBAL_HELPER_AST
		);

		this.helperInjected = true;
	}

	replaceInFunction(path, { file, actions, member }) {
		const toCatch = {};

		actions.forEach(action => {
			const funcName = action.toCatch.match(CATCH_RE)[1];
			toCatch[funcName] = action.toCatch;
		});

		path.traverse({
			CallExpression: path => {
				const callee = path.get('callee');
				let name;
				let context = null;

				if (callee.isMemberExpression()) {
					const { context: _context, methodName } = getMethodAndContextFromMemberExpression(callee);

					name = `${_context}.${methodName}`;
					context = _context;
				} else {
					name = callee.node.name;
				}

				if (name in toCatch) {
					this.injectHelper(path);

					const args = path.node.arguments;

					args.unshift(
						t.objectExpression(
							[
								t.objectProperty(
									t.identifier('fn'),
									t.identifier(name)
								),

								t.objectProperty(
									t.identifier('context'),
									context ?
										t.identifier(context) :
										t.nullLiteral()
								),

								t.objectProperty(
									t.identifier('path'),
									t.stringLiteral(`${file}/${member}/${toCatch[name]}`)
								)
							]
						)
					);

					path.replaceWith(
						t.callExpression(
							t.memberExpression(
								t.identifier('__g__.__SNARE__'),
								t.identifier('handleCall')
							), []
						)
					);

					path.node.arguments = args;
				}
			}
		});
	}

	resolveCommonJSExports(path) {
		if (path.isFunction() && this.exportsToFind[DEFAULT_MEMBER]) {
			this.replaceInFunction(
				path,
				this.exportsToFind[DEFAULT_MEMBER]
			);

			path.skip();
			return;
		}

		path.traverse({
			'ObjectProperty|ObjectMethod': path => {
				const exportName = path.node.key.name;
				let where = null;

				if (this.exportsToFind[exportName]) {
					if (path.isObjectMethod()) {
						where = path;
					} else {
						const value = path.get('value');

						if (value.isFunction()) {
							where = value;
						} else if (value.isIdentifier()) {
							where = getFunctionFromBinding(path, value.node.name);
						}
					}

					this.replaceInFunction(where, this.exportsToFind[exportName]);
				}

				path.skip();
			}
		});
	}

	AssignmentExpression(path) {
		if (
			path.node.operator === '=' &&
			path.get('left').isMemberExpression() &&
			path.node.left.object.name === 'module' &&
			path.node.left.property.name === 'exports'
		) {
			const right = path.get('right');

			if (right.isObjectExpression() || right.isFunction()) {
				this.resolveCommonJSExports(right);
			} else if(right.isIdentifier()) {
				this.resolveCommonJSExports(
					right.scope.getBinding(right.node.name).path
				);
			}
		}

		path.skip();
	}

	ExportDefaultDeclaration(path) {
		const declaration = path.get('declaration');
		let where = null;

		if (declaration.isFunction()) {
			where = declaration;
		} else if (declaration.isIdentifier()) {
			where = getFunctionFromBinding(declaration, declaration.node.name);
		}

		if (where) {
			this.replaceInFunction(where, this.exportsToFind[DEFAULT_MEMBER]);
		}
	}

	ExportNamedDeclaration(path) {
		const declaration = path.get('declaration');
		let exportName;

		if (declaration.isFunction()) {
			exportName = declaration.get('id').node.name;
		} else if (declaration.isVariableDeclaration()) {
			exportName = declaration.get('declarations.0.id').node.name;
		}

		if (this.exportsToFind[exportName]) {
			this.replaceInFunction(declaration, this.exportsToFind[exportName]);
		}
	}
}
