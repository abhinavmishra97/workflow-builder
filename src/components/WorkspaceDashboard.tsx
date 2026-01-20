"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  FileText, 
  Users, 
  Grid3x3, 
  List,
  Search,
  Workflow,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Edit,
  Menu,
  X,
  Trash2,
  Linkedin
} from "lucide-react";
import Image from "next/image";
import { useClerk } from "@clerk/nextjs";

// Mock data for workflow library (templates)
const mockWorkflowLibrary = [
  { id: "1", name: "Weavy Welcome", thumbnail: "/imgs/headphones.png" },
  { id: "2", name: "Weavy Iterators", thumbnail: "/imgs/weavy-Flux%20Kontext%20Multi%20Image-2026-01-17%20at%2003.12.42.png" },
  { id: "3", name: "Multiple Image Models", thumbnail: "/imgs/weavy-Flux%20Pro%201.1%20Ultra-2026-01-17%20at%2002.59.44.png" },
  { id: "4", name: "Editing Images", thumbnail: "/imgs/weavy-Gemini%202.5%20Flash%20%28Nano%20Banana%29-2026-01-17%20at%2003.15.39.jpg" },
  { id: "5", name: "Compositor Node", thumbnail: "/imgs/weavy-Gemini%202.5%20Flash%20%28Nano%20Banana%29-2026-01-17%20at%2003.18.00.jpg" },
  { id: "6", name: "Image to Video", thumbnail: "/imgs/weavy-Gemini%203%20%28Nano%20Banana%20Pro%29-2026-01-17%20at%2003.11.25.png" },
  { id: "7", name: "Camera Angle Ideation", thumbnail: "/imgs/weavy-Google%20Imagen%204-2026-01-17%20at%2003.17.41.png" },
  { id: "8", name: "Illustration Machine", thumbnail: "/imgs/weavy-Topaz%20Upscale-2026-01-17%20at%2003.18.45.jpg" },
  { id: "9", name: "Change Face", thumbnail: "/imgs/headphones.png" },
  { id: "10", name: "Image Describer", thumbnail: "/imgs/weavy-Flux%20Kontext%20Multi%20Image-2026-01-17%20at%2003.12.42.png" },
  { id: "11", name: "Image to 3D", thumbnail: "/imgs/weavy-Flux%20Pro%201.1%20Ultra-2026-01-17%20at%2002.59.44.png" },
  { id: "12", name: "Web Scraper", thumbnail: "/imgs/weavy-Gemini%202.5%20Flash%20%28Nano%20Banana%29-2026-01-17%20at%2003.15.39.jpg" },
  { id: "13", name: "Audio Generator", thumbnail: "/imgs/weavy-Gemini%202.5%20Flash%20%28Nano%20Banana%29-2026-01-17%20at%2003.18.00.jpg" },
  { id: "14", name: "Style Transfer", thumbnail: "/imgs/weavy-Gemini%203%20%28Nano%20Banana%20Pro%29-2026-01-17%20at%2003.11.25.png" },
  { id: "15", name: "Text to Speech", thumbnail: "/imgs/weavy-Google%20Imagen%204-2026-01-17%20at%2003.17.41.png" },
];

interface WorkflowFile {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  runs?: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
}

interface WorkspaceDashboardProps {
  userName?: string;
}

// Helper function to format dates
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export default function WorkspaceDashboard({ userName = "Abhinav Mishra" }: WorkspaceDashboardProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [scrollPosition, setScrollPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [userFiles, setUserFiles] = useState<WorkflowFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; fileId: string | null; fileName: string }>({ isOpen: false, fileId: null, fileName: "" });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch workflows from database
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setUserFiles(data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (fileId: string) => {
    router.push(`/workflow/${fileId}`);
  };

  const handleCreateNewFile = async () => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Workflow' }),
      });

      if (response.ok) {
        const newWorkflow = await response.json();
        router.push(`/workflow/${newWorkflow.id}`);
      } else {
        console.error('Failed to create workflow:', response.status, response.statusText);
        let errorMsg = 'Unknown error';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            // response was not json
        }
        alert(`Failed to create workflow: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const { signOut } = useClerk();

  const handleLogout = async () => {
    console.log("Logging out...");
    await signOut();
    router.push("/");
  };

  const handleDeleteClick = (e: React.MouseEvent, file: WorkflowFile) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, fileId: file.id, fileName: file.name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.fileId) return;

    try {
      const response = await fetch(`/api/workflows/${deleteConfirmation.fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUserFiles((prev) => prev.filter((f) => f.id !== deleteConfirmation.fileId));
        setDeleteConfirmation({ isOpen: false, fileId: null, fileName: "" });
      } else {
        console.error("Failed to delete file");
        alert("Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file");
    }
  };

  // Filter files based on search query
  const filteredFiles = userFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex" style={{ backgroundColor: "var(--bg)" }}>
      {/* Left Sidebar */}
      <div
        className="flex flex-col border-r transition-all duration-300"
        style={{
          width: sidebarCollapsed ? "60px" : "200px",
          backgroundColor: "var(--sidebar)",
          borderColor: "var(--border)",
        }}
      >
        {/* Toggle Button */}
        <div className="p-3 flex justify-end">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{ backgroundColor: "var(--hover)" }}
          >
            {sidebarCollapsed ? (
              <Menu className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            ) : (
              <X className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            )}
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {/* User Profile with Dropdown */}
            <div className="p-5 relative">
              <button
                onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
                className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: "var(--purple-glow)",
                    color: "var(--text-primary)",
              }}
            >
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {userName.split(" ")[0]}
              </p>
              <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            </div>
          </button>

          {/* Logout Dropdown */}
          {showLogoutDropdown && (
            <div
              className="absolute top-full left-4 right-4 mt-1 rounded-lg shadow-lg z-50"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-sm flex items-center gap-2 rounded-lg transition-colors"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Create New File Button */}
        <div className="px-4 py-3">
          <button
            onClick={handleCreateNewFile}
            className="w-full px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: "#E5FF6B",
              color: "#000",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Plus className="w-4 h-4" />
            Create New File
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          <div className="mb-4">
            <button
              className="w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: "var(--hover)",
                color: "var(--text-primary)",
              }}
            >
              <FileText className="w-4 h-4" />
              My Files
            </button>
          </div>

          <div className="mb-4">
            <button
              className="w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              style={{
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Users className="w-4 h-4" />
              Shared with me
            </button>
          </div>

          <div className="mb-2">
            <p
              className="px-3 py-2 text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Apps
            </p>
          </div>
        </nav>

        {/* LinkedIn at bottom */}
        <div className="p-5">
          <a
            href="https://www.linkedin.com/in/abhinavm97/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Linkedin className="w-5 h-5" />
            LinkedIn
          </a>
        </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-8 py-6 flex items-center justify-between"
        >
          <h1
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {userName}'s Workspace
          </h1>
          <button
            onClick={handleCreateNewFile}
            className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"
            style={{
              backgroundColor: "#E5FF6B",
              color: "#000",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Plus className="w-4 h-4" />
            Create New File
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Workflow Library */}
          <div className="px-8 py-6">
            <div
              className="rounded-xl p-6 relative"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Tabs */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  className="px-3 py-1.5 text-sm font-medium rounded-md"
                  style={{
                    backgroundColor: "var(--hover)",
                    color: "var(--text-primary)",
                  }}
                >
                  Workflow library
                </button>
                <button
                  className="px-3 py-1.5 text-sm font-medium rounded-md"
                  style={{
                    color: "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  Tutorials
                </button>
              </div>

              {/* Left Arrow */}
              <button
                onClick={handleScrollLeft}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
                }}
              >
                <ChevronLeft className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
              </button>

              {/* Right Arrow */}
              <button
                onClick={handleScrollRight}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
                }}
              >
                <ChevronRight className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
              </button>

              {/* Scrollable Cards Container */}
              <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {mockWorkflowLibrary.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="workflow-card flex-shrink-0 rounded-lg overflow-hidden cursor-pointer relative group"
                    style={{
                      width: "140px",
                      height: "120px",
                    }}
                    onClick={() => handleFileClick(workflow.id)}
                  >
                    {/* Image Background */}
                    <div
                      className="absolute inset-0 transition-all duration-300"
                      style={{
                        backgroundImage: `url(${workflow.thumbnail})`,
                        backgroundColor: "var(--sidebar)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* Fallback icon if image doesn't load */}
                      {workflow.thumbnail.includes("placeholder") && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Workflow className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                    </div>

                    {/* Gradient Overlay for text readability */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
                      }}
                    />

                    {/* Text Overlay - Bottom Left */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p
                        className="text-xs font-medium leading-tight"
                        style={{
                          color: "#FFFFFF",
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        }}
                      >
                        {workflow.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Files */}
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                My files
              </h2>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-32"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>

                {/* View Toggle */}
                <div
                  className="flex items-center rounded-lg p-1"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => setViewMode("list")}
                    className="p-1.5 rounded transition-colors"
                    style={{
                      backgroundColor: viewMode === "list" ? "var(--hover)" : "transparent",
                      color: viewMode === "list" ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className="p-1.5 rounded transition-colors"
                    style={{
                      backgroundColor: viewMode === "grid" ? "var(--hover)" : "transparent",
                      color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-lg overflow-visible cursor-pointer transition-transform hover:scale-105 relative group"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                    onClick={() => handleFileClick(file.id)}
                  >
                    <button
                      onClick={(e) => handleDeleteClick(e, file)}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                      title="Delete file"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                    <div
                      className="w-full h-[180px] flex items-center justify-center"
                      style={{ backgroundColor: "var(--hover)" }}
                    >
                      <Workflow className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="p-3">
                      <p
                        className="text-sm font-medium mb-1 truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {file.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Last edited {formatTimeAgo(file.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div>
                {/* Table Header */}
                <div
                  className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium border-b"
                  style={{
                    color: "var(--text-muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Files</div>
                  <div className="col-span-3">Last modified ↓</div>
                  <div className="col-span-1">Created at</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Table Rows */}
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer transition-colors border-b"
                    style={{
                      borderColor: "var(--border)",
                    }}
                    onClick={() => handleFileClick(file.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "var(--hover)" }}
                      >
                        <Workflow className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {file.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      -
                    </div>
                    <div className="col-span-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {formatTimeAgo(file.updatedAt)}
                    </div>
                    <div className="col-span-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-span-1 flex justify-end">
                       <button
                         onClick={(e) => handleDeleteClick(e, file)}
                         className="p-1.5 transition-colors"
                         style={{ color: "var(--text-muted)" }}
                         onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                         onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                         title="Delete"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="rounded-lg shadow-xl p-6 w-full max-w-md"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Delete File?
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Are you sure you want to delete <span className="font-semibold text-white">{deleteConfirmation.fileName}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, fileId: null, fileName: "" })}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--hover)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-600"
                style={{
                  backgroundColor: "var(--danger)",
                  color: "white",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
