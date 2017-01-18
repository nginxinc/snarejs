import filePath from 'path';
import InjectionVisitor, { DEFAULT_MEMBER } from './InjectionVisitor';

const LIB_NAME = 'snarejs';
const METHODS_NAMES = [
	'catchOnce',
	'catchAll',
	'reset'
];

export const REFERENCES_SHARED_STATE = {};

export default function ({ types: t }) {
	function getImportFromBinding(binding) {
		let file = null;
		let member = null;

		if (binding.path.isVariableDeclarator()) {
			// commonjs require()
			// TODO: resolve dynamic require

			binding.path.traverse({
				CallExpression(path) {
					if (path.node.callee.name === 'require') {
						file = path.node.arguments[0].value;

						if (t.isMemberExpression(path.container)) {
							member = path.container.property.name;
						} else if (/* ES6 destruction */path.parentPath.get('id').isObjectPattern()) {
							path.parentPath.get('id.properties').forEach(
								property => {
									if (
										(
											/* var {a} = require('./b'); */
											property.node.shorthand &&
											property.node.key.name === binding.identifier.name
										) || (
											/* var {a: b} = require('./b'); */
											!property.node.shorthand &&
											property.node.value.name === binding.identifier.name
										)
									) {
										member = property.node.key.name;
									}
								}
							);
						} else {
							member = DEFAULT_MEMBER;
						}
					}
				}
			});
		} else if (binding.path.parentPath.isImportDeclaration()) {
			if (binding.path.isImportDefaultSpecifier()) {
				member = DEFAULT_MEMBER;
			} else if (binding.path.isImportSpecifier()) {
				member = binding.path.node.imported.name;
			}

			file = binding.path.parent.source.value;
		}

		if (!file || !member) {
			throw binding.path.buildCodeFrameError('Can\'t get path/member from import/require. Possibly bug in snarejs.');
		}

		return {
			file,
			member
		};
	}

	function processSnareActionByReference(referencePaths, file, member) {
		const actions = [];

		referencePaths.forEach(path => {
			const statementExpression = path.getStatementParent().get('expression');

			if (!statementExpression.get('callee').isMemberExpression()) {
				return;
			}

			const action = statementExpression.get('callee.property').node.name;

			if (METHODS_NAMES.indexOf(action) === -1) {
				throw path.buildCodeFrameError(`Method should be one of ${METHODS_NAMES.join(', ')}, not ${action}`);
			}

			const argument = statementExpression.get('arguments.0');

			if (!argument.isStringLiteral()) {
				throw path.buildCodeFrameError('First argument must be a string');
			}

			// TODO: find toCatch by reference to scope
			// TODO: find toCatch as import {a} from b;

			const toCatch = argument.node.value;

			argument.replaceWith(
				t.stringLiteral(`${file}/${member}/${toCatch}`)
			);

			actions.push({ action, toCatch });
		});

		return actions;
	}

	function findAllReferencesToSnareInScope(path, identifier, folderToResolve) {
		const binding = path.scope.getBinding(identifier);

		return binding.referencePaths.map(path => {
			const instance = path.findParent(node => node.isCallExpression());

			// TODO ; a = snare(b); should not throw exception

			const instanceVariableName = path.findParent(
				node => node.isVariableDeclarator()
			).node.id.name;

			const functionIdentifier = instance.node.arguments[0];

			// if invalid identifier has been passed
			if (!t.isIdentifier(functionIdentifier)) {
				throw path.buildCodeFrameError('valid function identifier should be passed to snare()');
			}

			const functionBinding = instance.scope.getBinding(functionIdentifier.name);
			const snareInstanceBinding = instance.scope.getBinding(instanceVariableName);

			if (!functionBinding) {
				throw path.buildCodeFrameError(
					`can't resolve identifier "${functionIdentifier.name}" passed to snare`
				);
			}

			if (!snareInstanceBinding.referenced) {
				throw path.getStatementParent().buildCodeFrameError(
					'snare has been initialized but has not been referred'
				);
			}

			let { file, member } = getImportFromBinding(functionBinding);

			file = filePath.resolve(folderToResolve, file);

			return {
				member,
				file,
				actions: processSnareActionByReference(snareInstanceBinding.referencePaths, file, member)
			};
		});
	}

	function getReferencesToSnare(path, testFileName) {
		let references = null;
		const folderName = filePath.dirname(testFileName);

		path.traverse({
			ImportDeclaration(path) {
				if (path.node.source.value === LIB_NAME) {
					let identifier;

					path.traverse({
						ImportDefaultSpecifier(path) {
							identifier = path.node.local.name;
							path.stop();
						}
					});

					if (!identifier) {
						throw path.buildCodeFrameError('import identifier was not found');
					}

					references = findAllReferencesToSnareInScope(path, identifier, folderName);
				}
			},

			CallExpression(path) {
				// TODO: do not handle require calls not from top of program
				if (path.node.callee.name === 'require' && path.node.arguments[0].value === LIB_NAME) {
					references = findAllReferencesToSnareInScope(path, path.parent.id.name, folderName);
				}
			}
		});

		return references;
	}

	return {
		visitor: {
			Program(path, plugin) {
				const fileName = plugin.file.opts.filename === 'unknown' ? '' : plugin.file.opts.filename;

				if (REFERENCES_SHARED_STATE[fileName] !== undefined) {
					path.traverse(
						new InjectionVisitor(
							REFERENCES_SHARED_STATE[fileName]
						).getVisitor()
					);
				} else {
					const references = getReferencesToSnare(path, fileName);

					if (references) {
						references.forEach(reference => {
							if (REFERENCES_SHARED_STATE[reference.file]) {
								REFERENCES_SHARED_STATE[reference.file].push(reference);
							} else {
								REFERENCES_SHARED_STATE[reference.file] = [reference];
							}
						});
					}
				}
			}
		}
	};
}
