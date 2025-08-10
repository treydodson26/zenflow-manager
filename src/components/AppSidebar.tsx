import { NavLink, useLocation } from "react-router-dom";
import { Leaf, LayoutDashboard, Users, Megaphone, GraduationCap, ListTree, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Marketing Hub", url: "/marketing", icon: Megaphone },
  { title: "Instructor Hub", url: "/instructors", icon: GraduationCap },
  { title: "Segments", url: "/segments", icon: ListTree },
  { title: "Lead Management", url: "/leads", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-foreground font-medium" : "hover:bg-sidebar-accent/60";

  return (
    <Sidebar collapsible="icon">
      <div className="h-14 flex items-center px-3 gap-2 border-b">
        <Leaf className="h-5 w-5 text-sidebar-ring" />
        {!collapsed && (
          <div className="font-semibold tracking-wide">TALO YOGA</div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-3 space-y-2">
            <div className="text-xs uppercase text-muted-foreground">Upcoming Classes</div>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Vinyasa</span><span className="text-muted-foreground">6:00 PM</span></li>
              <li className="flex justify-between"><span>Restorative</span><span className="text-muted-foreground">7:30 PM</span></li>
              <li className="flex justify-between"><span>Hatha</span><span className="text-muted-foreground">9:00 AM</span></li>
            </ul>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
