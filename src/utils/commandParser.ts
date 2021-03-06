export class CommandParser {
  private matches;
  public constructor(command: string) {
    this.matches = command.match(
      /((?:(?:\\")|[^"\s])+\s*)|('.*?(?:(?<!\\)'|$)\s*)|(".*?(?:(?<!\\)"|$)\s*)/gs
    );
  }

  public getString(index: number) {
    if (!this.matches) return undefined;
    const part = this.matches[index];
    if (!part) return undefined;
    const str = part.trimEnd().replace(/\\['"]/g, str => str.slice(1));
    if (str.startsWith('"')) return str.slice(1, str.length - (str.endsWith('"') ? 1 : 0));
    if (str.startsWith("'")) return str.slice(1, str.length - (str.endsWith("'") ? 1 : 0));
    return str;
  }

  public getNumber(index: number) {
    return parseInt(this.getString(index)) ?? undefined;
  }

  public getRest(index: number) {
    if (!this.matches) return undefined;
    const str = this.matches.slice(index).join('');
    if (str.startsWith('"')) return str.slice(1, str.length - (str.endsWith('"') ? 1 : 0));
    if (str.startsWith("'")) return str.slice(1, str.length - (str.endsWith("'") ? 1 : 0));
    return str;
  }
}
