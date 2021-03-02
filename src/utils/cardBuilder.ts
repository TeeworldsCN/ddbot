export class Card {
  private card: any;

  private add_module(module: any) {
    this.card.modules.push(module);
  }

  constructor(title?: string) {
    this.card = {
      type: 'card',
      theme: 'secondary',
      size: 'lg',
      modules: [],
    };

    if (title) {
      this.add_title(title);
    }
  }

  public add_title(title: string) {
    this.add_module({
      type: 'header',
      text: {
        type: 'plain-text',
        content: title,
      },
    });
  }

  public add_divider() {
    this.add_module({
      type: 'divider',
    });
  }

  public add_text(text: string) {
    this.add_module({
      type: 'section',
      text: {
        type: 'plain-text',
        content: text,
      },
    });
  }

  public add_markdown(md: string) {
    this.add_module({
      type: 'section',
      text: {
        type: 'kmarkdown',
        content: md,
      },
    });
  }

  public add_table(table: string[][]) {
    const cols = table.reduce((max, arr) => (max = Math.max(arr.length, max)), 0);

    const fields = [];
    for (let i = 0; i < cols; ++i) {
      let content = '';
      let first = true;
      for (let row of table) {
        const separator = first ? '' : '\n';
        if (i < row.length) {
          content += separator + row[i];
        } else {
          content += separator;
        }
        first = false;
      }

      fields.push({
        type: 'kmarkdown',
        content,
      });
    }

    this.add_module({
      type: 'section',
      text: {
        type: 'paragraph',
        cols,
        fields,
      },
    });
  }

  public slice(start?: number, end?: number) {
    this.card.modules.slice(start, end);
  }

  public get data(): any {
    return JSON.stringify([this.card]);
  }
}
