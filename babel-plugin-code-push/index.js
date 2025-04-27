const path = require("path");
const fs = require("fs");
const { parseExpression, parse } = require("@babel/parser");

const OPTIONS_TO_BUNDLE = [
  "bundleHost",
  "runtimeVersion",
  "versioning",
];

module.exports = function (babel, options) {
  const { types: t } = babel;
  const configPath =
    options.configPath != null
      ? path.resolve(options.configPath)
      : path.resolve(process.cwd(), "code-push.config.js");

  // Load config and imports from `code-push.config.js`
  const { config, configImports, importedIdentifiers } = loadConfig(
    babel,
    configPath
  );

  return {
    visitor: {
      Program(path) {
        // Track imports in the input file to avoid duplicates
        const existingImports = new Set();
        path.traverse({
          ImportDeclaration(importPath) {
            existingImports.add(importPath.node.source.value);
          },
        });

        // Add missing imports from code-push.config.js to the input file
        configImports.forEach((importNode) => {
          if (!existingImports.has(importNode.source.value)) {
            // Clone the import node from code-push.config.js and add it to the input file
            path.node.body.unshift(t.cloneNode(importNode));
          }
        });
      },
      ImportDeclaration(path, state) {
        if (
          path.node.source.value.includes("@fcg-labs/iolift")
        ) {
          const defaultImport = path.node.specifiers.find((specifier) =>
            t.isImportDefaultSpecifier(specifier)
          );

          // Save the imported name (e.g., "codePush") for later use
          if (defaultImport) {
            state.file.metadata.codePushImportName = defaultImport.local.name;
          }
        }
      },
      CallExpression(path, state) {
        const codePushImportName = state.file.metadata.codePushImportName;
        if (!codePushImportName) return;

        // Check if the current CallExpression is a call to the codePush function
        if (t.isIdentifier(path.node.callee, { name: codePushImportName })) {
          // Create an AST object representation of the configuration options to bundle
          const configObjectExpression = t.objectExpression(
            OPTIONS_TO_BUNDLE.map((key) =>
              t.objectProperty(
                t.identifier(key),
                serializeConfigToNode(babel, importedIdentifiers, config[key])
              )
            )
          );

          // Replace the arguments of codePush with the generated config object
          path.node.arguments = [configObjectExpression];
        }
      },
    },
  };
};

/** loads config file from configPath */
function loadConfig(babel, configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(
      "code-push.config.js not found. Please ensure it exists in the root directory."
    );
  }

  const { types: t } = babel;
  const configModule = require(configPath);

  const configCode = fs.readFileSync(configPath, "utf8");
  const ast = parse(configCode, {
    sourceType: "module",
  });

  // Extract import declarations and track imported identifiers
  const imports = [];
  const importedIdentifiers = new Set();

  const convertRequireIntoImportStatement = (declaration) => {
    const moduleName = declaration.init.arguments[0].value;
    if (t.isIdentifier(declaration.id)) {
      // Case for `const fs = require("fs")`
      return t.importDeclaration(
        [t.importDefaultSpecifier(declaration.id)],
        t.stringLiteral(moduleName)
      );
    } else if (t.isObjectPattern(declaration.id)) {
      // Case for `const { parse } = require("module")`
      const importSpecifiers = declaration.id.properties.map((property) =>
        t.importSpecifier(property.value, property.key)
      );
      return t.importDeclaration(importSpecifiers, t.stringLiteral(moduleName));
    }
  };

  ast.program.body.forEach((node) => {
    if (t.isImportDeclaration(node)) {
      // Handle import statements
      imports.push(node);
      node.specifiers.forEach((specifier) => {
        importedIdentifiers.add(specifier.local.name);
      });
    } else if (t.isVariableDeclaration(node)) {
      // Handle require function
      node.declarations.forEach((declaration) => {
        if (
          t.isCallExpression(declaration.init) &&
          t.isIdentifier(declaration.init.callee, { name: "require" }) &&
          declaration.init.arguments.length === 1 &&
          t.isStringLiteral(declaration.init.arguments[0])
        ) {
          const importDeclaration =
            convertRequireIntoImportStatement(declaration);
          imports.push(importDeclaration);
          declaration.id.properties.forEach((dec) => {
            importedIdentifiers.add(dec.value.name); // Track the imported identifier
          });
        }
      });
    }
  });

  return {
    config: configModule.default || configModule,
    configImports: imports,
    importedIdentifiers,
  };
}

/** Helper to serialize config values to AST nodes */
function serializeConfigToNode(babel, importedIdentifiers, value) {
  const { types: t } = babel;
  if (["string", "number", "boolean"].includes(typeof value) || value == null) {
    return t.valueToNode(value); // Handle primitive values
  }

  if (Array.isArray(value)) {
    return t.arrayExpression(
      // Recursively handle arrays
      value.map((v) => serializeConfigToNode(babel, importedIdentifiers, v))
    );
  }

  if (typeof value === "object") {
    return t.objectExpression(
      Object.entries(value).map(([key, val]) =>
        t.objectProperty(
          t.identifier(key),
          serializeConfigToNode(babel, importedIdentifiers, val)
        )
      )
    );
  }

  // Use identifier for imported symbols instead of inlining
  if (importedIdentifiers.has(value.name)) {
    return t.identifier(value.name);
  }

  // For inline functions, parse and serialize them as expressions
  if (typeof value === "function") {
    const valueString = value.toString();
    try {
      return parseExpression(valueString, { sourceType: "module" });
    } catch (error) {
      throw new Error(
        `Failed to parse function ${value.name || "anonymous"}: ${
          error.message
        }`
      );
    }
  }

  throw new Error(`Unsupported config value type: ${typeof value}`);
}
