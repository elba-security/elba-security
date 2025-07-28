// source here: https://gist.github.com/Evavic44/8348e357935d09f79d4c1616b0c20408
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'aol.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'msn.com',
  'yahoo.fr',
  'wanadoo.fr',
  'orange.fr',
  'comcast.net',
  'yahoo.co.uk',
  'yahoo.com.br',
  'yahoo.co.in',
  'live.com',
  'rediffmail.com',
  'free.fr',
  'gmx.de',
  'web.de',
  'yandex.ru',
  'ymail.com',
  'libero.it',
  'outlook.com',
  'uol.com.br',
  'bol.com.br',
  'mail.ru',
  'cox.net',
  'hotmail.it',
  'sbcglobal.net',
  'sfr.fr',
  'live.fr',
  'verizon.net',
  'live.co.uk',
  'googlemail.com',
  'yahoo.es',
  'ig.com.br',
  'live.nl',
  'bigpond.com',
  'terra.com.br',
  'yahoo.it',
  'neuf.fr',
  'yahoo.de',
  'alice.it',
  'rocketmail.com',
  'att.net',
  'laposte.net',
  'facebook.com',
  'bellsouth.net',
  'yahoo.in',
  'hotmail.es',
  'charter.net',
  'yahoo.ca',
  'yahoo.com.au',
  'rambler.ru',
  'hotmail.de',
  'tiscali.it',
  'shaw.ca',
  'yahoo.co.jp',
  'sky.com',
  'earthlink.net',
  'optonline.net',
  'freenet.de',
  't-online.de',
  'aliceadsl.fr',
  'virgilio.it',
  'home.nl',
  'qq.com',
  'telenet.be',
  'me.com',
  'yahoo.com.ar',
  'tiscali.co.uk',
  'yahoo.com.mx',
  'voila.fr',
  'gmx.net',
  'mail.com',
  'planet.nl',
  'tin.it',
  'live.it',
  'ntlworld.com',
  'arcor.de',
  'yahoo.co.id',
  'frontiernet.net',
  'hetnet.nl',
  'live.com.au',
  'yahoo.com.sg',
  'zonnet.nl',
  'club-internet.fr',
  'juno.com',
  'optusnet.com.au',
  'blueyonder.co.uk',
  'bluewin.ch',
  'skynet.be',
  'sympatico.ca',
  'windstream.net',
  'mac.com',
  'centurytel.net',
  'chello.nl',
  'live.ca',
  'aim.com',
  'bigpond.net.au',
  'protonmail.com',
  'proton.me',
  'zoho.com',
];

/**
 *  Copied from zod {@link https://github.com/colinhacks/zod/blob/0df5f6946ef7137be710767f06ff0c05e7dd9b47/packages/zod/src/v3/types.ts#L617C1-L617C105}
 **/
const emailRegex =
  /(?!\.)(?!.*\.\.)(?<username>[A-Z0-9_'+\-.]*)[A-Z0-9_+-]@(?<domain>[A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}/i;

const extractEmail = (data: string) => {
  const match = emailRegex.exec(data);

  return match ? match[0] : null;
};

const removeSubDomains = (domain: string) => {
  const parts = domain.split('.');
  return [parts.at(-2), parts.at(-1)].join('.');
};

type ShouldAnalyzeEmailParams = {
  sender: string;
  receiver: string;
};

export const shouldAnalyzeEmail = ({ sender, receiver }: ShouldAnalyzeEmailParams) => {
  const senderEmail = extractEmail(sender);
  const receiverEmail = extractEmail(receiver);

  if (!senderEmail || !receiverEmail) {
    return false;
  }

  const [, senderEmailDomain] = senderEmail.split('@') as [string, string];
  const [, receiverEmailDomain] = receiverEmail.split('@') as [string, string];

  if (PERSONAL_EMAIL_DOMAINS.includes(senderEmailDomain)) {
    return false;
  }

  if (removeSubDomains(senderEmailDomain) === removeSubDomains(receiverEmailDomain)) {
    return false;
  }

  return true;
};
