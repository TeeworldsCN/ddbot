export type SendReply = {
  text: (msg: string) => void;
  link: (title: string, desc: string, url: string) => void;
};

export type Handler = (
  reply: SendReply,
  msg: string,
  mode: 'GROUP' | 'DIRECT'
) => Promise<void> | void;
