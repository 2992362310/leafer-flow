import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { parse } = require('vue/compiler-sfc');
const roots = ['apps', 'packages'].flatMap((parent) =>
  fs.readdirSync(parent).map((name) => `${parent}/${name}`),
).filter((directory) => fs.existsSync(`${directory}/package.json`));
const workspaces = roots.map((directory) => ({
  directory,
  ...JSON.parse(fs.readFileSync(`${directory}/package.json`, 'utf8')),
}));
const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
const failures = [];

for (const workspace of workspaces) {
  if (byName.get(workspace.name).directory !== workspace.directory) {
    failures.push(`Duplicate workspace name: ${workspace.name} (${workspace.directory}, ${byName.get(workspace.name).directory})`);
  }
}

function collect(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = `${directory}/${entry.name}`;
    return entry.isDirectory() ? collect(filename) : /\.(ts|vue)$/.test(filename) ? [filename] : [];
  });
}

function localModuleExists(target) {
  return ['', '.ts', '.tsx', '.js', '.mjs', '.json', '.vue', '/index.ts', '/index.js'].some((suffix) => {
    const filename = `${target}${suffix}`;
    return fs.existsSync(filename) && fs.statSync(filename).isFile();
  });
}

for (const workspace of workspaces) {
  for (const target of Object.values(workspace.exports ?? {})) {
    if (typeof target === 'string' && !fs.existsSync(path.join(workspace.directory, target))) {
      failures.push(`${workspace.name}: missing export target ${target}`);
    }
  }
  for (const filename of collect(`${workspace.directory}/src`)) {
    const source = fs.readFileSync(filename, 'utf8');
    const descriptor = filename.endsWith('.vue') ? parse(source, { filename }).descriptor : null;
    const scripts = descriptor
      ? [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean)
      : [source];
    for (const script of scripts) {
      const syntax = ts.createSourceFile(filename, script, ts.ScriptTarget.Latest, true);
      for (const statement of syntax.statements) {
        if (workspace.name !== '@leafer-flow/core' || !ts.isImportDeclaration(statement)) continue;
        if (statement.moduleSpecifier.text === 'vue' && !statement.importClause?.isTypeOnly) {
          failures.push(`${filename}: engine must not import the Vue runtime`);
        }
      }
      for (const { fileName: specifier } of ts.preProcessFile(script).importedFiles) {
        if (specifier.startsWith('.')) {
          const target = path.resolve(path.dirname(filename), specifier);
          const sourceRoot = `${path.resolve(workspace.directory, 'src')}${path.sep}`;
          if (!target.startsWith(sourceRoot)) failures.push(`${filename}: relative import escapes package: ${specifier}`);
          if (!localModuleExists(target)) failures.push(`${filename}: missing local import: ${specifier}`);
          continue;
        }
        if (specifier.startsWith('@/') && workspace.directory === 'apps/web') {
          const target = path.resolve(workspace.directory, 'src', specifier.slice(2));
          if (!localModuleExists(target)) failures.push(`${filename}: missing local import: ${specifier}`);
          continue;
        }
        const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
        const dependencies = { ...workspace.dependencies, ...workspace.peerDependencies };
        if (name !== workspace.name && !dependencies[name]) failures.push(`${filename}: undeclared dependency: ${name}`);
        const dependency = byName.get(name);
        if (!dependency) continue;
        if (dependency.directory.startsWith('apps/') && workspace.directory.startsWith('packages/')) {
          failures.push(`${filename}: packages must not import apps`);
        }
        const subpath = specifier === name ? '.' : `.${specifier.slice(name.length)}`;
        if (!dependency.exports?.[subpath]) failures.push(`${filename}: private or missing export: ${specifier}`);
      }
    }
  }
}

function visit(name, ancestors = []) {
  if (ancestors.includes(name)) {
    failures.push(`Workspace cycle: ${[...ancestors, name].join(' -> ')}`);
    return;
  }
  for (const dependency of Object.keys(byName.get(name)?.dependencies ?? {})) {
    if (byName.has(dependency)) visit(dependency, [...ancestors, name]);
  }
}
for (const workspace of workspaces) visit(workspace.name);

if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Workspace boundaries OK (${workspaces.length} packages).`);
}
