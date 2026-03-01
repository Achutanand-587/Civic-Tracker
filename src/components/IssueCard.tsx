import { Issue, CATEGORY_CONFIG, STATUS_CONFIG } from '@/types/issue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ThumbsUp, MapPin, Clock, User } from 'lucide-react';
import { useIssues } from '@/contexts/IssueContext';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
  compact?: boolean;
}

const IssueCard = ({ issue, onClick, compact = false }: IssueCardProps) => {
  const { upvoteIssue } = useIssues();
  const categoryConfig = CATEGORY_CONFIG[issue.category];
  const statusConfig = STATUS_CONFIG[issue.status];

  const { toast } = useToast();

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await upvoteIssue(issue.id);
      toast({ title: 'Upvoted!', description: 'Thanks for your support.' });
    } catch (error: any) {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="cursor-pointer"
      >
        <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{categoryConfig.icon}</span>
                  <Badge variant={issue.status as 'reported' | 'in-progress' | 'resolved'} className="text-[10px]">
                    {statusConfig.label}
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm text-foreground truncate">{issue.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {issue.location.address?.split(',')[0] || 'Location'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpvote}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary shrink-0"
              >
                <ThumbsUp className="h-3 w-3" />
                <span className="text-xs font-semibold">{issue.upvotes}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden bg-gradient-card border-border/50 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300">
        {issue.imageUrl && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={issue.imageUrl}
              alt={issue.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant={issue.category as 'pothole' | 'garbage' | 'streetlight' | 'water' | 'other'}>
                {categoryConfig.icon} {categoryConfig.label}
              </Badge>
            </div>
            <div className="absolute top-3 right-3">
              <Badge variant={issue.status as 'reported' | 'in-progress' | 'resolved'}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        )}

        <CardHeader className={issue.imageUrl ? 'pt-4' : ''}>
          {!issue.imageUrl && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={issue.category as 'pothole' | 'garbage' | 'streetlight' | 'water' | 'other'}>
                {categoryConfig.icon} {categoryConfig.label}
              </Badge>
              <Badge variant={issue.status as 'reported' | 'in-progress' | 'resolved'}>
                {statusConfig.label}
              </Badge>
            </div>
          )}
          <h3 className="font-display font-bold text-lg text-foreground line-clamp-2">{issue.title}</h3>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{issue.description}</p>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{issue.location.address || 'Location not specified'}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{issue.reportedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDistanceToNow(issue.reportedAt, { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUpvote}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary"
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="font-semibold">{issue.upvotes} upvotes</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default IssueCard;
