const fs = require('fs');
const path = require('path');

const overwriteDirFiles = (dir, options) => {
  const { onFileContent, onFilePath } = options;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const newFilePath = onFilePath(filePath);

    if (newFilePath !== filePath) {
      fs.renameSync(filePath, newFilePath);
    }

    if (fs.statSync(newFilePath).isDirectory()) {
      overwriteDirFiles(newFilePath, options);
    } else {
      const fileContent = fs.readFileSync(newFilePath, 'utf-8');
      const newFileContent = onFileContent(fileContent);
      if (fileContent !== newFileContent) {
        fs.writeFileSync(newFilePath, newFileContent);
      }
    }
  }
};
const toPascalCase = (value) =>
  value
    .replace(/-./g, (match) => match[1].toUpperCase())
    .replace(/^./, (match) => match.toUpperCase());
const toEnvCase = (value) => value.replace(/-/g, '_').toUpperCase();
const checkKebabCase = (value) => value.toLowerCase() === value;

const kebabSaasName = process.argv[2];
const pascalSaasName = toPascalCase(kebabSaasName);
const envSaasName = toEnvCase(kebabSaasName);
const root = process.cwd();

if (typeof kebabSaasName !== 'string' || kebabSaasName.length === 0) {
  throw new Error('Argument name is missing');
}

if (!checkKebabCase(kebabSaasName)) {
  throw new Error('Argument name should be formatted in kebab case');
}

const appFolderPath = path.join(root, 'apps', kebabSaasName);

console.log('📁 creating integration app folder', appFolderPath);
fs.mkdirSync(appFolderPath);

console.log('📦 copying integration template');
fs.cpSync(path.join(root, 'template'), appFolderPath, { recursive: true });

console.log('🔁 replacing identifier');
overwriteDirFiles(appFolderPath, {
  onFileContent: (content) =>
    content
      .replace(/x-saas/gm, kebabSaasName)
      .replace(/XSaas/gm, pascalSaasName)
      .replace(/X_SAAS/gm, envSaasName),
  onFilePath: (filePath) => filePath.replace(/x-saas/, kebabSaasName),
});

console.log('🚀 done');
