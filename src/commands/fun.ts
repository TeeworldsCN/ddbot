import { ReplyCommandHandler } from '../bottype';
import { CommandParser } from '../utils/commandParser';
import { v4 as uuidv4 } from 'uuid';

export const roll: ReplyCommandHandler = async msg => {
  const query = new CommandParser(msg.base.command);
  const first = query.getNumber(1);
  const second = query.getNumber(2);
  let min = 1;
  let max = 100;
  if (!isNaN(first) && isNaN(second)) {
    max = first;
  } else if (!isNaN(first) && !isNaN(second)) {
    min = first;
    max = second;
  }

  const result = Math.floor(Math.random() * (max - min + 1)) + min;

  await msg.reply.text(`${msg.base.author.nickname} rolled ${result} (${min}-${max})`);
};

export const dice: ReplyCommandHandler = async msg => {
  const query = new CommandParser(msg.base.command);
  let numDice = query.getNumber(1);
  if (isNaN(numDice)) numDice = 1;

  if (numDice > 50 || numDice <= 0) {
    await msg.reply.text('dice count must be between 1 and 50');
    return;
  }

  const result = [];
  for (let i = 0; i < numDice; i++) {
    result.push(Math.floor(Math.random() * 6) + 1);
  }

  await msg.reply.text(
    `${msg.base.author.nickname} rolled ${String.fromCodePoint(
      ...result.map(d => d + 0x267f)
    )} (${result.reduce((x, n) => x + n)})`
  );
};

export const uuid: ReplyCommandHandler = async msg => {
  await msg.reply.text(`${uuidv4()}`);
};
