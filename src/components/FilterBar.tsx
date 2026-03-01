import { IssueCategory, IssueStatus, CATEGORY_CONFIG, STATUS_CONFIG } from '@/types/issue';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterBarProps {
  selectedStatus: IssueStatus | 'all';
  selectedCategory: IssueCategory | 'all';
  onStatusChange: (status: IssueStatus | 'all') => void;
  onCategoryChange: (category: IssueCategory | 'all') => void;
}

const FilterBar = ({
  selectedStatus,
  selectedCategory,
  onStatusChange,
  onCategoryChange,
}: FilterBarProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          <Button
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange('all')}
          >
            All
          </Button>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedStatus === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStatusChange(key as IssueStatus)}
              className="hidden sm:inline-flex"
            >
              {config.label}
            </Button>
          ))}
        </div>
        <Select
          value={selectedStatus}
          onValueChange={(v) => onStatusChange(v as IssueStatus | 'all')}
        >
          <SelectTrigger className="w-32 sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[3000]">
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Category:</span>
        <Select
          value={selectedCategory}
          onValueChange={(v) => onCategoryChange(v as IssueCategory | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[3000]">
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterBar;
