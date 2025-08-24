
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router-dom"
import {
  Home,
  BarChart3,
  Users,
  UserPlus,
  GraduationCap,
  MessageCircle,
  Zap,
  CheckSquare,
  Megaphone,
  UserCheck,
  Upload,
  Settings,
  ImageIcon,
  GitBranch,
} from "lucide-react"

const navigation = [
  {
    title: "Overview",
    items: [
      { title: "Home", url: "/", icon: Home },
      { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    ]
  },
  {
    title: "Customer Management", 
    items: [
      { title: "All Customers", url: "/customers", icon: Users },
      { title: "Client Pipeline", url: "/client-pipeline", icon: GitBranch },
      { title: "Leads", url: "/leads", icon: UserPlus },
      { title: "Students", url: "/students", icon: GraduationCap },
      { title: "Intro Offers", url: "/intro-offers", icon: UserCheck },
    ]
  },
  {
    title: "Communication",
    items: [
      { title: "Communication Hub", url: "/communication", icon: MessageCircle },
      { title: "Message Sequences", url: "/sequences", icon: Zap },
      { title: "Sequence Builder", url: "/sequence-builder", icon: Zap },
      { title: "Message Approval", url: "/message-approval", icon: CheckSquare },
    ]
  },
  {
    title: "Marketing & Operations", 
    items: [
      { title: "Marketing Hub", url: "/marketing", icon: Megaphone },
      { title: "Instructor Hub", url: "/instructors", icon: UserCheck },
      { title: "Image Studio", url: "/image-studio", icon: ImageIcon },
    ]
  },
  {
    title: "Data & Settings",
    items: [
      { title: "Import Data", url: "/import", icon: Upload },
      { title: "Settings", url: "/settings", icon: Settings },
    ]
  }
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-semibold">Talo Yoga</h2>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground">
          Phase 1: Database Foundation ✅
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
