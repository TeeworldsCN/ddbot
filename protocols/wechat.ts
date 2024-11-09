export type EncryptedPayload = XMLPayload<{
  ToUserName: string;
  Encrypt: string;
}>;

export type XMLPayload<T> = {
  xml: T;
};

type CDATA = {
  '~name': string;
  '#text': string;
};

// transform received message, add MsgId, convert CDATA to string
type Received = {
  xml: {
    MsgId: string;
  };
};

export type ReceivedMessagePayload = Received & MessagePayload<string>;
type MessagePayload<T> = TextMessagePayload<T>;

export type TextMessagePayload<T = CDATA> = XMLPayload<{
  ToUserName: T;
  FromUserName: T;
  CreateTime: string;
  MsgType: 'text';
  Content: T;
}>;

export type LinkMessagePayload<T = CDATA> = XMLPayload<{
  ToUserName: T;
  FromUserName: T;
  CreateTime: string;
  MsgType: 'link';
  Title: T;
  Description: T;
  Url: T;
}>;
