export const outlookMessagesList = [
  {
    id: 'message-1-AAMkAGE4NmEwMmU2LTViYTctNDhhNi05ZTI3LWI3NzkyZGY5M',
    isDraft: false,
    createdDateTime: '2025-04-08T10:00:00Z',
    hasAttachments: false,
  },
  {
    id: 'message-2-AAMkAGE4NmEwMmU2LTViYTctNDhhNi05ZTI3LWI3NzkyZGY5M',
    isDraft: false,
    hasAttachments: false,
    createdDateTime: '2025-03-08T10:00:00Z',
  },
  {
    id: 'message-3-AAMkAGE4NmEwMmU2LTViYTctNDhhNi05ZTI3LWI3NzkyZGY5M',
    isDraft: true,
    hasAttachments: true,
    createdDateTime: '2024-11-03T00:00:00Z',
  },
];

export const outlookMessage = {
  id: 'AAMkAGE4NmEwMmU2LTViYTctNDhhNi05ZTI3LWI3NzkyZGY5M2Q5NQBGAAAAAAAMB2R4SroqRYvgvUoGmDOtB',
  subject: 'subject-message-1',
  from: {
    emailAddress: {
      name: 'from-name-1',
      address: 'from-email-address-1',
    },
  },
  toRecipients: [
    {
      emailAddress: {
        name: 'to-name-1',
        address: 'to-email-address-1',
      },
    },
  ],
  body: {
    contentType: 'html',
    content: 'html-content: message-text-1',
  },
  isDraft: false,
  createdDateTime: '2025-04-08T10:00:00Z',
  hasAttachments: false,
};
