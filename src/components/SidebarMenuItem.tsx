import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarMenuItemProps {
  icon: LucideIcon
  label: string
  value: string
  active: boolean
  onClick: () => void
  badge?: number
  isNew?: boolean
  isAI?: boolean
}

export default function SidebarMenuItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  badge,
  isNew = false,
  isAI = false
}: SidebarMenuItemProps) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start h-10 px-3",
        active && "bg-primary/10 text-primary border-r-2 border-r-primary"
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 mr-3" />
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      
      <div className="flex items-center gap-1">
        {badge && badge > 0 && (
          <Badge variant="outline" className="h-5 w-5 p-0 text-[10px] flex items-center justify-center">
            {badge}
          </Badge>
        )}
        
        {isNew && (
          <Badge className="h-4 px-1.5 text-[9px] bg-gradient-to-r from-primary to-accent text-white">
            NEW
          </Badge>
        )}
        
        {isAI && (
          <Badge className="h-4 px-1.5 text-[9px] bg-gradient-to-r from-primary to-accent text-white">
            AI
          </Badge>
        )}
      </div>
    </Button>
  )
}