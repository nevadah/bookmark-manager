import { useState } from "react";
import { Bookmark } from "../shared/types";

interface TagNode {
    name: string;
    fullPath: string;
    children: Map<string, TagNode>;
    count: number;
}

function buildTagTree(bookmarks: Bookmark[]): Map<string, TagNode> {
    const root = new Map<string, TagNode>();

    for (const bookmark of bookmarks) {
        for (const tag of bookmark.tags) {
            const segments = tag.split('/');
            let current = root;
            let path = '';

            for (const segment of segments) {
                path = path ? `${path}/${segment}` : segment;
                if (!current.has(segment)) {
                    current.set(segment, { name: segment, fullPath: path, children: new Map(), count: 0 });
                }
                const node = current.get(segment)!;
                if (path === tag) node.count++;
                current = node.children;
            }
        }
    }
    return root;
}

export function TagsView({ bookmarks }: { bookmarks: Bookmark[] }) {
    const tagTree = buildTagTree(bookmarks);
    
    return (
        <ul>
            {Array.from(tagTree.values()).map((node) => (
                <TagTreeNode key={node.fullPath} node={node} />
            ))}
        </ul>
    );
}

function TagTreeNode({ node }: { node: TagNode }) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children.size > 0;

    return (
        <li>
            <span onClick={() => hasChildren && setExpanded(!expanded)}>
                {hasChildren ? (expanded ? '▼' : '▶') : '•'} {node.name}
                {node.count > 0 && <span> ({node.count})</span>}
            </span>
            {hasChildren && expanded && (
                <ul>
                    {Array.from(node.children.values()).map((child) => (
                        <TagTreeNode key={child.fullPath} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
}
