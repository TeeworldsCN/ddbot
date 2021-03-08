import { textChangeRangeIsUnchanged } from 'typescript';

type CardTheme = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
interface CardButton {
  theme?: CardTheme;
  value: string;
  click: 'return-val' | 'link';
  text: string;
}

interface CardImage {
  src: string;
  alt?: string;
}

type CardSize = 'sm' | 'lg';

// Safe Markdown
export const SMD = (str: string) => {
  //return str.replace(/([\[\]\(\)\\*~/\->:`])/g, (match, capture) => `\\${capture}`);
  return str
    .replace(/\*/g, '\u2217')
    .replace(/\(/g, '\u2768')
    .replace(/\)/g, '\u2769')
    .replace(/\~/g, '\u2053')
    .replace(/\`/g, '\u055D')
    .replace(/ \[/g, '\uFF3B')
    .replace(/\] /g, '\uFF3D')
    .replace(/\[/g, '\uFF3B')
    .replace(/\]/g, '\uFF3D')
    .replace(/\>/g, '\u02C3')
    .replace(/\-/g, '\u02D7');
};

export class Card {
  private card: any;

  private addModule(module: any) {
    this.card.modules.push(module);
  }

  constructor(size: CardSize, title?: string) {
    this.card = {
      type: 'card',
      theme: 'secondary',
      size: size,
      modules: [],
    };

    if (title) {
      this.addTitle(title);
    }
  }

  public setTheme(theme: CardTheme) {
    this.card.theme = theme;
  }

  public addTitle(title: string) {
    this.addModule({
      type: 'header',
      text: {
        type: 'plain-text',
        content: title,
      },
    });
  }

  public addDivider() {
    this.addModule({
      type: 'divider',
    });
  }

  public addText(text: string) {
    this.addModule({
      type: 'section',
      text: {
        type: 'plain-text',
        content: text,
      },
    });
  }

  public addMarkdown(md: string) {
    this.addModule({
      type: 'section',
      text: {
        type: 'kmarkdown',
        content: md,
      },
    });
  }

  public addContext(elements: (string | CardImage)[], isPlain: boolean = false) {
    this.addModule({
      type: 'context',
      elements: elements.map(e => {
        if (typeof e == 'string') {
          return {
            type: isPlain ? 'plain-text' : 'kmarkdown',
            content: e,
          };
        } else {
          return {
            type: 'image',
            ...e,
          };
        }
      }),
    });
  }

  public addTextWithImage(
    text: string,
    image: CardImage,
    size: 'sm' | 'lg',
    isPlain: boolean = false,
    circle: boolean = false,
    left: boolean = false
  ) {
    this.addModule({
      type: 'section',
      text: {
        type: isPlain ? 'plain-text' : 'kmarkdown',
        content: text,
      },
      mode: left ? 'left' : 'right',
      accessory: {
        type: 'image',
        ...image,
        size,
        circle,
      },
    });
  }

  public addTextWithButton(text: string, button: CardButton, isPlain: boolean = false) {
    this.addModule({
      type: 'section',
      text: {
        type: isPlain ? 'plain-text' : 'kmarkdown',
        content: text,
      },
      mode: 'right',
      accessory: {
        type: 'button',
        theme: button.theme,
        click: button.click,
        value: button.value,
        text: {
          type: 'kmarkdown',
          content: button.text,
        },
      },
    });
  }

  public addButtons(buttons: CardButton[]) {
    this.addModule({
      type: 'action-group',
      elements: buttons.slice(0, 4).map(b => {
        return {
          type: 'button',
          theme: b.theme,
          click: b.click,
          value: b.value,
          text: {
            type: 'kmarkdown',
            content: b.text,
          },
        };
      }),
    });
  }

  public addImages(images: CardImage[]) {
    this.addModule({
      type: 'image-group',
      elements: images.slice(0, 9).map(img => {
        return {
          type: 'image',
          ...img,
        };
      }),
    });
  }

  public addFile(title: string, src: string, size: number) {
    this.addModule({ type: 'file', title, src, size });
  }

  public addAudio(title: string, src: string, cover?: string) {
    this.addModule({ type: 'audio', title, src, cover });
  }

  public addVideo(title: string, src: string) {
    this.addModule({ type: 'video', title, src });
  }

  public addCountdown(seconds: number, mode: 'day' | 'hour' | 'second') {
    this.addModule({
      type: 'countdown',
      mode,
      startTime: Date.now(),
      endTime: Date.now() + seconds * 1000,
    });
  }

  public addCountdownTill(date: Date, mode: 'day' | 'hour') {
    this.addModule({
      type: 'countdown',
      mode,
      startTime: Date.now(),
      endTime: date.getTime(),
    });
  }

  public addTable(table: string[][]) {
    const cols = table.reduce((max, arr) => (max = Math.max(arr.length, max)), 0);
    if (cols > 3) return;

    for (let row of table) {
      this.addModule({
        type: 'section',
        text: {
          type: 'paragraph',
          cols,
          fields: row.map(content => {
            return {
              type: 'kmarkdown',
              content,
            };
          }),
        },
      });
    }
    // for (let i = 0; i < cols; ++i) {
    //   let content = '';
    //   let first = true;
    //   for (let row of table) {
    //     const separator = first ? '' : '\n';
    //     if (i < row.length) {
    //       content += separator + row[i];
    //     } else {
    //       content += separator;
    //     }
    //     first = false;
    //   }

    //   fields.push({
    //     type: 'kmarkdown',
    //     content,
    //   });
    // }
  }

  public slice(start?: number, end?: number) {
    this.card.modules = this.card.modules.slice(start, end);
  }

  public toString(): string {
    return JSON.stringify([this.card]);
  }
}
