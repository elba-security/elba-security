import type { PlopTypes } from '@turbo/gen';
import fs from 'fs';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setActionType('renameSourceFolder', (answers: any) => {
    const data = answers;
    const sourcePath = `${data.turbo.paths.root}/apps/${data.name}/src/connectors/source`;
    const destPath = `${data.turbo.paths.root}/apps/${data.name}/src/connectors/${data.name}`;

    try {
      fs.renameSync(sourcePath, destPath);
      return `Successfully renamed ${sourcePath} to ${destPath}`;
    } catch (error) {
      return `Failed to rename folder: ${error}`;
    }
  });

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
    actions: [
      {
        type: 'addMany',
        destination: '{{turbo.paths.root}}/apps/{{name}}',
        templateFiles: '{{turbo.paths.root}}/template/**/*',
        base: '{{turbo.paths.root}}/template',
        transform: (content: string, data) => {
          return content.replace(/\{\{name\}\}/g, data.name);
        },
        globOptions: {
          dot: true,
        },
      },
      {
        type: 'modify',
        path: '{{turbo.paths.root}}/apps/{{name}}/package.json',
        transform: (content: string, answers: { name: string }) => {
          const pkg = JSON.parse(content);
          pkg.name = `@elba-security/${answers.name}`;
          return JSON.stringify(pkg, null, 2);
        },
      },
      {
        type: 'renameSourceFolder',
      },
    ],
  });
}
