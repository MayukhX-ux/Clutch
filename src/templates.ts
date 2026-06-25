import { Page } from './types';

export const getInitialTemplates = (): Page[] => {
  const now = Date.now();
  const gettingStartedId = 'getting-started-page';

  return [
    {
      id: gettingStartedId,
      title: 'Getting Started',
      icon: '✨',
      coverImage: 'linear-gradient(135deg, #c084fc, #818cf8, #4f46e5)', // Cosmic Lavender
      parentId: null,
      isFavorite: true,
      isTrash: false,
      createdAt: now,
      updatedAt: now,
      blocks: [
        {
          id: 'gs1',
          type: 'h1',
          content: 'Welcome to Clutch',
        },
        {
          id: 'gs2',
          type: 'callout',
          content: 'This is your brand new workspace! It is fully collaborative, persistent, cloud-synced, and equipped with a built-in AI assistant.',
        },
        {
          id: 'gs3',
          type: 'text',
          content: 'Use the sidebar on the left to organize your thoughts, or press Enter to create a new block right here.',
        }
      ],
    }
  ];
};
export default getInitialTemplates;
