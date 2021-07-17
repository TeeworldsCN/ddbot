import { DateTime } from 'luxon';
import _ from 'lodash';

export const unpackID = (id: string) => {
  const data = id.split('|');
  return {
    platform: data[0],
    id: data.slice(1).join(''),
  };
};

export const unpackChannelID = (id: string) => {
  const data = id.split('|');
  const secondPart = data.slice(1).join('');
  const secondData = secondPart.split(':');
  return {
    platform: data[0],
    botName: secondData[0],
    id: secondData.slice(1).join(''),
  };
};

export const packID = (data: { platform: string; id: string }) => {
  return `${data.platform}|${data.id}`;
};

export const packChannelID = (data: { platform: string; botName: string; id: string }) => {
  return `${data.platform}|${data.botName}:${data.id}`;
};

export const dateTime = (date: number) =>
  DateTime.fromMillis(date).setZone('Asia/Shanghai').toFormat('yyyy/MM/dd HH:mm');

export const date = (date: number) =>
  DateTime.fromMillis(date).setZone('Asia/Shanghai').toFormat('yyyy/MM/dd');

export const secTime = (time: number) =>
  `${time >= 60 ? `${Math.floor(time / 60)}分` : ''}${_.trimEnd(
    _.trimEnd((time % 60).toFixed(3), '0'),
    '.'
  )}秒`;

export const ddnetEncode = (str: string) =>
  encodeURIComponent(
    str
      .replace(/\-/g, '-45-')
      .replace(/\\/g, '-92-')
      .replace(/\%/g, '-37-')
      .replace(/\?/g, '-63-')
      .replace(/\&/g, '-38-')
      .replace(/\=/g, '-61-')
      .replace(/\//g, '-47-')
  );

export const addr2b = (ip: string, port: number) => {
  const part = ip.split('.');
  const hexStr =
    _.padStart(parseInt(part[0]).toString(16), 2, '0') +
    _.padStart(parseInt(part[1]).toString(16), 2, '0') +
    _.padStart(parseInt(part[2]).toString(16), 2, '0') +
    _.padStart(parseInt(part[3]).toString(16), 2, '0') +
    _.padStart(port.toString(16), 4, '0');

  return Buffer.from(hexStr, 'hex').toString('base64').replace(/\+/g, '_').replace(/\//g, '-');
};
