declare module 'booste' {
  declare const module: {
    gpt2XL: (apiKey: string, inString: string, length: number) => Promise<string[]>;
    gpt2: (apiKey: string, inString: string, length: number) => Promise<string[]>;
  };
  export default module;
}
