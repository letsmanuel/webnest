import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { docsIndex, DocNode } from "../docs/docsIndex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "github-markdown-css/github-markdown.css";

// Vite dynamic import for all markdown files in src/docs
const markdownFiles = import.meta.glob("../docs/*.md", { as: "raw" });

// Helper to find a node by slug
function findNodeBySlug(tree: DocNode[], slug: string): DocNode | undefined {
  for (const node of tree) {
    if (node.slug === slug) return node;
    if (node.children) {
      const found = findNodeBySlug(node.children, slug);
      if (found) return found;
    }
  }
  return undefined;
}

// Sidebar tree component
const SidebarTree: React.FC<{
  tree: DocNode[];
  navigate: (path: string) => void;
  current: string;
  depth?: number;
  openState: Record<string, boolean>;
  setOpenState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}> = ({ tree, navigate, current, depth = 0, openState, setOpenState }) => {
  return (
    <ul className={depth === 0 ? "" : "ml-3 border-l border-gray-200 pl-2"}>
      {tree.map((node) => {
        if (node.children) {
          const isOpen = openState[node.slug] ?? true;
          return (
            <li key={node.slug} className="mb-1">
              <button
                className="flex items-center w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 transition group font-semibold text-gray-700"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => setOpenState((prev) => ({ ...prev, [node.slug]: !isOpen }))}
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 mr-1 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />
                )}
                {node.label}
              </button>
              {isOpen && (
                <SidebarTree
                  tree={node.children}
                  navigate={navigate}
                  current={current}
                  depth={depth + 1}
                  openState={openState}
                  setOpenState={setOpenState}
                />
              )}
            </li>
          );
        } else if (node.file) {
          const isActive = current === node.slug;
          return (
            <li key={node.slug}>
              <button
                className={`w-full text-left py-1.5 px-2 rounded transition flex items-center ${
                  isActive
                    ? "bg-blue-100 text-blue-700 font-bold"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                style={{ paddingLeft: `${depth * 12 + 32}px` }}
                onClick={() => navigate(`/docs/${node.slug}`)}
              >
                {node.label}
              </button>
            </li>
          );
        } else {
          return null;
        }
      })}
    </ul>
  );
};

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 8;
const SIDEBAR_TRIGGER_ZONE = 32;

const DocsPage: React.FC = () => {
  const { article = "visual-overview" } = useParams();
  const navigate = useNavigate();
  const [openState, setOpenState] = useState<Record<string, boolean>>({});
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = findNodeBySlug(docsIndex, article);
    if (node && node.file) {
      const filePath = `../docs/${node.file}`;
      const loader = markdownFiles[filePath];
      if (loader) {
        loader().then((raw: string) => {
          // Extract frontmatter title if present
          const match = raw.match(/^---[\s\S]*?title:\s*(.+)[\r\n]/);
          setTitle(match ? match[1].trim() : node.label);
          setMarkdown(raw.replace(/^---[\s\S]*?---/, "").trim());
        });
      } else {
        setMarkdown(null);
        setTitle("Not Found");
      }
    } else {
      setMarkdown(null);
      setTitle("Not Found");
    }
  }, [article]);

  // Sidebar slide-in/out logic
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!sidebarOpen && e.clientX <= SIDEBAR_TRIGGER_ZONE) {
        setSidebarOpen(true);
      } else if (sidebarOpen && e.clientX > SIDEBAR_WIDTH) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [sidebarOpen]);

  // Prevent sidebar from closing if mouse is over it
  function handleSidebarMouseEnter() {
    setSidebarOpen(true);
  }
  function handleSidebarMouseLeave(e: React.MouseEvent) {
    if (e.clientX > SIDEBAR_WIDTH) {
      setSidebarOpen(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 overflow-x-hidden force-light">
      {/* Sidebar (absolutely positioned, slides in/out) */}
      <div
        ref={sidebarRef}
        className="fixed top-0 left-0 h-full z-30 bg-white border-r border-gray-200 shadow-lg transition-all duration-300"
        style={{
          width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
          overflow: sidebarOpen ? "auto" : "hidden",
          maxWidth: '100vw',
        }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div
          className={`transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0, background: '#fff', color: '#222' }}
        >
          <div className="p-4 pb-2 border-b font-bold text-lg tracking-wide text-blue-700">Documentation</div>
          <nav className="flex-1 overflow-y-auto p-2">
            <SidebarTree tree={docsIndex} navigate={navigate} current={article} openState={openState} setOpenState={setOpenState} />
          </nav>
        </div>
      </div>
      {/* Main content fills the page */}
      <main className="min-h-screen w-full flex flex-col overflow-x-hidden" style={{ marginLeft: SIDEBAR_COLLAPSED_WIDTH }}>
        <div className="flex flex-col flex-1 w-full h-full p-0 overflow-x-hidden">
          <div className="p-4">
            <Link to="/">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transition">
                ← Back to Dashboard
              </button>
            </Link>
          </div>
          <div className="markdown-body px-8 pb-16 pt-2 flex-1 w-full h-full" style={{ minHeight: 0, background: '#fff', color: '#222', maxWidth: '100vw', overflowX: 'hidden' }}>
            <h1>{title}</h1>
            {markdown ? (
              <ReactMarkdown
                children={markdown}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  img: (props) => (
                    <img {...props} style={{ maxWidth: "100%", borderRadius: 8 }} alt={props.alt} />
                  ),
                }}
              />
            ) : (
              <p>No documentation found for this article.</p>
            )}
          </div>
        </div>
      </main>
      {/* Force light mode for documentation */}
      <style>{`
        .force-light, .force-light .markdown-body, .force-light .markdown-body * {
          background: #fff !important;
          color: #222 !important;
          --tw-bg-opacity: 1 !important;
        }
        .force-light .border-gray-200 { border-color: #e5e7eb !important; }
        .force-light .bg-white { background: #fff !important; }
      `}</style>
    </div>
  );
};

export default DocsPage; 