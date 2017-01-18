export function getMethodAndContextFromMemberExpression(path) {
	const contextParts = [];

	path.traverse({
		MemberExpression(path) {
			contextParts.unshift(path.node.property.name);

			if (path.get('object').isIdentifier()) {
				contextParts.unshift(path.node.object.name);
			}
		}
	});

	return {
		context: contextParts.join('.'),
		methodName: path.node.property.name
	};
}

export function getFunctionFromBinding(path, name) {
	const binding = path.scope.getBinding(name);

	if (!binding) {
		throw path.buildCodeFrameError('Unknown identifier');
	}

	if (binding.path.isVariableDeclarator()) {
		const init = binding.path.get('init');

		if (init.isFunctionExpression()) {
			return init;
		}
	}

	if (!binding.path.isFunction()) {
		throw binding.path.buildCodeFrameError('Identifier is not a function');
	}

	return binding.path;
}
