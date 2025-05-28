import type { PlopTypes } from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
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

      const rootDir = `${__dirname}/../..`.replaceAll(/\\/g, '/');

      return [
        {
          type: 'addMany',
          destination: `${rootDir}/apps/{{name}}`,
          base: `${rootDir}/template`,
          templateFiles: [`${rootDir}/template/**/*`],
          globOptions: {
            dot: true,
          },
        },
      ];
    },
  });
}
