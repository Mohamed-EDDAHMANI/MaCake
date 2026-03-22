export class ImageUrl {
  private constructor(readonly value: string) {}

  static create(url: string): ImageUrl {
    if (!url || url.trim().length === 0) {
      throw new Error('Image URL cannot be empty.');
    }
    return new ImageUrl(url.trim());
  }

  isExternal(): boolean {
    return this.value.startsWith('http');
  }

  isInternal(): boolean {
    return this.value.startsWith('/files/');
  }

  toString(): string {
    return this.value;
  }
}
