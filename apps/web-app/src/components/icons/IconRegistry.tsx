import React from 'react';
import {
  // Task Management Icons
  Check,
  Plus,
  Edit,
  Trash2,
  Calendar,
  List,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Flag,
  
  // Navigation Icons
  Menu,
  Home,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  
  // Status Icons
  Pending,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  
  // Action Icons
  Save,
  X,
  Upload,
  Download,
  Share,
  Copy,
  
  // Social & Communication Icons
  Mail,
  Bell,
  Users,
  UserPlus,
  MessageCircle,
  Share2,
  
  // File & Data Icons
  FileText,
  File,
  Folder,
  Image,
  Paperclip,
  
  // UI Elements
  Search,
  Filter,
  MoreVertical,
  MoreHorizontal,
  Eye,
  EyeOff,
  
  // Team & Collaboration
  Crown,
  Shield,
  Globe,
  Lock,
  Unlock,
  
  // Date & Time
  CalendarDays,
  ClockIcon,
  Timer,
  
  // Productivity
  Target,
  TrendingUp,
  BarChart,
  PieChart,
  
  // System
  Refresh,
  Power,
  Wifi,
  WifiOff,
  
  type LucideIcon
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

// Icon Registry - 앱에서 사용하는 모든 아이콘을 중앙 관리
export const iconRegistry = {
  // Task Management
  task: {
    check: Check,
    add: Plus,
    edit: Edit,
    delete: Trash2,
    calendar: Calendar,
    list: List,
    completed: CheckCircle,
    pending: Circle,
    inProgress: Clock,
    overdue: AlertCircle,
    priority: Flag,
  },
  
  // Navigation
  navigation: {
    menu: Menu,
    home: Home,
    settings: Settings,
    profile: User,
    logout: LogOut,
    back: ChevronLeft,
    forward: ChevronRight,
    down: ChevronDown,
    up: ChevronUp,
  },
  
  // Status
  status: {
    pending: Pending,
    inProgress: PlayCircle,
    done: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  },
  
  // Actions
  actions: {
    save: Save,
    cancel: X,
    upload: Upload,
    download: Download,
    share: Share,
    copy: Copy,
  },
  
  // Social
  social: {
    email: Mail,
    notification: Bell,
    team: Users,
    invite: UserPlus,
    message: MessageCircle,
    share: Share2,
  },
  
  // Files
  files: {
    document: FileText,
    file: File,
    folder: Folder,
    image: Image,
    attachment: Paperclip,
  },
  
  // UI
  ui: {
    search: Search,
    filter: Filter,
    moreVertical: MoreVertical,
    moreHorizontal: MoreHorizontal,
    show: Eye,
    hide: EyeOff,
  },
  
  // Team
  team: {
    owner: Crown,
    admin: Shield,
    public: Globe,
    private: Lock,
    unlock: Unlock,
  },
  
  // Time
  time: {
    calendar: CalendarDays,
    clock: ClockIcon,
    timer: Timer,
  },
  
  // Analytics
  analytics: {
    target: Target,
    trending: TrendingUp,
    barChart: BarChart,
    pieChart: PieChart,
  },
  
  // System
  system: {
    refresh: Refresh,
    power: Power,
    online: Wifi,
    offline: WifiOff,
  },
} as const;

// Icon component wrapper
export const Icon: React.FC<{
  name: keyof typeof iconRegistry | string;
  category?: keyof typeof iconRegistry;
  size?: number;
  className?: string;
  color?: string;
}> = ({ name, category, size = 24, className = '', color }) => {
  let IconComponent: LucideIcon;
  
  if (category && iconRegistry[category]) {
    IconComponent = (iconRegistry[category] as any)[name];
  } else {
    // Try to find icon in any category
    for (const cat of Object.values(iconRegistry)) {
      if ((cat as any)[name]) {
        IconComponent = (cat as any)[name];
        break;
      }
    }
  }
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in registry`);
    return <div className={`inline-block w-${size/4} h-${size/4} bg-gray-300 ${className}`} />;
  }
  
  return (
    <IconComponent
      size={size}
      className={className}
      color={color}
    />
  );
};

// Predefined icon combinations for common use cases
export const TaskStatusIcon: React.FC<{ status: 'pending' | 'in_progress' | 'completed' | 'overdue'; className?: string }> = ({ status, className }) => {
  const iconMap = {
    pending: iconRegistry.task.pending,
    in_progress: iconRegistry.task.inProgress,
    completed: iconRegistry.task.completed,
    overdue: iconRegistry.task.overdue,
  };
  
  const colorMap = {
    pending: 'text-gray-400',
    in_progress: 'text-blue-500',
    completed: 'text-green-500',
    overdue: 'text-red-500',
  };
  
  const IconComponent = iconMap[status];
  const colorClass = colorMap[status];
  
  return <IconComponent className={`${colorClass} ${className || ''}`} size={20} />;
};

export const PriorityIcon: React.FC<{ priority: 'low' | 'medium' | 'high'; className?: string }> = ({ priority, className }) => {
  const colorMap = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };
  
  const colorClass = colorMap[priority];
  
  return <Flag className={`${colorClass} ${className || ''}`} size={16} />;
};

export default iconRegistry;