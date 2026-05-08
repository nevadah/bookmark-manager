import { describe, it, expect } from 'vitest';
import { importBrowserBookmarks } from '../import.js';

describe('importBrowserBookmarks', () => {
  it('returns an empty array for an empty tree', () => {
    const result = importBrowserBookmarks([]);
    expect(result).toEqual([]);
  });

  it('extracts bookmarks from a flat folder', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [{
      id: '0',
      title: 'root',
      children: [{
        id: '1',
        title: 'Folder',
        children: [
          { id: '2', title: 'Example', url: 'https://example.com' },
        ],
      }],
    }];
    const result = importBrowserBookmarks(tree);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://example.com');
    expect(result[0].title).toBe('Example');
  });

  it('skips nodes without a url', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [{
      id: '0',
      title: 'root',
      children: [{ id: '1', title: 'Folder', children: [] }],
    }];
    const result = importBrowserBookmarks(tree);
    expect(result).toHaveLength(0);
  });

  it('extracts bookmarks from nested folders', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [{
      id: '0',
      title: 'root',
      children: [{
        id: '1',
        title: 'Outer',
        children: [{
          id: '2',
          title: 'Inner',
          children: [
            { id: '3', title: 'Deep', url: 'https://deep.example.com' },
          ],
        }],
      }],
    }];
    const result = importBrowserBookmarks(tree);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://deep.example.com');
  });
});
