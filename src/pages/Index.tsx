import { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useIssues } from '@/contexts/IssueContext';
import { useAuth } from '@/contexts/AuthContext';
import { Issue, IssueStatus, IssueCategory } from '@/types/issue';
import Header from '@/components/Header';
import IssueCard from '@/components/IssueCard';
import StatsBar from '@/components/StatsBar';
import FilterBar from '@/components/FilterBar';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';

const IssueMap = lazy(() => import('@/components/IssueMap'));

const MapLoading = () => (
  <div className="flex items-center justify-center h-[500px] bg-secondary/50 rounded-lg">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Index = () => {
  const { issues } = useIssues();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'all'>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const statusMatch = selectedStatus === 'all' || issue.status === selectedStatus;
      const categoryMatch = selectedCategory === 'all' || issue.category === selectedCategory;
      return statusMatch && categoryMatch;
    });
  }, [issues, selectedStatus, selectedCategory]);

  const mapCenter: [number, number] = selectedIssue
    ? [selectedIssue.location.lat, selectedIssue.location.lng]
    : [40.7128, -74.006];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <main className="container py-8">
        {/* Hero Section */}
        <section className="text-center mb-10 animate-fade-in">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Track Local Issues,{' '}
            <span className="text-gradient">Build Better Communities</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Report potholes, broken streetlights, garbage, and other civic issues. Together, we can make our neighborhoods safer and cleaner.
          </p>
          {user?.email !== 'admin@civic.com' && (
            <Link to="/report">
              <Button variant="hero" size="xl" className="gap-2">
                <Plus className="h-5 w-5" />
                Report an Issue
              </Button>
            </Link>
          )}
        </section>

        {/* Stats */}
        <section className="mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <StatsBar />
        </section>

        {/* Filters */}
        <section className="mb-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <FilterBar
            selectedStatus={selectedStatus}
            selectedCategory={selectedCategory}
            onStatusChange={setSelectedStatus}
            onCategoryChange={setSelectedCategory}
          />
        </section>

        {/* Map & Issues Grid */}
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
          {/* Map */}
          <div className="lg:col-span-2">
            <Suspense fallback={<MapLoading />}>
              <IssueMap
                issues={filteredIssues}
                height="500px"
                center={mapCenter}
                zoom={selectedIssue ? 15 : 12}
                selectedIssueId={selectedIssue?.id}
                onIssueSelect={setSelectedIssue}
              />
            </Suspense>
          </div>

          {/* Recent Issues */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">Recent Issues</h2>
              <Link to="/issues">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2">
              {filteredIssues.slice(0, 6).map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  compact
                  onClick={() => setSelectedIssue(issue)}
                />
              ))}
              {filteredIssues.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No issues found matching your filters.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-16">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>© 2024 CivicTrack. Building better communities together.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
