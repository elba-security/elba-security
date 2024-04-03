import type { DropboxOptions } from 'dropbox';
import { Dropbox } from 'dropbox';

export class DBXAccess extends Dropbox {
  private customOptions: DropboxOptions;

  constructor(options: DropboxOptions) {
    super({
      ...options,
      fetch,
    });

    this.customOptions = options;
  }

  setHeaders(options: DropboxOptions) {
    const updatedDropbox = new Dropbox({
      ...this.customOptions,
      ...options,
      fetch,
    });

    // Assign the updated Dropbox instance back to this instance
    Object.assign(this, updatedDropbox);
  }
}
