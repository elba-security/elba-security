import type { PlopTypes } from '@turbo/gen';
import fs from 'fs';
import path from 'path';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  const rootDir = path.resolve(__dirname, '../..');

  // Helper function to process the name
  plop.setHelper('upper', (text) => text.toUpperCase().replace(/-/g, '_'));

  plop.setGenerator('integration', {
    description: 'Create a new Elba integration',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of your integration? (use kebab-case)',
        validate: (input: string) => {
          if (input.match(/^[a-z0-9]+(-[a-z0-9]+)*$/)) {
            return true;
          }
          return 'Name must be in kebab-case (e.g. my-integration)';
        },
      },
    ],
    actions: function (data) {
      if (!data?.name) {
        throw new Error('Integration name is required');
      }

      // Normalize paths for glob patterns (ensure they use forward slashes regardless of platform)
      const templateDir = path.join(rootDir, 'template');
      const normalizedTemplateDir = templateDir.replace(/\\/g, '/');

      return [
        // First create the directory structure
        {
          type: 'addMany',
          destination: path.join(rootDir, 'apps', '{{name}}'),
          templateFiles: [
            `${normalizedTemplateDir}/**/*`,
            `!${normalizedTemplateDir}/.env*`,
            `!${normalizedTemplateDir}/src/connectors/{{name}}/**`,
          ],
          base: templateDir,
          globOptions: {
            dot: true,
            windowsPathsNoEscape: true, // Prevent escaping of Windows paths
          },
        },
        // Add env files with proper transformation
        {
          type: 'add',
          path: path.join(rootDir, 'apps', '{{name}}', '.env.test'),
          templateFile: path.join(rootDir, 'template', '.env.test'),
          force: true,
        },
        {
          type: 'add',
          path: path.join(rootDir, 'apps', '{{name}}', '.env.local.example'),
          templateFile: path.join(rootDir, 'template', '.env.local.example'),
          force: true,
        },
        // Copy source folder contents to renamed folder
        {
          type: 'addMany',
          destination: path.join(rootDir, 'apps', '{{name}}', 'src/connectors', '{{name}}'),
          templateFiles: `${normalizedTemplateDir}/src/connectors/{{name}}/**`,
          base: path.join(rootDir, 'template', 'src/connectors/{{name}}'),
          globOptions: {
            windowsPathsNoEscape: true, // Prevent escaping of Windows paths
          },
        },
        // Update package.json
        {
          type: 'modify',
          path: path.join(rootDir, 'apps', '{{name}}', 'package.json'),
          transform: (content: string, answers: { name: string }) => {
            const pkg = JSON.parse(content);
            pkg.name = `@elba-security/${answers.name}`;
            return JSON.stringify(pkg, null, 2);
          },
        },
      ];
    },
  });
}
