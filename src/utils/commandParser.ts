export class CommandParser {
  private matches;
  public constructor(command: string) {
    this.matches = command.match(
      /((?:(?:\\")|[^"\s])+\s*)|('.*?(?:(?<!\\)'|$)\s*)|(".*?(?:(?<!\\)"|$)\s*)/g
    );
  }

  public getString(index: number) {
    const part = this.matches[index];
    if (!part) return undefined;
    const str = part.trimEnd().replace(/\\['"]/g, str => str.slice(1));
    if (str.startsWith('"')) return str.slice(1, str.length - (str.endsWith('"') ? 1 : 0));
    if (str.startsWith("'")) return str.slice(1, str.length - (str.endsWith("'") ? 1 : 0));
    return str;
  }

  public getNumber(index: number) {
    return parseInt(this.getString(index)) || undefined;
  }

  public getRest(index: number) {
    return this.matches.slice(index).join('');
  }
}
