import { GenericMessageElement } from '../bots/base';

export const eQuote = (
  msgId: string,
  content: string,
  platform: string = 'unknown'
): GenericMessageElement => {
  return {
    type: 'quote',
    msgId,
    content,
    platform,
  };
};

export const eText = (content: string): GenericMessageElement => {
  return {
    type: 'text',
    content,
  };
};

export const eMention = (userKey: string, username: string): GenericMessageElement => {
  return {
    type: 'mention',
    userKey,
    content: username,
  };
};

export const eImage = (content: string | Buffer): GenericMessageElement => {
  return {
    type: 'image',
    content: content,
  };
};

export const eNotifyAll = (): GenericMessageElement => {
  return {
    type: 'notify',
    content: 'all',
    targetType: 'all',
  };
};

export const eNotifyHere = (): GenericMessageElement => {
  return {
    type: 'notify',
    content: 'here',
    targetType: 'here',
  };
};
