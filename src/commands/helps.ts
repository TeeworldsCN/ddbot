import { TextHandler } from '../bottype';
import { LEVEL_MANAGER } from '../db/user';

export const generalHelp: TextHandler = async msg => {
  const lines = [];
  const isManager = msg.effectiveUserLevel <= LEVEL_MANAGER;

  const hidden = [];

  for (const key in msg.bot.commands) {
    if (msg.bot.commands[key].desc) {
      lines.push(`${key} - ${msg.bot.commands[key].desc}`);
    } else if (isManager) {
      hidden.push(key);
    }
  }

  for (const key in msg.bot.converses) {
    if (msg.bot.converses[key].desc) {
      lines.push(`${key} - ${msg.bot.converses[key].desc}`);
    } else if (isManager) {
      hidden.push(key);
    }
  }

  for (const key in msg.bot.globalCommands) {
    if (msg.bot.globalCommands[key].desc) {
      lines.push(`${key} - ${msg.bot.globalCommands[key].desc}`);
    } else if (isManager) {
      hidden.push(key);
    }
  }

  if (isManager) {
    lines.push(`\n你还可以使用这些指令：\n${hidden.join()}`);
  }

  msg.reply.text(lines.join('\n'));
};

export const generalHelpEng: TextHandler = async msg => {
  const lines = [];
  const isManager = msg.effectiveUserLevel <= LEVEL_MANAGER;

  const hidden = [];

  for (const key in msg.bot.commands) {
    if (msg.bot.commands[key].descEng) {
      lines.push(`${key} - ${msg.bot.commands[key].descEng}`);
    } else if (isManager) {
      hidden.push(key);
    }
  }

  for (const key in msg.bot.converses) {
    if (msg.bot.converses[key].descEng) {
      lines.push(`${key} - ${msg.bot.converses[key].descEng}`);
    } else if (isManager) {
      hidden.push(key);
    }
  }

  for (const key in msg.bot.globalCommands) {
    if (msg.bot.globalCommands[key].descEng) {
      lines.push(`${key} - ${msg.bot.globalCommands[key].descEng}`);
    } else if (isManager) {
      hidden.push(key);
    }
  }

  if (isManager) {
    lines.push(`\nUndocumented commands: \n${hidden.join()}`);
  }

  msg.reply.text(lines.join('\n'));
};

export const wechatHelp: TextHandler = async msg => {
  const lines = ['指令手册：\n'];
  const engHelp = [];

  for (const key in msg.bot.commands) {
    if (msg.bot.commands[key].desc === true) {
      engHelp.push(key);
    } else if (msg.bot.commands[key].desc) {
      lines.push(`${key} - ${msg.bot.commands[key].desc}`);
    }
  }

  for (const key in msg.bot.converses) {
    if (msg.bot.converses[key].desc === true) {
      engHelp.push(key);
    } else if (msg.bot.converses[key].desc) {
      lines.push(`${key} - ${msg.bot.converses[key].desc}`);
    }
  }

  lines.push(`\n * 还可以使用以下等同指令: \n${engHelp.join()}`);
  msg.reply.text(lines.join('\n'));
};
