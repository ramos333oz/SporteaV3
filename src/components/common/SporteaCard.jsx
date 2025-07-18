import * as React from "react"
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"
import { Calendar, MapPin, Users, Clock } from "lucide-react"

// Mural-inspired card variants
const sporteaCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-white border-gray-200 shadow-card",
        elevated: "bg-white border-gray-200 shadow-lg hover:shadow-xl",
        match: "bg-white border-gray-200 shadow-card hover:shadow-hover hover:border-brand-primary/20 cursor-pointer hover:-translate-y-1",
        sport: "bg-white border-gray-200 shadow-card hover:shadow-hover cursor-pointer hover:border-brand-primary/30",
        profile: "bg-white border-gray-200 shadow-card",
        interactive: "bg-white border-gray-200 shadow-card hover:shadow-hover cursor-pointer hover:border-brand-primary/20",
        featured: "border-brand-primary border-2 shadow-lg bg-white",
        subtle: "border-gray-100 shadow-sm bg-white",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Base Sportea Card with Mural-inspired styling
function SporteaCard({ className, variant = "default", ...props }) {
  return (
    <Card
      className={cn(sporteaCardVariants({ variant, className }))}
      {...props}
    />
  )
}

// User Card Component
function UserCard({ 
  user, 
  actions, 
  className,
  showStatus = true,
  ...props 
}) {
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || '??'
  }

  return (
    <SporteaCard className={cn("", className)} {...props}>
      <CardContent className="flex items-center space-x-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user?.profilePicture} alt={user?.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base truncate">{user?.name}</CardTitle>
          <CardDescription className="text-sm">
            {user?.faculty && `${user.faculty} • `}
            {user?.skillLevel && `${user.skillLevel} Level`}
          </CardDescription>
          {showStatus && user?.status && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {user.status}
            </Badge>
          )}
        </div>
        {actions && (
          <div className="flex space-x-2">
            {actions}
          </div>
        )}
      </CardContent>
    </SporteaCard>
  )
}

// Match Card Component
function MatchCard({ 
  match, 
  actions, 
  className,
  showProgress = true,
  ...props 
}) {
  const playerPercentage = match?.maxPlayers 
    ? (match.currentPlayers / match.maxPlayers) * 100 
    : 0

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'TBD'
    const date = new Date(dateTime)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <SporteaCard className={cn("", className)} {...props}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant={match?.isPublic ? "default" : "outline"}>
            {match?.sport || 'Sport'}
          </Badge>
          <Badge variant="secondary">
            {match?.isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        <CardTitle className="text-lg">{match?.title || 'Match Title'}</CardTitle>
        {match?.description && (
          <CardDescription>{match.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {formatDateTime(match?.dateTime)}
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            {match?.location || 'Location TBD'}
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            {match?.currentPlayers || 0}/{match?.maxPlayers || 0} players
          </div>
          {match?.duration && (
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              {match.duration}
            </div>
          )}
        </div>
        
        {showProgress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Players</span>
              <span>{match?.currentPlayers || 0}/{match?.maxPlayers || 0}</span>
            </div>
            <Progress value={playerPercentage} className="h-2" />
          </div>
        )}
      </CardContent>
      
      {actions && (
        <CardFooter className="pt-3">
          {actions}
        </CardFooter>
      )}
    </SporteaCard>
  )
}

// Info Card Component
function InfoCard({ 
  title, 
  description, 
  icon: Icon, 
  actions, 
  className,
  variant = "default",
  ...props 
}) {
  return (
    <SporteaCard variant={variant} className={cn("", className)} {...props}>
      <CardContent className="p-6">
        {Icon && (
          <div className="flex items-center mb-3">
            <Icon className="h-5 w-5 text-primary mr-2" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        )}
        {!Icon && title && (
          <CardTitle className="text-lg mb-3">{title}</CardTitle>
        )}
        {description && (
          <CardDescription className="text-sm leading-relaxed">
            {description}
          </CardDescription>
        )}
        {actions && (
          <div className="mt-4">
            {actions}
          </div>
        )}
      </CardContent>
    </SporteaCard>
  )
}

// Sport Card Component (for displaying sports with stats)
function SportCard({ 
  sport, 
  stats, 
  className,
  ...props 
}) {
  return (
    <SporteaCard 
      variant="elevated" 
      className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)} 
      {...props}
    >
      <CardContent className="p-6 text-center">
        {sport?.icon && (
          <div className="text-4xl mb-3">{sport.icon}</div>
        )}
        <CardTitle className="text-xl mb-2">{sport?.name}</CardTitle>
        {stats && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {stats.activeMatches && (
              <div>{stats.activeMatches} active matches</div>
            )}
            {stats.totalPlayers && (
              <div>{stats.totalPlayers} players</div>
            )}
            {stats.weeklyMatches && (
              <div>{stats.weeklyMatches} matches this week</div>
            )}
          </div>
        )}
      </CardContent>
    </SporteaCard>
  )
}

export {
  SporteaCard,
  UserCard,
  MatchCard,
  InfoCard,
  SportCard
}
